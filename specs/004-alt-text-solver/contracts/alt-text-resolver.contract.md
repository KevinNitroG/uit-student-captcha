# Contract: Alt Text Resolver

**Feature**: 004-alt-text-solver
**Layer**: Model
**File**: `packages/uit-student-captcha/src/model/ocr/AltTextResolver.ts`

## Purpose

Pure string parser that extracts the captcha solution from the image's `alt` attribute.
No DOM access, no I/O, no async — fully unit-testable without jsdom.

## Interface

```typescript
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
export function parseAltText(rawAlt: string): AltTextResult;
```

## Behavior

1. If `rawAlt` does not start with `"captcha:"` (case-sensitive) → return `{ success: false }`
2. Extract the substring after `"captcha:"` (i.e., `rawAlt.slice(9)`)
3. Trim leading/trailing whitespace from the extracted substring
4. If the trimmed result is empty → return `{ success: false }`
5. Otherwise → return `{ success: true, text: trimmed }`

## Edge Cases

| Input | Output | Notes |
|-------|--------|-------|
| `"captcha:ram"` | `{ success: true, text: "ram" }` | Standard case |
| `"captcha:full"` | `{ success: true, text: "full" }` | Standard case |
| `"captcha:a1b2"` | `{ success: true, text: "a1b2" }` | Alphanumeric |
| `"captcha: some text"` | `{ success: true, text: "some text" }` | Whitespace trimmed |
| `"captcha:some:complex:text"` | `{ success: true, text: "some:complex:text" }` | Multiple colons preserved |
| `"captcha:"` | `{ success: false, text: null }` | Empty after prefix |
| `"captcha:   "` | `{ success: false, text: null }` | Whitespace-only after prefix |
| `""` | `{ success: false, text: null }` | Empty string |
| `"CAPTCHA:ram"` | `{ success: false, text: null }` | Case-sensitive prefix |
| `"some image description"` | `{ success: false, text: null }` | No prefix |
