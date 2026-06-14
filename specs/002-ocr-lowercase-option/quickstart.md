# Quickstart & Validation Guide: OCR Result Lowercase Toggle

**Feature**: `002-ocr-lowercase-option`
**Date**: 2026-06-14

This guide describes how to validate the feature end-to-end after implementation.

---

## Prerequisites

- pnpm workspace installed (`pnpm install` at repo root)
- At least one OCR provider configured in the userscript (or use a mock in tests)
- Tampermonkey/Violentmonkey installed in the browser for manual validation

---

## 1. Unit tests (primary validation)

Run the full test suite across all packages:

```bash
pnpm exec nx run-many -t typecheck test build
```

### Specific test targets

```bash
# config-core: schema + validation
pnpm exec nx test uit-student-captcha-config-core

# userscript: PortalView lowercase wiring
pnpm exec nx test uit-student-captcha

# config-page: GlobalSettings switch
pnpm exec nx test uit-student-captcha-config-page
```

### Expected test outcomes (see `contracts/lowercase-toggle.contract.md §5`)

| Test | Expected result |
|------|----------------|
| `DEFAULT_CONFIG.lowercaseResult` | `true` |
| `validateConfig({})` | `lowercaseResult === true` |
| `validateConfig({ lowercaseResult: false })` | `lowercaseResult === false` |
| PortalView with `lowercaseResult: true`, OCR returns `"AbCd"` | field contains `"abcd"` |
| PortalView with `lowercaseResult: false`, OCR returns `"AbCd"` | field contains `"AbCd"` |
| PortalView with `lowercaseResult` absent, OCR returns `"AbCd"` | field contains `"abcd"` |
| GlobalSettings switch rendered with `lowercaseResult: true` | Switch is checked |
| GlobalSettings switch toggled off | `onLowercaseChange(false)` called |

---

## 2. Type-check

```bash
pnpm exec nx run-many -t typecheck
```

Expected: zero errors across all three packages after the schema change and new props.

---

## 3. Config-page manual validation

```bash
pnpm exec nx serve uit-student-captcha-config-page
```

Open `http://localhost:3000/configure.html` (or whatever the dev server URL is).

**Scenario A — Default state**
1. Open the config page with no saved config.
2. Observe: the "Lowercase OCR result" switch is **checked (on)** by default.
3. No user action needed to enable it.

**Scenario B — Toggle off and save**
1. Toggle the "Lowercase OCR result" switch off.
2. Click **Save**.
3. Reload the page.
4. Observe: the switch is still **unchecked** (persisted correctly).

**Scenario C — Toggle back on**
1. Toggle the switch back on and save.
2. Reload.
3. Observe: switch is **checked** again.

---

## 4. End-to-end portal validation

Install the built userscript in Tampermonkey (`pnpm exec nx build uit-student-captcha`,
then install from `dist/`).

**Scenario D — Lowercase enabled (default)**
1. Open `https://student.uit.edu.vn/` while logged out to see the signin form.
2. Wait for OCR to run automatically.
3. Observe: the captcha answer field is filled with **all-lowercase** text.
4. Optionally: verify in the browser console that the raw OCR text was mixed-case (if
   the provider logs it) and the filled value is its lowercased form.

**Scenario E — Lowercase disabled**
1. Open the config page, toggle the switch off, save.
2. Return to `https://student.uit.edu.vn/` and reload.
3. Wait for OCR to run.
4. Observe: the captcha answer field is filled with the **original casing** from the
   OCR provider (may be mixed-case or all-caps depending on the provider).

---

## 5. References

- Data model: `specs/002-ocr-lowercase-option/data-model.md`
- Behavioral contract: `specs/002-ocr-lowercase-option/contracts/lowercase-toggle.contract.md`
- Affected source files (see `tasks.md` for implementation order):
  - `packages/uit-student-captcha-config-core/src/schema.ts`
  - `packages/uit-student-captcha-config-core/src/validate.ts`
  - `packages/uit-student-captcha/src/view/PortalView.ts`
  - `packages/uit-student-captcha/src/main.ts`
  - `packages/uit-student-captcha-config-page/src/components/GlobalSettings.tsx`
  - `packages/uit-student-captcha-config-page/src/App.tsx`
