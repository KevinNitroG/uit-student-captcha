# Quickstart Validation Guide

**Feature**: 004-alt-text-solver
**Date**: 2026-07-07

## Prerequisites

- Node.js 18+ and pnpm installed
- Repository cloned and dependencies installed (`pnpm install`)
- A Tampermonkey/Violentmonkey-compatible userscript manager (for live testing)

## Validation Scenarios

### Scenario 1: Alt text extraction succeeds (P1 — core flow)

**What it proves**: The script extracts the captcha solution from the image's `alt`
attribute and fills the answer field without any OCR API call.

**Steps**:
1. Build the userscript: `pnpm exec nx run uit-student-captcha:build`
2. Install the built userscript in Tampermonkey
3. Navigate to `https://student.uit.edu.vn`
4. Observe the signin form with a captcha image

**Expected outcome**:
- The captcha answer field is filled within ~100ms of page load
- Badge shows "✓ Captcha read"
- No network requests to OCR APIs (verify in browser DevTools Network tab)
- Console log shows `[uit-captcha] captcha solved via alt text`

### Scenario 2: Fallback to OCR when alt text fails (P2)

**What it proves**: When alt text extraction fails, the script falls back to the
configured OCR provider chain.

**Steps**:
1. Configure an OCR provider with a valid key via the config page
2. Temporarily modify the captcha image's alt attribute to remove the `captcha:` prefix
   (or test with a page where the alt text is missing)
3. Navigate to the portal page

**Expected outcome**:
- Badge shows "Reading captcha… (ocrspace)" or similar during OCR
- Badge shows "✓ Captcha read" after OCR succeeds
- Console log shows alt text extraction failed, then OCR succeeded

### Scenario 3: Both alt text and OCR fail (P2)

**What it proves**: When neither method works, the user sees a clear error message.

**Steps**:
1. Configure no OCR providers (or configure one with a bad key)
2. Temporarily modify the captcha image's alt attribute to remove the `captcha:` prefix
3. Navigate to the portal page

**Expected outcome**:
- Badge shows "No captcha solution found (alt text unavailable). Configure an OCR provider
  as fallback. ⚙ Open configuration"
- No errors thrown to the host page

### Scenario 4: Config page explains solving logic (P2)

**What it proves**: The config page includes an informational section explaining the
alt-text-first solving logic.

**Steps**:
1. Build the config page: `pnpm exec nx run uit-student-captcha-config-page:build`
2. Open the config page in a browser

**Expected outcome**:
- A visible section explains that the script first extracts the captcha solution from
  the image's alt text, and only falls back to OCR when that fails
- OCR providers are shown as optional (no warning when none are configured)
- The section is positioned above the providers list

### Scenario 5: Unit tests pass (all layers)

**What it proves**: The implementation is correct at the unit level.

**Steps**:
1. Run the test suite: `pnpm exec nx run-many -t test`
2. Run type checking: `pnpm exec nx run-many -t typecheck`

**Expected outcome**:
- All existing tests pass (no regression)
- New tests for `parseAltText()` pass (success, failure, edge cases)
- New tests for `CaptchaViewModel.solve(altTextResult)` pass (alt text path, fallback path)
- Type checking passes with zero errors

### Scenario 6: Retry re-attempts alt text (P2)

**What it proves**: The "Retry OCR" button also re-attempts alt text extraction.

**Steps**:
1. Load the portal page where alt text extraction initially failed
2. Click the "Retry OCR" button

**Expected outcome**:
- The script re-reads the current image's `alt` attribute
- If alt text is now available, it fills the answer field
- If still unavailable, it falls back to OCR
