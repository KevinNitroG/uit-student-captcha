# Feature Specification: Alt Text Captcha Solver

**Feature Branch**: `004-alt-text-solver`

**Created**: 2026-07-07

**Status**: Draft

**Input**: User description: "The captcha solution is available directly in the image's alt text in the format `captcha:<solution>` (e.g., `captcha:full` means the answer is `full`). Make alt text extraction the default/primary solving method. Only fall back to OCR API calls when alt text extraction fails (element access fails, text is empty, or doesn't match expected format). Update the config page to explain this solving logic. OCR providers should no longer be required for the script to work."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Captcha solved instantly via alt text (Priority: P1)

A student opens any portal page showing the signin form with a captcha image. The script
reads the captcha solution directly from the image's `alt` attribute (formatted as
`captcha:<solution>`), fills the answer field immediately, and the student proceeds to
sign in. No OCR service is called, no configuration is needed, and no API key is required.

**Why this priority**: This is the core value of the feature — providing a zero-config,
instant captcha solution using data the portal already embeds in the page. It eliminates
the need for external API calls in the common case and makes the script work out of the
box without any user setup.

**Independent Test**: Load a portal page containing the signin form with a captcha image
that has a properly formatted alt text (e.g., `captcha:hello`). Confirm the answer field
is filled with the extracted text within milliseconds, without any network requests to OCR
services.

**Acceptance Scenarios**:

1. **Given** a portal page showing the signin form with a captcha image whose `alt`
   attribute contains `captcha:<solution>`, **When** the page finishes loading, **Then**
   the captcha answer field is filled with the solution text extracted from the alt
   attribute, and no OCR API call is made.
2. **Given** the captcha image has an alt text of `captcha:full`, **When** the script
   runs, **Then** the answer field is filled with the word `full`.
3. **Given** the captcha image has an alt text of `captcha:a1b2`, **When** the script
   runs, **Then** the answer field is filled with `a1b2`.

---

### User Story 2 - Fallback to OCR when alt text unavailable (Priority: P2)

When the alt text extraction fails — because the image element cannot be accessed, the
alt attribute is empty, or the text doesn't match the `captcha:<solution>` format — the
script automatically falls back to the configured OCR provider chain and attempts
recognition via API, just as it did before this feature.

**Why this priority**: The alt text method is the primary path, but OCR fallback ensures
the script still works when the portal changes its alt text format or when images lack
alt text. Without fallback, any alt text change would break the script entirely.

**Independent Test**: Configure an OCR provider with a valid key. Load a portal page where
the captcha image has an empty or malformed alt text. Confirm the script skips alt text
extraction and successfully fills the answer field via the OCR API.

**Acceptance Scenarios**:

1. **Given** the captcha image's `alt` attribute is empty or missing, **When** the script
   runs, **Then** it skips alt text extraction and attempts recognition via the configured
   OCR provider chain.
2. **Given** the captcha image's `alt` attribute contains text that doesn't match the
   `captcha:<solution>` format (e.g., just a filename or generic description), **When**
   the script runs, **Then** it treats the alt text as invalid and falls back to OCR.
3. **Given** the captcha image element cannot be accessed in the DOM, **When** the script
   runs, **Then** it falls back to OCR without throwing an error.
4. **Given** alt text extraction fails and no OCR providers are configured, **When** the
   chain is exhausted, **Then** the user sees a clear message indicating that neither alt
   text nor OCR could solve the captcha, with a prompt to configure an OCR provider as
   fallback.

---

### User Story 3 - Config page explains solving logic (Priority: P2)

The configuration page includes clear explanatory text describing the script's solving
logic: alt text extraction is attempted first (free, instant, no config needed), and OCR
providers are optional fallbacks for when alt text is unavailable. This helps users
understand why they may not need to configure any OCR provider.

**Why this priority**: Users coming from the previous version (where OCR was required) need
to understand the new behavior. Clear documentation in the config page prevents confusion
about why the script works without configuration and when OCR setup is actually needed.

**Independent Test**: Open the configuration page and verify that explanatory text is
visible describing the alt-text-first logic and that OCR providers are shown as optional.

**Acceptance Scenarios**:

1. **Given** the user opens the configuration page, **When** the page loads, **Then** a
   visible section explains that the script first attempts to extract the captcha solution
   from the image's alt text, and only falls back to OCR when that fails.
2. **Given** the configuration page, **When** displaying the OCR provider section, **Then**
   it indicates that OCR providers are optional and only needed as fallback when alt text
   extraction fails.
3. **Given** no OCR providers are configured, **When** the user views the config page,
   **Then** no warning or error is shown — the page communicates that the script works
   without OCR providers in the common case.

---

### Edge Cases

- **Alt text contains unexpected format**: If the alt text is `captcha:` with nothing
  after the colon, treat it as empty/invalid and fall back to OCR.
- **Alt text contains multiple colons**: If the alt text is `captcha:some:complex:text`,
  extract everything after the first colon as the solution (i.e., `some:complex:text`).
- **Alt text contains whitespace around the solution**: Trim leading/trailing whitespace
  from the extracted solution before filling.
- **Image element exists but alt attribute is not set**: The `alt` property returns an
  empty string; treat as invalid and fall back to OCR.
- **Alt text matches but OCR is also configured**: The script stops after successful alt
  text extraction — OCR is never called when alt text succeeds.
