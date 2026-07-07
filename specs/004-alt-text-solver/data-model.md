# Data Model: Alt Text Captcha Solver

**Feature**: 004-alt-text-solver
**Date**: 2026-07-07

## 1. AltTextResult (Model layer)

The return type of `parseAltText()`. A pure value object — no DOM, no I/O.

```
AltTextResult
├── success: boolean          # Whether a valid captcha:<solution> was found
├── text: string | null       # The extracted solution (trimmed), or null on failure
└── rawAlt: string            # Original alt text value (for logging/debugging)
```

**Validation rules**:
- `text` is non-empty only when `success` is true
- `text` is always trimmed of leading/trailing whitespace
- `rawAlt` always contains the original unmodified alt attribute value

**State transitions**: None — this is a value object, not a stateful entity.

**Created by**: `parseAltText(rawAlt: string): AltTextResult` in `model/ocr/AltTextResolver.ts`

## 2. CaptchaStatus (existing, unchanged)

The `CaptchaStatus` union type in `CaptchaViewModel.ts` is reused without modification:

```
CaptchaStatus
├── { kind: "idle" }
├── { kind: "loading", provider: string }
├── { kind: "solved", result: OcrResult }
├── { kind: "missing-config" }
└── { kind: "failed", lastError: OcrError, attempts: string[] }
```

**Alt text integration**: When `parseAltText()` returns `success: true`, the ViewModel
constructs an `OcrResult` with `provider: "alt-text"` and returns `{ kind: "solved", result }`
without calling any OCR resolver.

## 3. OcrResult (existing, extended usage)

The existing `OcrResult` interface is reused with a new provider value:

```
OcrResult
├── provider: "alt-text" | "easyocr" | "ocrspace" | ...  # "alt-text" is new
├── rawText: string        # For alt-text: the raw alt value (e.g., "captcha:ram")
├── text: string           # Normalized text (e.g., "ram")
└── confidence: null       # Always null for alt text (no OCR confidence score)
```

**No schema changes**: The `provider` field is already `string`-typed. `"alt-text"` is
a new valid value, not a type change.

## 4. ProviderConfiguration (existing, unchanged)

The config schema is not modified. OCR providers remain optional entries in the
`providers` array. No new configuration fields are added for alt text extraction —
it is always-on, zero-config.

## 5. Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────┐
│  PortalView (View Layer)                             │
│                                                      │
│  solveInto():                                        │
│    1. reads img.alt from DOM                         │
│    2. calls parseAltText(alt) → AltTextResult        │
│    3. passes AltTextResult to ViewModel              │
│    4. fills answer field on success                  │
└──────────────────────┬───────────────────────────────┘
                       │ passes AltTextResult
                       ▼
┌──────────────────────────────────────────────────────┐
│  CaptchaViewModel (ViewModel Layer)                  │
│                                                      │
│  solve(altTextResult?):                              │
│    1. if altTextResult.success → return solved       │
│    2. else → run OCR resolver chain (existing)       │
│                                                      │
│  Orchestrates solve order. No DOM access.            │
└──────────────────────┬───────────────────────────────┘
                       │ iterates (fallback only)
                       ▼
┌──────────────────────────────────────────────────────┐
│  Model Layer                                         │
│                                                      │
│  AltTextResolver.ts                                  │
│    parseAltText(raw) → AltTextResult                 │
│    Pure string parsing. No DOM, no I/O.              │
│                                                      │
│  OcrResolver[] (existing, unchanged)                 │
│    resolve(input) → OcrResult                        │
│    API-based recognition.                             │
└──────────────────────────────────────────────────────┘
```

## 6. Solving Flow (state machine)

```
                    ┌─────────────┐
                    │   idle      │
                    └──────┬──────┘
                           │ run()
                           ▼
                    ┌─────────────┐
                    │  detect     │
                    │  form + img │
                    └──────┬──────┘
                           │ found
                           ▼
                    ┌─────────────┐
              ┌─────│  extract    │─────┐
              │     │  alt text   │     │
              │     └─────────────┘     │
              │ success                 │ failure
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │   solved    │          │  OCR chain  │
       │ (alt-text)  │          │  (existing) │
       └─────────────┘          └──────┬──────┘
                                       │
                              ┌────────┴────────┐
                              │                 │
                         success            all failed
                              │                 │
                              ▼                 ▼
                       ┌─────────────┐  ┌─────────────┐
                       │   solved    │  │   failed    │
                       │  (ocr)      │  │ or missing  │
                       └─────────────┘  └─────────────┘
```
