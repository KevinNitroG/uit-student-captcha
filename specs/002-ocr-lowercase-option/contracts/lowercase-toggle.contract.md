# Contract: OCR Result Lowercase Toggle

**Feature**: `002-ocr-lowercase-option`
**Date**: 2026-06-14
**Extends**: `specs/001-captcha-ocr-autofill/contracts/config-ui.contract.md` §A

This document specifies the behavioral contract for the lowercase toggle across all
three packages that touch it.

---

## 1. Config-core schema contract

**File**: `packages/uit-student-captcha-config-core/src/schema.ts`

```ts
// Version literal on ProviderConfiguration MUST be 2 after this change.
export interface ProviderConfiguration {
  readonly version: 2;
  readonly providers: readonly ProviderEntry[];
  readonly timeoutMs: number;
  readonly lowercaseResult: boolean;    // NEW — default true
}

export const CONFIG_VERSION = 2 as const;

export const DEFAULT_CONFIG: ProviderConfiguration = {
  version: 2,
  timeoutMs: 15_000,
  providers: [],
  lowercaseResult: true,
};
```

### Invariants
- `lowercaseResult` MUST be present on every `ProviderConfiguration` value at runtime.
- Absent or non-boolean values MUST be coerced to `true` by `validateConfig()`.
- `CONFIG_VERSION` MUST equal `2`.

---

## 2. Validation contract

**File**: `packages/uit-student-captcha-config-core/src/validate.ts`

```ts
// Return shape after this change (version literal updated):
return {
  version: CONFIG_VERSION,   // 2
  timeoutMs,
  providers,
  lowercaseResult: asBoolean(obj['lowercaseResult'], true),
};
```

### Migration invariants
| Input version | `lowercaseResult` in input | Output `lowercaseResult` |
|--------------|---------------------------|--------------------------|
| absent / null | any | `true` |
| `1` | absent | `true` |
| `1` | `false` | `false` (user's intent preserved when field is a valid boolean) |
| `2` | `true` | `true` |
| `2` | `false` | `false` |
| `> 2` | any | reset to `DEFAULT_CONFIG` (`true`) |

> Note: a v1 config has no `lowercaseResult` key, so it always fills `true`. A user who
> saved a v1 config with the flag explicitly `false` is theoretically impossible (the
> field didn't exist in v1), so no data is ever lost.

---

## 3. PortalView contract

**File**: `packages/uit-student-captcha/src/view/PortalView.ts`

### Option interface (additive — existing options unchanged)
```ts
export interface PortalViewOptions {
  readonly extractBytes?: ByteExtractor;
  readonly configUrl?: string;
  readonly lowercaseResult?: boolean;   // NEW — absent treated as true
}
```

### `fillAnswer()` behavior contract
| `lowercaseResult` option | Input `text` | Value written to `input.value` |
|--------------------------|-------------|-------------------------------|
| `true` (or absent) | `"AbCd12"` | `"abcd12"` |
| `true` (or absent) | `"abcd12"` | `"abcd12"` (no-op) |
| `false` | `"AbCd12"` | `"AbCd12"` (unchanged) |
| `true` (or absent) | `""` | not called (empty result is a provider failure) |

### Construction in `main.ts`
```ts
const view = new PortalView(viewModel, {
  configUrl: CONFIG_PAGE_URL,
  lowercaseResult: config.lowercaseResult,
});
```

---

## 4. Config-page UI contract

**File**: `packages/uit-student-captcha-config-page/src/components/GlobalSettings.tsx`

### Updated `GlobalSettings` props
```ts
export interface GlobalSettingsProps {
  timeoutMs: number;
  onChange: (timeoutMs: number) => void;
  lowercaseResult: boolean;             // NEW
  onLowercaseChange: (v: boolean) => void; // NEW
}
```

### Rendered UI addition (below the timeout field)

```
┌─ Global settings ────────────────────────────────────────────┐
│  Per-attempt timeout (ms):  [ 15000        ]                  │
│                                                               │
│  [●] Lowercase OCR result                                     │
│      Converts the recognized text to lowercase before         │
│      filling. Recommended — portal captchas are lowercase.    │
└───────────────────────────────────────────────────────────────┘
```

- Uses the existing `<Switch>` shadcn/ui component.
- The Switch `checked` prop mirrors `lowercaseResult`.
- `onCheckedChange` calls `onLowercaseChange`.

### `App.tsx` wiring
```tsx
<GlobalSettings
  timeoutMs={current.timeoutMs}
  onChange={(timeoutMs) => update({ ...current, timeoutMs })}
  lowercaseResult={current.lowercaseResult}
  onLowercaseChange={(lowercaseResult) => update({ ...current, lowercaseResult })}
/>
```

---

## 5. Test contract

### `config-core` — `schema.spec.ts` / `validate.spec.ts`
- `DEFAULT_CONFIG.lowercaseResult === true`
- `validateConfig({})` → `lowercaseResult === true`
- `validateConfig({ lowercaseResult: false })` → `lowercaseResult === false`
- `validateConfig({ lowercaseResult: "yes" })` → `lowercaseResult === true` (coercion)
- `validateConfig({ version: 99, lowercaseResult: false })` → reset → `lowercaseResult === true`

### `userscript` — `PortalView.spec.ts`
- With `lowercaseResult: true`: after a solved OCR returning `"AbCd"`, answer field contains `"abcd"`.
- With `lowercaseResult: false`: after a solved OCR returning `"AbCd"`, answer field contains `"AbCd"`.
- With `lowercaseResult` absent (default): behaves as `true`.

### `config-page` — `GlobalSettings` / `App.spec.tsx`
- Switch rendered and toggling calls `onLowercaseChange` with the new boolean value.
- Initial `lowercaseResult: true` renders the Switch as checked.
- Initial `lowercaseResult: false` renders the Switch as unchecked.
