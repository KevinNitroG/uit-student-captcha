# Research: Alt Text Captcha Solver

**Feature**: 004-alt-text-solver
**Date**: 2026-07-07

## Decision 1: Three-layer architecture for alt text extraction

**Decision**: Split alt text extraction across all three MVVM layers:

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| **Model** | `AltTextResolver` | Pure string parsing: `parseAltText(raw: string): AltTextResult`. No DOM, no I/O. |
| **ViewModel** | `CaptchaViewModel.solve()` | Orchestration: try `AltTextResolver` first → if fails → run OCR chain. |
| **View** | `PortalView` | DOM bridge: reads `img.alt` from the DOM and passes the string to the ViewModel. |

**Rationale**: Constitution I mandates strict layer separation. The `alt` attribute is a DOM
property (View concern), but the parsing logic (`captcha:` prefix extraction) is pure business
logic (Model concern). The ViewModel orchestrates which solver to try. This mirrors the existing
pattern where the View reads DOM → passes data to ViewModel → ViewModel runs Model resolvers.

**Alternatives considered**:
- Putting `extractAltText()` entirely in PortalView — rejected because it mixes DOM access
  with parsing logic, violating the principle that the View should be a thin adapter.
- Making `AltTextResolver` implement `OcrResolver` — rejected because it's not an OCR API call;
  it's a synchronous string parser. Different abstraction.

## Decision 2: AltTextResolver is a Model-layer pure function

**Decision**: Create `src/model/ocr/AltTextResolver.ts` with a single exported function:

```typescript
export interface AltTextResult {
  readonly success: boolean;
  readonly text: string | null;    // Extracted solution, trimmed
  readonly rawAlt: string;         // Original alt text for logging
}

export function parseAltText(rawAlt: string): AltTextResult;
```

**Rationale**: This is pure string parsing — no DOM, no network, no async. It follows the
same pattern as `normalizeCaptchaText()` in `model/ocr/normalize.ts`: a standalone function
that transforms input to output with no side effects. Fully unit-testable without jsdom.

**Alternatives considered**:
- A class with state — rejected because there's no state; it's a pure function.
- Putting it in `normalize.ts` — rejected because it's a different concern (extraction vs normalization).

## Decision 3: ViewModel orchestration adds alt-text-first step

**Decision**: Modify `CaptchaViewModel.solve()` to accept an optional `altTextResult`
parameter. If provided and successful, return solved immediately without running the OCR chain.

```typescript
async solve(altTextResult?: AltTextResult): Promise<CaptchaStatus> {
  // Existing solved-guard check...

  // Alt text first (new step)
  if (altTextResult?.success && altTextResult.text) {
    return this.setStatus({
      kind: "solved",
      result: {
        provider: "alt-text",
        rawText: altTextResult.rawAlt,
        text: altTextResult.text,
        confidence: null,
      },
    });
  }

  // Existing OCR chain (unchanged)
  if (this.ocrResolvers.length === 0) {
    return this.setStatus({ kind: "missing-config" });
  }
  // ... rest of OCR chain
}
```

**Rationale**: The ViewModel owns orchestration. By accepting the alt text result as a
parameter (not reading DOM itself), it stays DOM-free while still deciding the solve order.
The OCR chain remains completely unchanged as the fallback path.

**Alternatives considered**:
- Creating a separate `solveWithAltText()` method — rejected because it duplicates the
  solved-guard logic and fragments the orchestration entry point.
- Having the View call `solveAltText()` then `solve()` separately — rejected because it
  leaks orchestration into the View, violating MVVM.

## Decision 4: View reads alt text and passes it to ViewModel

**Decision**: In `PortalView.solveInto()`, read `img.alt` and call `parseAltText()` before
calling `viewModel.solve(altTextResult)`.

```typescript
async solveInto(context: SigninFormContext, options: { force?: boolean } = {}): Promise<CaptchaStatus> {
  // ... existing setup ...

  // NEW: Try alt text extraction first
  const altResult = parseAltText(context.captchaImage.alt);

  // Pass alt result to ViewModel (ViewModel decides whether to use it)
  const status = await this.viewModel.solve(altResult);

  // ... existing render + fill logic ...
}
```

**Rationale**: The View is responsible for reading DOM properties (`img.alt`) and bridging
them to the ViewModel. This is exactly what `solveInto()` already does for image URL and
bytes — it reads DOM data and passes it to the ViewModel. Alt text is just another DOM read.

**Alternatives considered**:
- Reading alt text in `run()` instead of `solveInto()` — rejected because `run()` is a
  high-level entry point; `solveInto()` is where image data is collected.

## Decision 5: Reuse existing CaptchaStatus types

**Decision**: Alt text success maps to `{ kind: "solved", result: OcrResult }` — the same
status as OCR success. The `OcrResult.provider` field carries `"alt-text"` for logging.

**Rationale**: The badge UI renders "✓ Captcha read" for all "solved" states. There's no
user-facing difference between solving methods. Adding a new status kind would require badge
changes for no user-visible benefit.

## Decision 6: Config page uses informational banner, not new settings

**Decision**: Add a `SolvingLogicInfo` React component that renders an informational
section above the providers list. No new config settings are added.

**Rationale**: The solving logic (alt text → OCR fallback) is not user-configurable — it's
always-on. Users only need to understand *why* the script works without configuration.

## Decision 7: "Retry OCR" button re-attempts alt text first

**Decision**: The retry flow calls `solveInto()` which includes alt text extraction. Since
`parseAltText()` reads the current `img.alt` on each call, retry naturally re-attempts
alt text extraction first.

## Decision 8: Badge text update for "no providers + alt text failed"

**Decision**: When alt text fails AND no OCR providers are configured, update the
"missing-config" badge text to mention alt text was tried:

"No captcha solution found (alt text unavailable). Configure an OCR provider as fallback.
⚙ Open configuration"

**Rationale**: Users need to understand that alt text was attempted and failed; otherwise
they may think OCR is required when it's actually not needed in the common case.
