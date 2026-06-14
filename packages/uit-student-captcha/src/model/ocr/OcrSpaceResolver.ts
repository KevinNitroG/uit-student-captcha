// OCR.space resolver (provider id: "ocrspace"). Highly configurable; URL+POST by
// default (the captcha PNG is public). OCR.space returns HTTP 200 even on most logical
// failures — the truth is in OCRExitCode + IsErroredOnProcessing + ErrorMessage. See
// contracts/ocrspace.contract.md / research.md.

import type { OcrSpaceEntry } from "uit-student-captcha-config-core";
import type { HttpClient } from "../http/HttpClient.ts";
import { blobToUint8Array, buildMultipartBody, encodeUrlForm } from "../http/multipart.ts";
import { OcrError } from "./errors.ts";
import { normalizeCaptchaText } from "./normalize.ts";
import type { OcrInput, OcrResolver, OcrResult } from "./OcrResolver.ts";

interface OcrSpaceParsedResult {
  ParsedText?: string;
  FileParseExitCode?: number;
  ErrorMessage?: string | null;
}

interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceParsedResult[];
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[] | null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read image bytes"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image bytes"));
    reader.readAsDataURL(blob);
  });
}

function mapErrorMessage(message: string, raw: unknown): OcrError {
  const text = message.toLowerCase();
  const meta = { provider: "ocrspace", raw };
  if (text.includes("invalid") || text.includes("api key") || text.includes("apikey")) {
    return new OcrError("AUTH", message || "OCR.space rejected the API key", meta);
  }
  if (text.includes("size") || text.includes("large")) {
    return new OcrError("PAYLOAD_TOO_LARGE", message, meta);
  }
  if (text.includes("rate") || text.includes("limit") || text.includes("throttle")) {
    return new OcrError("RATE_LIMIT", message, meta);
  }
  return new OcrError("PROVIDER_ERROR", message || "OCR.space processing error", meta);
}

export class OcrSpaceResolver implements OcrResolver {
  readonly id = "ocrspace";
  private readonly endpoint: string;

  constructor(
    private readonly entry: OcrSpaceEntry,
    private readonly http: HttpClient,
    private readonly timeoutMs: number,
  ) {
    if (!entry.apiKey) {
      throw new OcrError("MISSING_CONFIG", "OCR.space requires an API key", { provider: this.id });
    }
    this.endpoint =
      entry.endpoint ??
      (entry.httpMethod === "GET"
        ? `${entry.scheme}://api.ocr.space/parse/imageurl`
        : `${entry.scheme}://api.ocr.space/parse/image`);
  }

  async resolve(input: OcrInput): Promise<OcrResult> {
    const res =
      this.entry.httpMethod === "GET"
        ? await this.requestGet(input)
        : await this.requestPost(input);

    if (res.status === 403) throw new OcrError("AUTH", "OCR.space rejected the key", { provider: this.id, httpStatus: 403 });
    if (res.status === 429) throw new OcrError("RATE_LIMIT", "OCR.space rate limit hit", { provider: this.id, httpStatus: 429 });
    if (res.status >= 500) throw new OcrError("PROVIDER_ERROR", `OCR.space server error (${res.status})`, { provider: this.id, httpStatus: res.status });

    const data = res.json() as OcrSpaceResponse;
    if (data.IsErroredOnProcessing) {
      const msg = Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage.join(" ")
        : data.ErrorMessage ?? "";
      throw mapErrorMessage(msg, data);
    }
    if (data.OCRExitCode === 3 || data.OCRExitCode === 4) {
      throw new OcrError("PROVIDER_ERROR", "OCR.space failed to parse the image", { provider: this.id, raw: data });
    }

    const rawText = data.ParsedResults?.[0]?.ParsedText ?? "";
    const text = normalizeCaptchaText(rawText);
    if (!text) {
      throw new OcrError("EMPTY_RESULT", "OCR.space returned no readable text", { provider: this.id, raw: data });
    }
    return { provider: this.id, rawText, text, confidence: null };
  }

  private async requestPost(input: OcrInput) {
    const fields: Record<string, string> = {
      apikey: this.entry.apiKey,
      OCREngine: String(this.entry.ocrEngine),
      language: this.entry.language,
    };
    this.appendFlags(fields);

    if (this.entry.inputMode === "file") {
      if (!input.imageBytes) throw new OcrError("BAD_REQUEST", "OCR.space file mode needs image bytes", { provider: this.id });
      const bytes = await blobToUint8Array(input.imageBytes);
      const { body, contentType } = buildMultipartBody(
        fields,
        { name: "file", filename: "captcha.png", contentType: "image/png", bytes },
      );
      return this.http.request({
        method: "POST",
        url: this.endpoint,
        headers: { "Content-Type": contentType },
        body,
        timeoutMs: this.timeoutMs,
        responseType: "json",
      });
    }

    // url / base64 modes → urlencoded string body
    if (this.entry.inputMode === "url") {
      if (!input.imageUrl) throw new OcrError("BAD_REQUEST", "OCR.space url mode needs an image URL", { provider: this.id });
      fields["url"] = input.imageUrl;
    } else {
      // base64 mode
      if (!input.imageBytes) throw new OcrError("BAD_REQUEST", "OCR.space base64 mode needs image bytes", { provider: this.id });
      fields["base64Image"] = await blobToDataUrl(input.imageBytes);
    }

    return this.http.request({
      method: "POST",
      url: this.endpoint,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encodeUrlForm(fields),
      timeoutMs: this.timeoutMs,
      responseType: "json",
    });
  }

  private async requestGet(input: OcrInput) {
    if (!input.imageUrl) throw new OcrError("BAD_REQUEST", "OCR.space GET mode needs an image URL", { provider: this.id });
    const params = new URLSearchParams({
      apikey: this.entry.apiKey,
      url: input.imageUrl,
      language: this.entry.language,
      OCREngine: String(this.entry.ocrEngine),
    });
    if (this.entry.isOverlayRequired) params.set("isOverlayRequired", "true");
    return this.http.request({
      method: "GET",
      url: `${this.endpoint}?${params.toString()}`,
      timeoutMs: this.timeoutMs,
      responseType: "json",
    });
  }

  private appendFlags(fields: Record<string, string>): void {
    if (this.entry.isOverlayRequired) fields["isOverlayRequired"] = "true";
    if (this.entry.detectOrientation) fields["detectOrientation"] = "true";
    if (this.entry.scale) fields["scale"] = "true";
    if (this.entry.isTable) fields["isTable"] = "true";
  }
}
