import { describe, expect, it } from "vitest";
import type { OcrSpaceEntry } from "uit-student-captcha-config-core";
import { OcrError } from "./errors.ts";
import type { OcrInput } from "./OcrResolver.ts";
import { OcrSpaceResolver } from "./OcrSpaceResolver.ts";
import { fakeHttpClient, jsonResponse } from "../../../test/helpers/mocks.ts";

const entry: OcrSpaceEntry = {
  id: "ocrspace-1",
  provider: "ocrspace",
  enabled: true,
  apiKey: "k-123",
  scheme: "https",
  httpMethod: "POST",
  inputMode: "url",
  ocrEngine: 1,
  language: "eng",
};

const input: OcrInput = {
  imageUrl: "https://student.uit.edu.vn/captcha_1.png",
  imageBytes: null,
  mimeType: "image/png",
};

function ok(parsedText: string, exitCode = 1) {
  return jsonResponse(200, {
    OCRExitCode: exitCode,
    IsErroredOnProcessing: false,
    ParsedResults: [{ ParsedText: parsedText, FileParseExitCode: 1 }],
  });
}

describe("OcrSpaceResolver", () => {
  it("maps a POST+url OCRExitCode:1 response to a normalized token", async () => {
    const http = fakeHttpClient(() => ok("AB12C\n"));
    const result = await new OcrSpaceResolver(entry, http, 15000).resolve(input);
    expect(result.text).toBe("AB12C");
    expect(result.provider).toBe("ocrspace");
  });

  it("throws MISSING_CONFIG at construction when apiKey is empty", () => {
    expect(() => new OcrSpaceResolver({ ...entry, apiKey: "" }, fakeHttpClient(() => ok("x")), 15000))
      .toThrowError(expect.objectContaining({ code: "MISSING_CONFIG" }));
  });

  it("maps IsErroredOnProcessing + invalid-key message to AUTH", async () => {
    const http = fakeHttpClient(() =>
      jsonResponse(200, {
        OCRExitCode: 1,
        IsErroredOnProcessing: true,
        ErrorMessage: ["Invalid API key. Please sign up for a free key."],
      }),
    );
    await expect(new OcrSpaceResolver(entry, http, 15000).resolve(input))
      .rejects.toMatchObject({ code: "AUTH" });
  });

  it("maps a whitespace-only ParsedText to EMPTY_RESULT", async () => {
    const http = fakeHttpClient(() => ok(" "));
    const err = await new OcrSpaceResolver(entry, http, 15000)
      .resolve(input)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OcrError);
    expect((err as OcrError).code).toBe("EMPTY_RESULT");
  });

  // --- body shape assertions (no Blob/FormData reaches the transport) ---

  it("url-mode POST sends a urlencoded string body with application/x-www-form-urlencoded", async () => {
    let capturedBody: unknown;
    let capturedHeaders: Record<string, string> | undefined;
    const http = fakeHttpClient((req) => {
      capturedBody = req.body;
      capturedHeaders = req.headers;
      return ok("AB12C");
    });
    await new OcrSpaceResolver(entry, http, 15000).resolve(input);
    expect(typeof capturedBody).toBe("string");
    expect(capturedBody as string).toContain("url=");
    expect(capturedBody as string).toContain("apikey=");
    expect(capturedHeaders?.["Content-Type"]).toBe("application/x-www-form-urlencoded");
    // Must not be Blob or FormData
    expect(capturedBody instanceof Blob).toBe(false);
  });

  it("base64-mode POST sends a urlencoded string body containing base64Image", async () => {
    const base64Entry: OcrSpaceEntry = { ...entry, inputMode: "base64" };
    const base64Input: OcrInput = {
      imageUrl: null,
      imageBytes: new Blob(["img"], { type: "image/png" }),
      mimeType: "image/png",
    };
    let capturedBody: unknown;
    let capturedHeaders: Record<string, string> | undefined;
    const http = fakeHttpClient((req) => {
      capturedBody = req.body;
      capturedHeaders = req.headers;
      return ok("AB12C");
    });
    await new OcrSpaceResolver(base64Entry, http, 15000).resolve(base64Input);
    expect(typeof capturedBody).toBe("string");
    expect(capturedBody as string).toContain("base64Image=");
    expect(capturedHeaders?.["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(capturedBody instanceof Blob).toBe(false);
  });

  it("file-mode POST sends an ArrayBuffer body with multipart Content-Type containing filename", async () => {
    const fileEntry: OcrSpaceEntry = { ...entry, inputMode: "file" };
    const fileInput: OcrInput = {
      imageUrl: null,
      imageBytes: new Blob(["img"], { type: "image/png" }),
      mimeType: "image/png",
    };
    let capturedBody: unknown;
    let capturedHeaders: Record<string, string> | undefined;
    const http = fakeHttpClient((req) => {
      capturedBody = req.body;
      capturedHeaders = req.headers;
      return ok("AB12C");
    });
    await new OcrSpaceResolver(fileEntry, http, 15000).resolve(fileInput);
    expect(capturedBody).toBeInstanceOf(ArrayBuffer);
    expect(capturedBody instanceof Blob).toBe(false);
    expect(capturedHeaders?.["Content-Type"]).toMatch(/^multipart\/form-data; boundary=/);
    const decoded = String.fromCharCode(...new Uint8Array(capturedBody as ArrayBuffer));
    expect(decoded).toContain('filename="captcha.png"');
  });
});
