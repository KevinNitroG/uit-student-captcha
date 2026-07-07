// Pure string parser that extracts the captcha solution from the image's `alt`
// attribute. No DOM, no I/O, no async — fully unit-testable without jsdom.

/** Result of attempting to extract a captcha solution from alt text. */
export interface AltTextResult {
  /** Whether a valid captcha:<solution> pattern was found. */
  readonly success: boolean;
  /** The extracted solution text (trimmed), or null when success is false. */
  readonly text: string | null;
  /** The original unmodified alt attribute value (for logging). */
  readonly rawAlt: string;
}

/**
 * Parse a captcha image's alt attribute to extract the solution.
 *
 * Format: `captcha:<solution>` where everything after the first colon is the solution.
 *
 * @param rawAlt - The raw alt attribute value from the captcha image element
 * @returns AltTextResult with the extracted solution or failure reason
 *
 * @example
 * parseAltText("captcha:ram")    // { success: true, text: "ram", rawAlt: "captcha:ram" }
 * parseAltText("captcha:full")   // { success: true, text: "full", rawAlt: "captcha:full" }
 * parseAltText("captcha: a b")   // { success: true, text: "a b", rawAlt: "captcha: a b" }
 * parseAltText("captcha:")       // { success: false, text: null, rawAlt: "captcha:" }
 * parseAltText("")               // { success: false, text: null, rawAlt: "" }
 * parseAltText("some image")     // { success: false, text: null, rawAlt: "some image" }
 */
export function parseAltText(rawAlt: string): AltTextResult {
  const prefix = "captcha:";
  if (!rawAlt.startsWith(prefix)) {
    return { success: false, text: null, rawAlt };
  }
  const text = rawAlt.slice(prefix.length).trim();
  if (text.length === 0) {
    return { success: false, text: null, rawAlt };
  }
  return { success: true, text, rawAlt };
}
