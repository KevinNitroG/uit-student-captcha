# Phase 1 Data Model: Captcha OCR Auto-fill

TypeScript contracts for the Model layer and the cross-layer state. These are the
**explicit typed contracts** required by Constitution III. Names are normative;
shapes may gain optional fields without breaking the plan.

---

## 1. OCR resolver contract (Model)

```ts
/** What the ViewModel hands a resolver. Carries both representations so a
 *  resolver picks whichever its provider/config wants (URL by default). */
export interface OcrInput {
  readonly imageUrl: string | null;     // public captcha PNG URL (OCR.space default)
  readonly imageBytes: Blob | null;     // fetched image bytes (EasyOCR requires this)
  readonly mimeType: string;            // e.g. "image/png"
}

/** Uniform success shape returned by every resolver. */
export interface OcrResult {
  readonly provider: string;            // resolver id, e.g. "easyocr"
  readonly rawText: string;             // provider text before normalization
  readonly text: string;                // normalized single alphanumeric token (FR-010)
  readonly confidence: number | null;   // 0..1 if the provider reports it
}

/** The single stable extension seam (Constitution II). */
export interface OcrResolver {
  readonly id: string;                  // unique provider id
  resolve(input: OcrInput): Promise<OcrResult>;   // throws OcrError on failure
}
```

### Validation / behavior rules
- A resolver MUST throw `OcrError(MISSING_CONFIG, ...)` from its constructor (or a
  `validate()` guard) when required config is absent — never send an invalid request (FR-013).
- A resolver MUST throw (not return empty) when the normalized token is empty (`EMPTY_RESULT`).
- A resolver MUST NOT access the DOM or `GM_*` directly (Constitution I). It receives
  an injected `HttpClient`.

---

## 2. Error contract (Model)

```ts
export type OcrErrorCode =
  | "BAD_REQUEST" | "AUTH" | "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA"
  | "RATE_LIMIT" | "TIMEOUT" | "NETWORK" | "PROVIDER_ERROR"
  | "EMPTY_RESULT" | "MISSING_CONFIG";

export class OcrError extends Error {
  readonly code: OcrErrorCode;
  readonly provider: string;
  readonly httpStatus?: number;         // when the failure is HTTP-driven
  readonly raw?: unknown;               // provider raw payload for logging
  constructor(code: OcrErrorCode, message: string, meta: {
    provider: string; httpStatus?: number; raw?: unknown; cause?: unknown;
  });
}
```

See `research.md` and `contracts/*.contract.md` for the per-provider status →
`OcrErrorCode` mapping tables.

---

## 3. Provider configuration (persisted via GM storage)

This is the **config shape** persisted by the userscript and edited by the SPA. It
is the source of truth read on the portal (FR-011, FR-012).

> **Canonical home**: these types, `DEFAULT_CONFIG`, and `validateConfig()` live in the
> shared **`uit-student-captcha-config-core`** package (`src/schema.ts`, `src/validate.ts`)
> and are imported by both apps — not duplicated (research.md Decision 9).

```ts
export interface ProviderConfiguration {
  readonly version: 1;                      // schema version for future migration
  /** Ordered list = the fallback chain. providers[0] = primary, [1] = first fallback... */
  readonly providers: ProviderEntry[];
  readonly timeoutMs: number;               // per-attempt timeout; default 15000
}

/** Discriminated union keyed by `provider` — the only place `type` is switched
 *  is the registry/factory (Constitution II). */
export type ProviderEntry = EasyOcrEntry | OcrSpaceEntry;

export interface ProviderEntryBase {
  readonly id: string;                      // stable instance id (allows 2 of same kind)
  readonly enabled: boolean;                // toggle without deleting (user toggle requirement)
}

export interface EasyOcrEntry extends ProviderEntryBase {
  readonly provider: "easyocr";
  readonly endpoint: string;                // default https://console.easyocr.org/api/ocr; overridable
  readonly accessKey?: string;              // REQUIRED (X-Access-Key); EasyOCR has no keyless endpoint
}

export interface OcrSpaceEntry extends ProviderEntryBase {
  readonly provider: "ocrspace";
  readonly apiKey: string;                  // required (only mandatory field by default)
  readonly scheme: "https" | "http";        // default "https"
  readonly httpMethod: "POST" | "GET";      // default "POST"
  readonly inputMode: "url" | "base64" | "file"; // default "url"
  readonly ocrEngine: 1 | 2 | 3;            // default 2 (engine 1 returns empty on the portal's small captchas)
  readonly language: string;                // default "eng"
  readonly endpoint?: string;               // override; else derived from scheme+method
  readonly isOverlayRequired?: boolean;
  readonly detectOrientation?: boolean;
  readonly scale?: boolean;
  readonly isTable?: boolean;
}
```

