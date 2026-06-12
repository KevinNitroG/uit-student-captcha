// EasyOCR resolver (provider id: "easyocr"). Two variants share one request shape
// (multipart `file` bytes); the keyed variant adds an X-Access-Key header. EasyOCR
// signals failure via HTTP status. See contracts/easyocr.contract.md / research.md.

import type { EasyOcrEntry } from "uit-student-captcha-config-core";
import type { HttpClient } from "../http/HttpClient.ts";
import { OcrError } from "./errors.ts";
import { normalizeCaptchaText } from "./normalize.ts";
import type { OcrInput, OcrResolver, OcrResult } from "./OcrResolver.ts";

interface EasyOcrWord {
  readonly text: string;
  readonly rate?: number;
}

interface EasyOcrResponse {
  readonly words?: EasyOcrWord[];
  readonly text?: string;
  readonly confidence?: number;
}

function mapStatus(status: number, provider: string, raw: unknown): OcrError {
  const meta = { provider, httpStatus: status, raw };
  if (status === 400) return new OcrError("BAD_REQUEST", "EasyOCR rejected the request", meta);
  if (status === 401 || status === 403) return new OcrError("AUTH", "EasyOCR rejected the access key", meta);
  if (status === 413) return new OcrError("PAYLOAD_TOO_LARGE", "Captcha image too large for EasyOCR", meta);
  if (status === 415) return new OcrError("UNSUPPORTED_MEDIA", "Unsupported image format for EasyOCR", meta);
  if (status === 429) return new OcrError("RATE_LIMIT", "EasyOCR rate limit hit", meta);
  if (status >= 500) return new OcrError("PROVIDER_ERROR", `EasyOCR server error (${status})`, meta);
  return new OcrError("PROVIDER_ERROR", `Unexpected EasyOCR status ${status}`, meta);
}

export class EasyOcrResolver implements OcrResolver {
  readonly id = "easyocr";
  private readonly accessKey: string | undefined;

  constructor(
    private readonly entry: EasyOcrEntry,
    private readonly http: HttpClient,
    private readonly timeoutMs: number,
  ) {
    if (entry.variant === "keyed" && !entry.accessKey) {
      throw new OcrError("MISSING_CONFIG", "EasyOCR keyed variant requires an access key", {
        provider: this.id,
      });
    }
    this.accessKey = entry.accessKey;
  }

  async resolve(input: OcrInput): Promise<OcrResult> {
    if (!input.imageBytes) {
      throw new OcrError("BAD_REQUEST", "EasyOCR requires image bytes", { provider: this.id });
    }

    const form = new FormData();
    form.append("file", input.imageBytes, "captcha.png");
    const headers: Record<string, string> = {};
    if (this.entry.variant === "keyed" && this.accessKey) {
      headers["X-Access-Key"] = this.accessKey;
    }

    const res = await this.http.request({
      method: "POST",
      url: this.entry.endpoint,
      headers,
      body: form,
      timeoutMs: this.timeoutMs,
      responseType: "json",
    });

    if (res.status !== 200) throw mapStatus(res.status, this.id, res.text);

    const data = res.json() as EasyOcrResponse;
    let rawText = "";
    let confidence: number | null = null;
    if (Array.isArray(data.words) && data.words.length > 0) {
      rawText = data.words.map((w) => String(w.text ?? "")).join(" ");
      const rates = data.words
        .map((w) => w.rate)
        .filter((r): r is number => typeof r === "number");
      confidence = rates.length > 0 ? Math.max(...rates) : null;
    } else if (typeof data.text === "string") {
      rawText = data.text;
      confidence = typeof data.confidence === "number" ? data.confidence : null;
    }

    const text = normalizeCaptchaText(rawText);
    if (!text) {
      throw new OcrError("EMPTY_RESULT", "EasyOCR returned no readable text", {
        provider: this.id,
        raw: data,
      });
    }

    return { provider: this.id, rawText, text, confidence };
  }
}
