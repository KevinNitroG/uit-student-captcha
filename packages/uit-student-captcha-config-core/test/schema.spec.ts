import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, isBridgeMessage } from "../src/index.ts";

describe("DEFAULT_CONFIG", () => {
  it("makes the no-key EasyOCR provider the enabled primary", () => {
    const primary = DEFAULT_CONFIG.providers[0];
    expect(primary?.provider).toBe("easyocr");
    expect(primary?.enabled).toBe(true);
  });

  it("ships OCR.space as a disabled fallback (needs a key)", () => {
    const fallback = DEFAULT_CONFIG.providers[1];
    expect(fallback?.provider).toBe("ocrspace");
    expect(fallback?.enabled).toBe(false);
  });
});

describe("isBridgeMessage", () => {
  it("accepts a known message type", () => {
    expect(isBridgeMessage({ type: "uoc:get" })).toBe(true);
  });

  it("rejects non-bridge values", () => {
    expect(isBridgeMessage(null)).toBe(false);
    expect(isBridgeMessage({ type: "other" })).toBe(false);
  });
});
