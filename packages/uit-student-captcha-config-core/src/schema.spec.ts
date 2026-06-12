import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, isBridgeMessage } from "./index.ts";

describe("DEFAULT_CONFIG", () => {
  it("ships no providers (every backend needs a key — user configures one)", () => {
    expect(DEFAULT_CONFIG.providers).toEqual([]);
  });

  it("has a sane default per-attempt timeout", () => {
    expect(DEFAULT_CONFIG.timeoutMs).toBeGreaterThan(0);
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
