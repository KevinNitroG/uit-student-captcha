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
});
