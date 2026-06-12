# Contract: UI design — config page & portal badge

Covers (a) the hosted React config SPA and (b) the inline status badge injected on
the portal. Field semantics come from `data-model.md` (`ProviderConfiguration`).

---

## A. Config page (React SPA at `configure.html`)

Single-screen, no routing. State = one `ProviderConfiguration` object, hydrated from
the userscript via `{type:"uoc:get"}` and saved via `{type:"uoc:set"}`
(see `config-bridge.contract.md`). **Stack: Tailwind v4 + shadcn/ui** (new-york,
neutral, radix-ui primitives, lucide icons) — already wired (see research.md
Decision 8). Build components from shadcn primitives (`Button`, `Input`, `Switch`,
`Select`, `Card`, `Label`, `Collapsible`, etc.) added via `shadcn add`.

### Top-level layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  UIT Student Captcha — Configuration                                   │
│  Settings are saved to your userscript manager. Keep this tab open     │
│  while saving. ● Connected to userscript / ○ Userscript not detected   │
├──────────────────────────────────────────────────────────────────────┤
│  Global                                                                │
│    Per-attempt timeout (ms):  [ 15000        ]                         │
├──────────────────────────────────────────────────────────────────────┤
│  Providers (drag to reorder — top = primary, then fallback chain)      │
│                                                                        │
│  ⠿  [▣ enabled]  EasyOCR                              [▲][▼][🗑]        │
│      Access key *:[ ………………………… ]   ⚠ required                         │
│      ▸ Advanced:  Endpoint [ https://console.easyocr.org/api/ocr ]     │
│                                                                        │
│  ⠿  [☐ enabled]  OCR.space                            [▲][▼][🗑]        │
│      API key *: [ ………………………………………………… ]   ⚠ required                  │
│      ▸ Advanced options                                                │
│         Scheme:    (•) https  ( ) http                                 │
│         Method:    (•) POST   ( ) GET                                  │
│         Input:     (•) Image URL  ( ) Base64  ( ) File                 │
│         OCR engine:[ 1 ▾ ] (1 fast · 2 all-round · 3 best/handwriting) │
│         Language:  [ eng ]                                             │
│         [☐ detectOrientation] [☐ scale] [☐ isTable] [☐ overlay]        │
│                                                                        │
│  [ + Add provider ▾ ]   (EasyOCR · OCR.space)                          │
├──────────────────────────────────────────────────────────────────────┤
│  [ Save ]   [ Reset to defaults ]      ✓ Saved 14:32 / ⚠ <error msg>   │
└──────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Responsibility |
|-----------|----------------|
| `App` | hydrate via bridge, hold config state, dispatch save/reset, render status line |
| `GlobalSettings` | `timeoutMs` numeric field (clamped) |
| `ProviderList` | ordered list = fallback chain; reorder (▲▼ / drag) mutates array order |
| `ProviderCard` | one `ProviderEntry`; enable toggle, delete, expand advanced; renders the right sub-form by `provider` discriminant (the SPA's single switch) |
| `EasyOcrFields` | `accessKey` (required) + advanced: `endpoint` |
| `OcrSpaceFields` | `apiKey` (required) + advanced: `scheme`,`httpMethod`,`inputMode`,`ocrEngine` (default 2),`language`,flags |
| `AddProviderMenu` | append a default entry of the chosen kind |
| `SaveBar` | Save / Reset, dirty indicator, ack/error from bridge |

### Field rules surfaced in the UI
- **Order = chain**: index 0 is primary; each lower row is the next fallback.
- **Enabled toggle** excludes a provider from the runtime chain without deleting it.
- **Required-key validation**: OCR.space with empty `apiKey`, or EasyOCR with empty
  `accessKey`, shows an inline ⚠ and is reported as misconfigured (FR-013/FR-021).
  Save is allowed (the entry is simply skipped on the portal) but the warning persists.
- **Only the API/access key is required by default**; everything else is pre-filled with
  `DEFAULT_CONFIG` values and tucked under "Advanced options" (collapsed).
- **Connection indicator**: if no `uoc:value` arrives shortly after `uoc:get`, show
  "Userscript not detected — install/enable it, then reload this page."
- **Secrets**: key inputs are `type="password"` with a show/hide toggle; never logged.

### Extensibility (Constitution II)
Adding a provider = add a `*Fields` component + one case in `ProviderCard`'s switch +
one entry in `AddProviderMenu`. No other UI changes. Mirrors the model-side registry.

---

## B. Portal status badge (View layer, injected DOM)

Mounted beneath the captcha image (inside `.captcha`, after `.english-captcha-image`;
selectors verified in `research.md` Decision 7). Built with plain DOM (no React on the
portal). One instance only — guarded against duplicate injection (FR-017, edge case).

### States (maps to `CaptchaStatus`)

| `CaptchaStatus` | Rendered |
|-----------------|----------|
| `idle` | nothing (or a faint spinner placeholder) |
| `loading` | small inline spinner + "Reading captcha… (EasyOCR)" with current provider id |
| `solved` | subtle ✓ (or silent); answer already typed into the field |
| `missing-config` | amber notice: "No OCR provider configured. ⚙ Open configuration" (opens config page via the menu-command URL) |
| `failed` | **red badge**: "Couldn't read the captcha (EasyOCR, OCR.space failed). [↻ Retry OCR]" + console.error with the `OcrError` chain |

```
   ┌─ captcha image ─────────────┐
   │            old              │
   └─────────────────────────────┘
   [ answer input............... ]
   ⓧ Couldn't read the captcha — EasyOCR: rate-limited,
     OCR.space: invalid key.            [ ↻ Retry OCR ]
```

### Behavior
- **Retry OCR** re-reads the *current* image element (drawing it to a `<canvas>` for
  bytes; URL for OCR.space) and re-runs the whole provider chain from `idle`
  (FR-015/FR-016). It targets recovery from transient provider failures — the portal has
  no in-page captcha refresh, so the image itself is unchanged between retries.
- The badge is **non-blocking**: it never overlays or disables the form; the user can
  always type the captcha manually.
- Never touches username/password/submit; only writes `#edit-english-captcha-answer`
  and dispatches `input`/`change` so Drupal accepts the value (FR-008).
- **Never overwrites a user-typed answer**: if the field is already non-empty the
  initial run skips OCR; a value typed while OCR is in flight is preserved (the result
  is dropped). Only an explicit **↻ Retry OCR** overwrites a pre-filled field.
- All DOM access guarded; a missing mount point logs and skips rather than throwing.

### Tests (jsdom)
- Renders `failed` badge + working Retry that re-invokes the ViewModel chain.
- Renders `missing-config` notice with a link to the config-page URL.
- `solved` writes only the answer input; username/password/submit untouched.
- A pre-filled answer input is left untouched and OCR is skipped; Retry still overwrites.
- Idempotent mount: running twice yields a single badge.
