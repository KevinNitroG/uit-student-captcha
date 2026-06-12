# Feature Specification: Auto-fill Captcha via OCR for UIT Student Portal

**Feature Branch**: `001-captcha-ocr-autofill`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "a user script (tampermonkey…) to solve OCR from signin form of the https://student.uit.edu.vn/*. It get captcha image from the website in signin form or so, passing to OCR apis, fallback apis, and fill in the ocr input. Not support auto fill signin credential, or auto click signin, just auto fill ocr captcha. APIs: https://easyocr.org/en, https://ocr.space/ocrapi. Configurable for those input to call those api, via userscript engine ability of configuring (remember the configs via GM userscript api). Handle error gracefully, from the api response, to view model layer, to view layer. Browse the signin form first; it mostly appears on every subpath of the site but not always, so handle gracefully when not found."

## Clarifications

### Session 2026-06-11

- Q: When should the script attempt OCR — once, or also when the captcha image is refreshed? → A: Solve once on page load (no automatic re-watching of the image); a manual retry re-reads the current image.
- Q: How should a failure (all providers exhausted) be surfaced? → A: Inline non-blocking message beneath the captcha plus a manual "Retry OCR" button, and a console log.
- Q: How should raw OCR output be normalized before filling? → A: Strip whitespace/punctuation to alphanumerics and, if multiple text blocks are returned, take the single longest alphanumeric token.
- Q: What is the attempt budget per captcha challenge? → A: One attempt per provider — primary once, then fallback once — then stop and surface the result (no auto-retry of the same provider).

### Session 2026-06-12

- Q: How is configuration edited and stored? → A: The userscript registers a userscript-manager menu command that opens a dedicated hosted configuration page (a React SPA on GitHub Pages). The userscript also runs on that page and bridges the SPA's saved settings (via postMessage) into the userscript storage API, which is the source of truth read on the portal.
- Q: What happens when the user hasn't configured anything yet? → A: On the portal, if no provider is configured (the default, since every backend needs a key), the script shows a non-blocking notice beneath the captcha telling the user to open the configuration page via the menu command, rather than silently doing nothing or sending a doomed request.
- Q: Is the captcha image URL public or session/cookie-bound? → A: Confirmed public and stable — the captcha PNG URL is fetchable by a third party without the user's session. OCR.space's URL input mode (its server fetching the image directly) is therefore valid.
- Q: How does the script obtain the image bytes for byte-based providers (EasyOCR), and what is "Retry OCR" for? → A: Read bytes by drawing the already-loaded same-origin captcha `<img>` to a `<canvas>` (no re-fetch). The portal has no in-page captcha-refresh control, so "Retry OCR" re-runs the provider chain on the *same* currently-shown image — its purpose is recovering from transient provider failures (network/rate-limit/timeout), not fetching a new challenge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Captcha is read and filled automatically (Priority: P1)

A student opens any page on `https://student.uit.edu.vn/*` that shows the signin
form. The script detects the captcha image, sends it to the configured OCR
service, and writes the recognized text into the captcha answer field. The
student types their username and password (and submits) themselves.

**Why this priority**: This is the entire reason the feature exists — removing the
manual step of reading and transcribing the distorted captcha image. Without it
there is no product.

**Independent Test**: Load a portal page containing the signin form with a captcha
image, do nothing else, and confirm the captcha answer field becomes populated
with the recognized text within a few seconds, while the username/password fields
and the submit button remain untouched.

**Acceptance Scenarios**:

1. **Given** a portal page showing the signin form with an unsolved captcha image,
   **When** the page finishes loading, **Then** the captcha answer field is filled
   with the text returned by the OCR service and the username, password, and
   submit controls are not modified.
2. **Given** the captcha answer field already contains text, **When** the script
   runs, **Then** it replaces the field contents with the freshly recognized text
   (so a stale or wrong value is corrected).
3. **Given** recognition failed due to a transient provider problem (network,
   rate-limit, or timeout), **When** the user clicks the "Retry OCR" control, **Then**
   the script re-runs the provider chain on the captcha image currently shown and fills
   the answer field if a provider now succeeds (the portal has no in-page captcha
   refresh, and the script does not automatically watch the image for changes between
   loads; a genuinely new challenge requires a full page reload).