- **Page DOM changes break alt text extraction**: Graceful fallback to OCR; no errors
  thrown to host page.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The script MUST attempt to extract the captcha solution from the captcha
  image's `alt` attribute before trying any OCR provider.
- **FR-002**: The alt text MUST be parsed using the format `captcha:<solution>`, where
  everything after the first colon is treated as the solution text.
- **FR-003**: Extracted solution text MUST be trimmed of leading/trailing whitespace before
  being used as the captcha answer.
- **FR-004**: Alt text extraction MUST be considered successful only when: (a) the captcha
  image element is accessible in the DOM, (b) the `alt` attribute is non-empty, and (c)
  the text matches the `captcha:` prefix pattern.
- **FR-005**: When alt text extraction succeeds (per FR-004), the script MUST fill the
  answer field immediately and MUST NOT call any OCR provider.
- **FR-006**: When alt text extraction fails (element inaccessible, alt empty, or
  `captcha:` prefix not found), the script MUST fall back to the configured OCR provider
  chain.
- **FR-007**: The existing OCR provider chain (primary → fallback ordering, single attempt
  per provider) MUST remain unchanged and functional as the fallback mechanism.
- **FR-008**: OCR providers MUST become optional — the script MUST work correctly with zero
  OCR providers configured when alt text extraction succeeds.
- **FR-009**: When alt text extraction fails AND no OCR providers are configured, the
  script MUST show a non-blocking message explaining that neither method could solve the
  captcha, with guidance to configure an OCR provider as fallback.
- **FR-010**: The configuration page MUST include a section explaining the solving logic:
  alt text extraction is the primary method (free, instant, no configuration), and OCR
  providers are optional fallbacks.
- **FR-011**: The configuration page MUST NOT show warnings or errors when no OCR providers
  are configured — the page MUST communicate that the script works without OCR in the
  common case.
- **FR-012**: The existing "Retry OCR" control MUST also retry alt text extraction (re-read
  the current image's alt attribute) before attempting OCR, in case the DOM has updated.
- **FR-013**: All existing functional requirements from the original captcha OCR feature
  (FR-001 through FR-021 in spec 001) remain in effect except where explicitly
  contradicted by this spec (e.g., FR-018's "no providers by default" assumption is
  replaced by "providers are optional").
- **FR-014**: The script's solving logic flow MUST be: (1) detect form and captcha image,
  (2) attempt alt text extraction, (3) if successful, fill and stop, (4) if failed, run
  OCR provider chain, (5) if OCR succeeds, fill, (6) if all fail, show error with retry.

### Key Entities *(include if feature involves data)*

- **Alt Text Solver**: A new resolution method that extracts the captcha solution from the
  image's `alt` attribute. It is not an OCR provider — it is a DOM-based extraction that
  runs before the provider chain. It has no configuration and no API dependency.
- **Solving Logic Descriptor**: A description of the script's solving flow (alt text → OCR
  fallback) exposed on the configuration page for user education.
- **OCR Provider** (existing): Now explicitly optional. Providers remain interchangeable
  behind the existing contract, but the script no longer requires any provider to be
  configured for basic functionality.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a portal page with a properly formatted captcha alt text, the answer field
  is filled within 100 milliseconds of page load (no network round-trip required).
- **SC-002**: The script works correctly with zero OCR providers configured when the
  captcha image has valid alt text — no configuration is required for the common case.
- **SC-003**: When alt text extraction fails and OCR providers are configured, the fallback
  chain executes and fills the answer field with the same reliability as the previous
  OCR-only implementation.
- **SC-004**: The configuration page clearly explains the solving logic within 5 seconds
  of reading — a user understands why the script works without configuration.
- **SC-005**: When neither alt text nor OCR can solve the captcha, the user sees exactly
  one clear, non-blocking error message explaining both failure modes.
- **SC-006**: Existing users who have OCR providers configured experience no regression —
  the script behaves identically to before when alt text extraction fails.

## Verified Behavior (Live Portal)

**Confirmed 2026-07-07** via agent-browser on `https://student.uit.edu.vn`:

- The captcha image element is `<img src="..." alt="captcha:ram">`
- Selector: `.english-captcha-image img` (matches existing code in `PortalView.ts`)
- Alt text format: `captcha:<solution>` (e.g., `captcha:ram` for "What is the abbreviation
  for Random Access Memory?")
- The `alt` attribute is accessible via standard `img.alt` property access
- The answer extracted from alt text (`ram`) matches the expected solution

## Assumptions

- **The portal embeds the captcha solution in the image's `alt` attribute** using the
  format `captcha:<solution>`. This has been verified on the live portal (see "Verified
  Behavior" above) and is the basis for this feature. If the portal changes this format,
  the alt text extraction will fail gracefully and fall back to OCR.
- **The `alt` attribute is accessible via standard DOM property access** (`img.alt` or
  `img.getAttribute('alt')`). No special permissions or techniques are needed.
- **The `captcha:` prefix is consistent** across all portal captcha images. If the prefix
  changes, the regex/pattern matching will need updating (but fallback to OCR covers this
  transition).
- **Existing OCR configuration and providers continue to work unchanged** — this feature
  adds a new extraction step before the existing provider chain, not a replacement.
- **The config page's existing component structure can accommodate a new explanatory
  section** without major restructuring.
- **The "Retry OCR" button should also re-attempt alt text extraction** in case the DOM
  state changed between the initial run and the retry click.
