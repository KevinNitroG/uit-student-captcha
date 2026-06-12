import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  TIMEOUT_MS_MAX,
  TIMEOUT_MS_MIN,
} from "./schema.ts";
import { validateConfig } from "./validate.ts";

describe("validateConfig", () => {
  it("returns DEFAULT_CONFIG for non-object input", () => {
    expect(validateConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(validateConfig("nope")).toEqual(DEFAULT_CONFIG);
  });

  it("falls back to default providers when providers is not an array", () => {
    const cfg = validateConfig({ timeoutMs: 15000 });
    expect(cfg.providers).toEqual(DEFAULT_CONFIG.providers);
  });

  it("clamps timeoutMs into the allowed range", () => {
    expect(validateConfig({ providers: [], timeoutMs: 10 }).timeoutMs).toBe(TIMEOUT_MS_MIN);
    expect(validateConfig({ providers: [], timeoutMs: 9_999_999 }).timeoutMs).toBe(TIMEOUT_MS_MAX);
  });

  it("clamps ocrEngine to 1..3 and fills ocrspace defaults", () => {
    const cfg = validateConfig({
      timeoutMs: 15000,
      providers: [{ provider: "ocrspace", id: "x", enabled: true, apiKey: "k", ocrEngine: 9 }],
    });
    const entry = cfg.providers[0];
    expect(entry?.provider).toBe("ocrspace");
    expect((entry as { ocrEngine: number }).ocrEngine).toBe(2); // out-of-range → default 2
    expect((entry as { scheme: string }).scheme).toBe("https");
    expect((entry as { language: string }).language).toBe("eng");
  });

  it("drops unknown providers but keeps disabled / keyless entries", () => {
    const cfg = validateConfig({
      providers: [
        { provider: "nope" },
        { provider: "easyocr", id: "e", enabled: false, variant: "free", endpoint: "https://x" },
      ],
    });
    expect(cfg.providers).toHaveLength(1);
    expect(cfg.providers[0]?.enabled).toBe(false);
  });

  it("preserves a user-set EasyOCR endpoint (no auto-rewrite)", () => {
    const cfg = validateConfig({
      providers: [
        { provider: "easyocr", id: "e", enabled: true, endpoint: "https://my.proxy/ocr", accessKey: "k" },
      ],
    });
    expect((cfg.providers[0] as { endpoint: string }).endpoint).toBe("https://my.proxy/ocr");
  });

  it("defaults the EasyOCR endpoint to the console API when unset", () => {
    const cfg = validateConfig({
      providers: [{ provider: "easyocr", id: "e", enabled: true, accessKey: "k" }],
    });
    expect((cfg.providers[0] as { endpoint: string }).endpoint).toBe(
      "https://console.easyocr.org/api/ocr",
    );
  });

  it("defaults OCR.space to engine 2 when unspecified", () => {
    const cfg = validateConfig({
      providers: [{ provider: "ocrspace", id: "o", enabled: true, apiKey: "k" }],
    });
    expect((cfg.providers[0] as { ocrEngine: number }).ocrEngine).toBe(2);
  });

  it("resets to defaults when the stored schema version is newer", () => {
    const cfg = validateConfig({
      version: 999,
      timeoutMs: 5000,
      providers: [{ provider: "ocrspace", id: "o", enabled: true, apiKey: "k" }],
    });
    expect(cfg).toEqual(DEFAULT_CONFIG);
  });
});
