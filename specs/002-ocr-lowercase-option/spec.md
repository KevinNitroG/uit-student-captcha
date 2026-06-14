# Feature Specification: OCR Result Lowercase Toggle

**Feature Branch**: `002-ocr-lowercase-option`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "I need the result of the ocr resolver, to go the UI (view) have an option to lowercase the result. Because mostly ocr from the web is lowercased, but the result from web quite dynamic. I would like that option to be enabled by default."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - OCR result is automatically lowercased before fill (Priority: P1)

A student loads the portal signin page. The OCR resolver returns a result, and
because the lowercase option is enabled by default, the script converts the text
to lowercase before writing it into the captcha answer field. The student does not
need to touch any setting.

**Why this priority**: The portal's captcha challenges are consistently lowercase.
The raw OCR response can vary in casing depending on which provider handled the
image — lowercasing by default maximises the chance of a correct match with zero
user effort.

**Independent Test**: With the lowercase option enabled (the default), load the
portal signin page, let OCR run, and confirm the value written into the captcha
field contains no uppercase letters regardless of what the raw OCR response
contained.

**Acceptance Scenarios**:

1. **Given** the lowercase option is enabled and the OCR provider returns mixed-case
   text (e.g., `"AbCd12"`), **When** the script writes the result to the captcha
   field, **Then** the field contains the lowercased value (e.g., `"abcd12"`).
2. **Given** the lowercase option is enabled and the OCR provider returns already-
   lowercase text, **When** the script writes the result, **Then** the field
   contains that value unchanged.
3. **Given** the lowercase option is disabled and the OCR provider returns mixed-
   case text, **When** the script writes the result, **Then** the field contains
   the original casing from the provider, exactly as normalized by FR-010 of the
   parent feature (whitespace/punctuation stripped, longest alphanumeric token
   selected).

---

### User Story 2 - User toggles the lowercase option via the configuration page (Priority: P2)

A user who knows the portal captcha is case-sensitive (or whose OCR provider
already returns correct casing) opens the configuration page and turns the
lowercase option off. The change persists and takes effect immediately on the next
page load.

**Why this priority**: The default covers the common case. The toggle exists for
users who find that lowercasing hurts accuracy (e.g., if a captcha were ever
case-sensitive), but changing this setting is an uncommon, one-time action.

**Independent Test**: Open the configuration page, disable the lowercase option,
save, reload the portal page, confirm the captcha field is filled with the raw
(non-lowercased) OCR result.

**Acceptance Scenarios**:

1. **Given** the configuration page is open, **When** the user switches the
   lowercase toggle off and saves, **Then** the setting is persisted via the
   userscript storage API.
2. **Given** the lowercase option has been disabled and saved, **When** the portal
   page is reloaded and OCR runs, **Then** the captcha field is filled with the
   un-lowercased OCR result.
3. **Given** the user enables the option again after previously disabling it,
   **When** the portal page is reloaded, **Then** lowercasing is applied again.

---

### Edge Cases

- **Option not yet in stored config (first run / existing user upgrading)**: The
  lowercase option MUST default to enabled when the key is absent from stored
  configuration, so existing users see the improved behaviour without taking any
  action.
- **OCR result is already all-lowercase**: Lowercasing is a no-op; the value in
  the field is identical regardless of the toggle state.
- **OCR result is empty or normalization yields an empty string**: The lowercase
  transform is not applied to an empty result; the existing failure flow continues
  unchanged.
- **Provider chain fallback with mixed casing**: The lowercase transform (if
  enabled) is applied to whichever provider's result is ultimately written to the
  field, whether it came from the primary or a fallback provider.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The script MUST apply a lowercase transform to the normalized OCR
  result immediately before writing it to the captcha answer field, when the
  lowercase option is enabled.
- **FR-002**: The lowercase option MUST default to **enabled** — when the key is
  absent from stored configuration (first run or existing installation without the
  key), the script MUST treat it as enabled.
- **FR-003**: The configuration page MUST expose a clearly labelled toggle for the
  lowercase option, reflecting its current persisted state.
- **FR-004**: Changes to the lowercase toggle MUST be saved via the userscript
  storage API (the same mechanism used by the parent feature's provider
  configuration) and MUST survive page reloads and browser restarts.
- **FR-005**: The lowercase transform MUST be applied after the normalization step
  defined in the parent feature (FR-010 of `001-captcha-ocr-autofill`: strip
  whitespace/punctuation to alphanumerics, take longest token) — it is a
  post-normalization step, not a replacement for it.
- **FR-006**: When the lowercase option is disabled, the script MUST write the
  already-normalized (but un-lowercased) OCR result to the field, with no other
  change in behaviour.
- **FR-007**: The provider schema version (from the parent feature's config) MUST be
  incremented to account for the new option so that any config migration/reset logic
  handles the new key correctly.

### Key Entities

- **OCR Result Lowercase Setting**: A boolean configuration value, defaulting to
  `true`, stored alongside the provider configuration in userscript storage. Absent
  key is treated as `true`.
- **Normalized OCR Text**: The candidate string produced by the parent feature's
  normalization step — this is the input to the lowercase transform when the option
  is enabled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When the lowercase option is enabled (the default), every value
  written to the captcha answer field contains no uppercase letters, regardless
  of the raw provider output.
- **SC-002**: When the lowercase option is disabled, the value written to the
  captcha field matches the normalized (but un-lowercased) OCR result exactly.
- **SC-003**: A user who has never changed any setting (fresh install or existing
  install upgrading) experiences lowercased auto-fill without any configuration
  action.
- **SC-004**: Changing the toggle on the configuration page and saving takes effect
  on the next portal page load, with no additional steps required.

## Assumptions

- The captcha challenges on `https://student.uit.edu.vn/*` are consistently
  lowercase — this is the stated motivation for the default-on behaviour.
- The raw OCR provider responses can vary in casing (uppercase, mixed-case, or
  already lowercase), so a client-side transform is the correct place to apply a
  uniform lowercase rule rather than relying on provider behaviour.
- The lowercase transform is purely cosmetic/corrective and does not affect the
  normalization logic (alphanumeric filter, longest-token selection) already defined
  in the parent feature.
- The configuration page (React SPA on GitHub Pages) is the sole UI surface for
  this setting, consistent with the parent feature's configuration approach.
- No additional OCR providers or configuration changes are in scope for this feature
  beyond the new toggle and the schema version bump.