---

### User Story 2 - Graceful fallback across OCR providers (Priority: P2)

When the primary OCR provider fails (error response, timeout, exhausted quota, or
unreadable result), the script automatically retries with the configured fallback
provider so the student still gets an answer without intervention.

**Why this priority**: Free OCR endpoints are rate-limited and occasionally
unavailable; a single-provider design would frequently leave the field empty.
Fallback materially raises the real-world success rate, but the feature is still
useful with one provider, so this ranks below P1.

**Independent Test**: Configure a primary provider guaranteed to fail (e.g., bad
key) and a working fallback, load the form, and confirm the answer field is filled
by the fallback and that a single clear status message reflects the recovery.

**Acceptance Scenarios**:

1. **Given** the primary provider returns an error or no usable text, **When**
   recognition runs, **Then** the script tries the next configured provider and
   fills the field if that one succeeds.
2. **Given** all configured providers fail, **When** the chain is exhausted,
   **Then** the field is left unchanged and the user is shown a clear, non-blocking
   error message and a "Retry OCR" control near the captcha (and the error is logged
   to the console).
3. **Given** only one provider is configured, **When** it fails, **Then** the
   script reports the failure gracefully without throwing into the host page.

---

### User Story 3 - Configure OCR providers and settings (Priority: P2)

A user configures which OCR provider is primary, which is the fallback, and the
credentials/keys and options each provider needs, through a dedicated configuration
page opened from the userscript-manager menu. The settings persist across page loads
and browser sessions.

**Why this priority**: Both named services require credentials (EasyOCR an access key,
OCR.space an API key), and users must supply their own keys and choose ordering. Without
persisted configuration the feature cannot reach a working provider — the default config
is empty and the portal shows the "open configuration" notice until a key is added.

**Independent Test**: Open the script's configuration, set a provider order and a
key, reload the page, and confirm the previously entered values are still present
and are the ones used for recognition.

**Acceptance Scenarios**:

1. **Given** the configuration UI/command, **When** the user sets provider order
   and per-provider keys/options and saves, **Then** the values are persisted via
   the userscript storage API and survive page reloads and browser restarts.
