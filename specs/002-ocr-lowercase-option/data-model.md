# Data Model: OCR Result Lowercase Toggle

**Feature**: `002-ocr-lowercase-option`
**Date**: 2026-06-14
**Parent**: `specs/001-captcha-ocr-autofill/data-model.md` (this document extends §3 and §4)

---

## 1. Schema change — `ProviderConfiguration` (config-core)

The shared schema in `packages/uit-student-captcha-config-core/src/schema.ts` gains one new
field on `ProviderConfiguration` and a version bump.

```ts
export interface ProviderConfiguration {
  readonly version: 2;                   // bumped from 1 → 2 (research.md Decision 2)
  readonly providers: readonly ProviderEntry[];
  readonly timeoutMs: number;
  /** When true (default), the View lowercases the normalized OCR result before
   *  writing it into the captcha answer field. */
  readonly lowercaseResult: boolean;
}

export const CONFIG_VERSION = 2 as const;  // bumped

export const DEFAULT_CONFIG: ProviderConfiguration = {
  version: CONFIG_VERSION,
  timeoutMs: 15_000,
  providers: [],
  lowercaseResult: true,                 // default ON (research.md Decision 3)
};
```

No other types in `schema.ts` change.

---

## 2. Validation rule — `validateConfig()` (config-core)

`packages/uit-student-captcha-config-core/src/validate.ts` gains one new coercion line and
returns the updated version literal.

```ts
// Inside validateConfig(), after the timeoutMs line:
const lowercaseResult = asBoolean(obj['lowercaseResult'], true);

// The returned object:
return { version: CONFIG_VERSION, timeoutMs, providers, lowercaseResult };
```

### Migration behaviour

| Stored config version | `lowercaseResult` key present? | Result |
|-----------------------|-------------------------------|--------|
| `1` (old) | absent | filled with `true` (default) — seamless upgrade |
| `2` | present, valid `boolean` | used as-is |
| `2` | present, non-boolean | coerced to `true` (default) |
| `> 2` (from a future build) | any | full reset to `DEFAULT_CONFIG` (existing policy) |

### Validation rules
- `lowercaseResult` MUST be a boolean; any non-boolean value is coerced to `true`.
- No lower/upper bound clamping needed (it is a toggle, not a numeric range).

---

## 3. View layer option — `PortalViewOptions` (userscript)

`packages/uit-student-captcha/src/view/PortalView.ts` gains one new option. The
`PortalView` is the **only** place that writes text into the DOM, so this is the correct
MVVM layer for the transform (research.md Decision 1).

```ts
export interface PortalViewOptions {
  readonly extractBytes?: ByteExtractor;
  readonly configUrl?: string;
  /** When true (the default when absent), lowercase the OCR result before filling
   *  the captcha field. Mirrors ProviderConfiguration.lowercaseResult. */
  readonly lowercaseResult?: boolean;    // defaults to true when absent
}
```

### Transform rule
Applied in `fillAnswer()` immediately before writing `input.value`:

```ts
const finalText = (options.lowercaseResult ?? true) ? text.toLowerCase() : text;
input.value = finalText;
```

This is a post-normalization step: `text` already passed through `normalizeCaptchaText()`
inside the resolver, so it is a single alphanumeric token. `.toLowerCase()` on an all-
digit token is a no-op; no special casing for digits is required.

---

## 4. Config-page component change — `GlobalSettings` (config-page)

`packages/uit-student-captcha-config-page/src/components/GlobalSettings.tsx` gains two new
props and renders a Switch toggle.

```ts
export interface GlobalSettingsProps {
  timeoutMs: number;
  onChange: (timeoutMs: number) => void;
  lowercaseResult: boolean;
  onLowercaseChange: (v: boolean) => void;
}
```

The toggle label: **"Lowercase OCR result"** with a helper text: *"Converts the recognized
text to lowercase before filling. Recommended — portal captchas are lowercase."*

---

## 5. Entity summary

| Entity | Location | Change |
|--------|----------|--------|
| `ProviderConfiguration` | `config-core/src/schema.ts` | + `lowercaseResult: boolean`; version `1 → 2` |
| `DEFAULT_CONFIG` | `config-core/src/schema.ts` | + `lowercaseResult: true` |
| `CONFIG_VERSION` | `config-core/src/schema.ts` | `1 → 2` |
| `validateConfig()` | `config-core/src/validate.ts` | coerce `lowercaseResult` with default `true`; return v2 |
| `PortalViewOptions` | `userscript/src/view/PortalView.ts` | + `lowercaseResult?: boolean` |
| `PortalView.fillAnswer()` | `userscript/src/view/PortalView.ts` | apply `.toLowerCase()` when flag is truthy |
| `main.ts` | `userscript/src/main.ts` | pass `config.lowercaseResult` to `PortalViewOptions` |
| `GlobalSettingsProps` | `config-page/src/components/GlobalSettings.tsx` | + `lowercaseResult` + `onLowercaseChange` |
| `GlobalSettings` (render) | `config-page/src/components/GlobalSettings.tsx` | + `<Switch>` toggle |
| `App.tsx` | `config-page/src/App.tsx` | wire `lowercaseResult` change through `update()` |

No changes to: resolvers, ViewModel, bridge, `BridgeMessage`, or any other config-core
type. The bridge already serializes the full `ProviderConfiguration` object, so the new
field rides through automatically.
