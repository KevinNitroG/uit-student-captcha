import { describe, expect, it } from "vitest";
import type { EasyOcrEntry } from "uit-student-captcha-config-core";
import { EasyOcrResolver } from "./EasyOcrResolver.ts";
import { OcrError } from "./errors.ts";
import type { OcrInput } from "./OcrResolver.ts";
import { fakeHttpClient, jsonResponse } from "../../../test/helpers/mocks.ts";

const freeEntry: EasyOcrEntry = {
  id: "easyocr-free",
  provider: "easyocr",
  variant: "free",
  endpoint: "https://api.easyocr.org/ocr",
  enabled: true,
};

const input: OcrInput = {
  imageUrl: null,
  imageBytes: new Blob(["bytes"], { type: "image/png" }),
  mimeType: "image/png",
};

describe("EasyOcrResolver", () => {
  it("maps a free 200 {words} response to a normalized token", async () => {
    const http = fakeHttpClient(() =>
      jsonResponse(200, { words: [{ text: "ab12c", rate: 0.98 }] }),
    );
    const result = await new EasyOcrResolver(freeEntry, http, 15000).resolve(input);
    expect(result.text).toBe("ab12c");
    expect(result.confidence).toBeCloseTo(0.98);
  });

  it("throws MISSING_CONFIG at construction when keyed without an access key", () => {
    const keyed: EasyOcrEntry = {
      id: "easyocr-keyed",
      provider: "easyocr",
      variant: "keyed",
      endpoint: "https://console.easyocr.org/api/ocr",
      enabled: true,
    };
    expect(() => new EasyOcrResolver(keyed, fakeHttpClient(() => jsonResponse(200, {})), 15000))
      .toThrowError(expect.objectContaining({ code: "MISSING_CONFIG" }));
  });

  it("maps HTTP 429 to RATE_LIMIT", async () => {
    const http = fakeHttpClient(() => jsonResponse(429, { message: "too many" }));
    await expect(new EasyOcrResolver(freeEntry, http, 15000).resolve(input))
      .rejects.toMatchObject({ code: "RATE_LIMIT" });
  });

  it("maps an empty {words:[]} 200 to EMPTY_RESULT", async () => {
    const http = fakeHttpClient(() => jsonResponse(200, { words: [] }));
    const err = await new EasyOcrResolver(freeEntry, http, 15000)
      .resolve(input)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OcrError);
    expect((err as OcrError).code).toBe("EMPTY_RESULT");
  });
});
