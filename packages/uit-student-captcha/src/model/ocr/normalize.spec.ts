import { describe, expect, it } from "vitest";
import { normalizeCaptchaText } from "./normalize.ts";

describe("normalizeCaptchaText", () => {
  it("strips non-alphanumerics and returns the single longest token", () => {
    expect(normalizeCaptchaText("  ab! 12345 xy ")).toBe("12345");
  });

  it("keeps a single alphanumeric token intact (trailing newline)", () => {
    expect(normalizeCaptchaText("Old\n")).toBe("Old");
  });

  it("returns an empty string when nothing alphanumeric remains", () => {
    expect(normalizeCaptchaText("  -- !! ")).toBe("");
  });
});