> **EasyOCR is key-only** (verified 2026-06-12): there is no keyless endpoint
> (`api.easyocr.org` does not resolve). The single endpoint is
> `POST https://console.easyocr.org/api/ocr` with an `X-Access-Key` header — hence the
> `variant` field was removed (research.md correction). Both providers require a key.

### Typed defaults
```ts
export const CONFIG_VERSION = 1;            // persisted-schema version

// No provider is configured out of the box: every backend needs a key, so a baked
// default would only fail. First run → empty chain → portal "open configuration"
// notice; the config page starts empty with "+ Add provider".
export const DEFAULT_CONFIG: ProviderConfiguration = {
  version: CONFIG_VERSION,
  timeoutMs: 15000,
  providers: [],
};
```

### Validation & migration rules (`config-core/src/validate.ts`)
- Unknown/extra keys ignored; missing keys filled from defaults. Field-by-field coercion
  is **forward-compatible**: additive/compatible schema changes carry a saved config
  across versions with no data loss and no prompt.
- A stored config stamped with a `version` **newer** than `CONFIG_VERSION` was written by
  a later build we can't safely interpret → **reset to `DEFAULT_CONFIG`** (logged; the
  config page then shows its normal empty/default state — a clear "+ Add provider" CTA).
  A future breaking change bumps `CONFIG_VERSION` and adds a per-version migration step.
- `easyocr` with empty `accessKey` → misconfigured: skipped on the portal, flagged in the SPA (FR-013, FR-021).
- `ocrspace` with empty `apiKey` → same (skipped/flagged).
- A user-set `endpoint` is preserved as-is (no auto-rewriting).
- An entry with `enabled:false` is excluded from the runtime chain.
- If the resulting runtime chain is empty (none enabled/configured), the portal shows the "open configuration" notice (FR-021).
- `ocrEngine` clamped to 1..3 (default 2); `timeoutMs` clamped to a sane floor/ceiling.

---

## 4. Runtime entities (ViewModel & View — transient, per page load)

```ts
/** Detected DOM context (View produces it; ViewModel never reads the DOM). */
export interface SigninFormContext {
  readonly form: HTMLFormElement;
  readonly captchaImage: HTMLImageElement;
  readonly answerInput: HTMLInputElement;
}

export type CaptchaStatus =
  | { kind: "idle" }
  | { kind: "loading"; provider: string }
  | { kind: "solved"; result: OcrResult }
  | { kind: "missing-config" }                          // FR-021
  | { kind: "failed"; lastError: OcrError; attempts: string[] }; // FR-015

/** Held by the ViewModel (per the user's spec wording). */
export interface CaptchaViewModelState {
  imageUrl: string | null;
  imageBytes: Blob | null;
  ocrResolvers: OcrResolver[];     // instantiated from config, in chain order
  status: CaptchaStatus;
}
```

### State transitions
`idle → loading(primary) → [solved]` | `→ loading(fallback) → [solved | failed]`.
`missing-config` is entered instead of `loading` when the runtime chain is empty.
"Retry OCR" resets to `idle` and re-reads the current image (FR-015/FR-016). The
solved-guard records the last solved image src to avoid re-solving in a loop (FR-017).

---

## 5. Config-bridge messages (config page ↔ userscript)

> **Canonical home**: `BridgeMessage`, `STORAGE_KEY`, and `isBridgeMessage()` live in
> `uit-student-captcha-config-core` (`src/bridge.ts`); both sides import them.

```ts
type BridgeMessage =
  | { type: "uoc:get" }                                  // SPA -> bridge: request current config
  | { type: "uoc:value"; payload: ProviderConfiguration }// bridge -> SPA: current config
  | { type: "uoc:set"; payload: ProviderConfiguration }  // SPA -> bridge: persist
  | { type: "uoc:ack"; ok: true }                        // bridge -> SPA: saved
  | { type: "uoc:error"; message: string };              // bridge -> SPA: validation failed
```
Origin/source checks are mandatory on receipt (see `contracts/config-bridge.contract.md`).
