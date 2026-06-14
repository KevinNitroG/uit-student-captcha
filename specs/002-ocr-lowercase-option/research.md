# Research: OCR Result Lowercase Toggle

**Feature**: `002-ocr-lowercase-option`
**Date**: 2026-06-14

## Decision 1 — MVVM layer for the lowercase transform

**Decision**: Apply the transform in the **View** layer (`PortalView.fillAnswer()`), not in the ViewModel or Model.

**Rationale**: The lowercase toggle is a presentation preference — it controls how the OCR result is written into the DOM input, not how it is resolved. The View is already the single place that writes text into the answer field. Constitution principle I states the View is the "thin adapter that reads inputs and applies outputs"; this transform is an output-application concern. Injecting it into the ViewModel would give the ViewModel a DOM/display concern it should not have.

**Alternatives considered**:
- ViewModel: rejected — the VM would need to know about a display preference, coupling it to the config-page schema in a way that violates Constitution I.
- Model/normalization step: rejected — `normalizeCaptchaText` is a pure text-cleaning function; mixing casing policy into it would make the function take a config argument and break its single-purpose character.

**How it flows**: `PortalViewOptions` gains a `lowercaseResult?: boolean` field. `main.ts` passes `config.lowercaseResult` through. `fillAnswer()` applies `.toLowerCase()` when the flag is set.

---

## Decision 2 — Schema version bump

**Decision**: Bump `CONFIG_VERSION` from `1` to `2`.

**Rationale**: Adding `lowercaseResult` is an additive change, fully forward-compatible via the existing coercion-with-defaults pattern in `validateConfig()`. A stored v1 config will have no `lowercaseResult` key; `asBoolean(obj['lowercaseResult'], true)` fills it with the correct default. No reset of the stored config is needed. The version bump signals downstream that the canonical schema now carries this field.

**Alternatives considered**:
- Keep version at 1: rejected — the version tracks the canonical shape, and the field IS now part of the canonical shape. Skipping the bump would leave the version semantically stale.
- Bump to 2 with a hard reset: rejected — the change is backward-compatible; a hard reset would destroy the user's provider list unnecessarily.

---

## Decision 3 — Default value: `true` (enabled)

**Decision**: `DEFAULT_CONFIG.lowercaseResult = true`; absent-key treatment in `validateConfig()` also returns `true`.

**Rationale**: The portal captchas are documented (and observed) to be consistently lowercase. OCR providers return variable casing. Defaulting to enabled maximises out-of-the-box accuracy with no user action. The setting can be toggled off for unusual cases.

**Alternatives considered**:
- Default `false`: rejected — would break the common case for all users until they discover and toggle the setting.

---

## Decision 4 — Config-page UI: Switch in GlobalSettings

**Decision**: Add a `<Switch>` + `<Label>` pair to the existing `GlobalSettings` component. The component gains `lowercaseResult: boolean` and `onLowercaseChange: (v: boolean) => void` props. `App.tsx` wires these through the `config` state.

**Rationale**: `GlobalSettings` is already the home for non-provider global settings (currently `timeoutMs`). The lowercase toggle is of the same character: a global behaviour flag that applies to all providers. Placing it there keeps the UI grouping coherent without creating a new component or section. The `Switch` component from shadcn/ui is already present in the project.

**Alternatives considered**:
- New dedicated component: rejected — over-engineering a two-element addition; `GlobalSettings` is the right slot.
- Dropdown or radio group for casing mode: rejected — the spec requires a simple on/off toggle; a select would suggest more options that don't exist.

---

## Decision 5 — Unit test coverage

**Decision**: Add tests to `normalize.spec.ts` (or a new `lowercase.spec.ts` alongside) verifying that when the flag is true the filled value is lowercased, and when false it is not. `PortalView.spec.ts` gets assertions covering both flag states via the existing `extractBytes` test injection pattern.

**Rationale**: Constitution Testing Discipline requires new behaviour to be unit-testable against jsdom. The lowercase transform is a pure one-liner in `fillAnswer()`; the tests verify the wiring, not the JS built-in `.toLowerCase()`.