2. **Given** a provider requiring a key has none configured, **When** recognition
   would use it, **Then** the script skips it (or surfaces a clear "missing
   configuration" message) instead of sending an invalid request.
3. **Given** no configuration has ever been saved, **When** the script first runs,
   **Then** it shows the non-blocking "open configuration" notice beneath the captcha
   (the default config is empty, since every provider needs a key), directing the user
   to add a provider.

---

### Edge Cases

- **No signin form on the page**: The form does not appear on every subpath (e.g.,
  the user is already signed in, or the page has no login block). The script must
  detect this and do nothing beyond an informational console log — no errors, no UI.
- **Form present but no captcha image / no answer field**: Degrade gracefully; log
  and abort without throwing.
- **Captcha image not yet loaded or fails to load**: Wait for it to be available
  (within a bounded time) before attempting recognition; abort gracefully if it
  never loads.
- **OCR returns empty, whitespace, or obviously malformed text**: Treat as a
  failure for that provider and continue the fallback chain.
- **Recognized text contains extra characters/spaces/newlines**: Output is
  normalized to a single candidate suitable for the captcha field before filling.
- **Network blocked / cross-origin restrictions**: Requests must use the userscript
  host's privileged networking; a blocked request is reported as a provider failure,
  not a thrown exception.
- **Slow provider**: A per-request timeout bounds the wait and triggers fallback.
- **Multiple signin forms or repeated DOM injection**: The script must not fill the
  same challenge repeatedly in a tight loop or duplicate its status UI.
- **Page DOM/selectors change**: Missing or changed selectors degrade gracefully
  rather than throwing into the host page.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The script MUST run on pages under `https://student.uit.edu.vn/*`.
- **FR-002**: The script MUST detect the presence of the signin form and its captcha
  image and captcha answer field, and MUST proceed only when all are present.
- **FR-003**: When the signin form or captcha is absent, the script MUST take no
  visible action and MUST emit an informational console log explaining why (e.g.,
  "already signed in / no captcha on this page").
- **FR-004**: The script MUST obtain the captcha image from the signin form for
  submission to an OCR service.
- **FR-005**: The script MUST submit the captcha image to a configured primary OCR
  provider and obtain recognized text.
- **FR-006**: The script MUST support at least two interchangeable OCR providers and
  MUST support a configurable primary-then-fallback ordering.
- **FR-007**: On primary provider failure (error response, timeout, missing required
  config, or empty/unusable result), the script MUST automatically attempt the next
  configured provider exactly once. Each provider gets a single attempt per challenge
  (primary once, then fallback once); the script MUST NOT auto-retry the same provider.
- **FR-008**: The script MUST write the recognized text into the captcha answer
  field, replacing any existing value, in a way the host page accepts as user input.
- **FR-009**: The script MUST NOT fill the username or password fields, and MUST NOT
  submit the form or click the signin button under any circumstances.
- **FR-010**: The script MUST normalize recognized text into a single candidate before
  filling the field: strip whitespace and punctuation down to alphanumeric characters
  and, when the provider returns multiple text blocks, select the single longest
  alphanumeric token.
- **FR-011**: Configuration MUST be editable through a dedicated hosted configuration
  page, opened via a userscript-manager menu command registered by the script. The
  saved settings MUST be persisted via the userscript storage API (bridged from the
  page to the userscript) so they survive reloads and browser restarts and are the
  values used for recognition on the portal.
- **FR-012**: Configurable items MUST include, at minimum: provider selection and
  fallback order, per-provider credentials/keys, endpoint, and request timeout.
- **FR-013**: Each provider MUST declare its own required configuration and MUST be
  skipped (or reported as misconfigured) rather than called with invalid input.
- **FR-014**: Errors MUST propagate cleanly through the layers — provider/API error →
  orchestration state → user-visible surface — without uncaught exceptions reaching
  the host page.
- **FR-015**: User-visible status and errors MUST be shown near the signin/captcha
  area (and also logged to the console). On failure after the fallback chain is
  exhausted, the script MUST present a "Retry OCR" control that, when clicked,
  re-reads the captcha image currently shown and re-runs the provider chain. Success
  MAY be indicated subtly or silently.
- **FR-016**: The script MUST solve the captcha present at page load. It does NOT
  automatically watch the captcha image for later refreshes. The "Retry OCR" control
  (FR-015) re-runs the provider chain on the *same* currently-shown image — its purpose
  is recovering from transient provider failures, not fetching a new challenge; a
  genuinely new challenge comes only from a full page reload (the portal has no in-page
  captcha-refresh control).
- **FR-017**: The script MUST bound each recognition attempt with a timeout and MUST
  avoid repeatedly re-solving the same already-solved challenge in a loop.
- **FR-018**: The configuration MUST have sensible typed defaults and validation.
  Because every supported OCR backend requires a key (EasyOCR has no keyless endpoint;
  OCR.space requires an API key), the default config ships **no providers**; on first
  run the portal shows the "open configuration" notice (FR-021) rather than attempting a
  doomed request. The persisted config carries a schema `version`; on load, a config
  from a **newer** schema version is reset to defaults (and additive/compatible changes
  are migrated forward without data loss).
- **FR-019**: Adding a new OCR provider in the future MUST NOT require changing the
  orchestration or DOM-binding logic (provider implementations are interchangeable
  behind one contract).
- **FR-020**: The script MUST register a userscript-manager menu command that opens
  the hosted configuration page so users can reach their settings from any matched page.
- **FR-021**: When required provider configuration is missing or incomplete, the script
  MUST show a non-blocking notice beneath the captcha that directs the user to open the
  configuration page (via the menu command), rather than failing silently. With the
  empty default config this is the expected first-run state until the user adds a key.

### Key Entities *(include if feature involves data)*

- **Signin Form Context**: The detected login form on the page and references to its
  captcha image and captcha answer field. Ephemeral, per page load.
- **Captcha Challenge**: The image to be recognized and the recognized-text result,
  plus status (pending, solved, failed). One per displayed captcha.
- **OCR Provider**: A named, interchangeable recognition backend with its own
  configuration shape (endpoint, key/credentials, options) and a uniform
  "recognize image → text" behavior. Two are supported initially (EasyOCR and
  OCR.space — both key-based); ordering between them is user-configured.
- **Provider Configuration**: Persisted user settings — provider order, per-provider
  credentials/keys/endpoints, and timeout — with a schema `version`, typed defaults, and
  validation (forward-migrated on load; reset to defaults if from a newer version).
- **Recognition Result / Status**: The outcome surfaced to the user — recognized text
  on success, or a clear reason on failure after the fallback chain is exhausted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a portal page that shows the signin form with a captcha, the answer
  field is auto-filled with no user action other than loading the page.
- **SC-002**: When the primary provider fails but a fallback succeeds, the field is
  still filled, demonstrating automatic recovery within the same page visit.
- **SC-003**: When the signin form or captcha is absent, the script produces zero
  visible side effects and zero uncaught errors (only an informational console log).
- **SC-004**: Username, password, and submit controls are never altered or triggered
  by the script in any scenario.
- **SC-005**: Configuration set by the user persists across page reloads and browser
  restarts and is the configuration actually used for subsequent recognition.
- **SC-006**: When all providers fail, the user sees one clear, non-blocking error
  message and a working "Retry OCR" control near the captcha, and the page remains
  fully usable.
- **SC-007**: A recognition attempt completes or fails (and triggers fallback) within
  a bounded time so the user is never left waiting indefinitely.
- **SC-008**: For typical, legible portal captchas, the auto-filled text matches the
  challenge often enough to remove manual transcription as the common case.

## Assumptions

- **Captcha is image-based text** suited to OCR. The observed signin form on the live
  portal renders the captcha as a distorted-text PNG under
  `.../english_captcha/captcha_*.png` with a single adjacent answer input — the OCR
  output is typed into that one field.
- **The captcha image URL is public and stable** (confirmed), not session/cookie-bound,
  so a third-party OCR service may fetch it directly by URL. For byte-based providers the
  script obtains the image by drawing the already-loaded same-origin `<img>` to a
  `<canvas>` rather than issuing a second network request.
- **Two OCR services are targeted initially**, as named by the user (both require a key
  — verified 2026-06-12):
  - EasyOCR — `POST https://console.easyocr.org/api/ocr` (multipart `file`, header
    `X-Access-Key`; returns recognized `words`). There is **no keyless endpoint**
    (`api.easyocr.org` does not resolve).
  - OCR.space — `POST https://api.ocr.space/parse/image` (API key + base64/file/URL;
    returns `ParsedResults[].ParsedText`); free tier ~500 requests/day per IP, 1 MB
    image limit. **OCR engine 2** is the default — engine 1 returns empty on the
    portal's small distorted captchas.
  These specifics inform configuration shape; provider details belong to the plan.
- **No provider is enabled by default.** Both backends need a key, so the default config
  is empty and first-time users are directed to the configuration page (FR-021) to add a
  provider and its key before recognition runs.
- **Cross-origin requests** to the OCR services require the userscript host's
  privileged networking capability (not plain page `fetch`).
- **The script only auto-fills the captcha.** Auto-filling credentials and
  auto-submitting are explicitly out of scope (consistent with the project's safe-DOM
  principle).
- **The signin form appears on most, but not all, portal subpaths.** Absence is a
  normal, expected state to be handled silently, not an error.
- **The user supplies their own OCR API keys** where a provider requires them; no keys
  are bundled or committed.
- **Target environment** is a Tampermonkey/Violentmonkey-compatible userscript manager
  exposing menu commands and persistent storage. Configuration lives on a dedicated
  hosted page (a React SPA on GitHub Pages); the userscript also runs on that page and
  bridges saved settings into its storage, so the page and userscript stay in sync.
