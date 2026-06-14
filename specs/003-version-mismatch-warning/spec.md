# Feature Specification: Version Mismatch Warning

**Feature Branch**: `003-version-mismatch-warning`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "I want the config page to be able to aware of the user script's version it connected to. Because the config page deployed always work for latest version of userscript, so if user are in old one, need to notify him and update via the download/update link (remember it is bundled time with vite). if version mismatch, warn him, but still let he config via config page. Remember version can be taken from the package.json, or you can tweak it with vite at bundle time"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Version Mismatch Warning (Priority: P1)

A student has installed the userscript months ago and has not updated it. They open the config page (which is always at the latest version). The config page detects that the running userscript is older than the version it was built against, displays a visible warning banner, and provides a direct link to install/update the userscript — but still allows the student to configure their settings normally.

**Why this priority**: This is the core deliverable. Without it, students silently use a mismatched combination and encounter confusing failures when new config options are not recognized by the old script.

**Independent Test**: Open the config page while the userscript reports a lower version than the page's baked-in version. The warning banner must appear with the update link. Settings must still be editable and saveable.

**Acceptance Scenarios**:

1. **Given** the config page's embedded version is `1.3.0` and the connected userscript reports `1.2.0`, **When** the config page loads and connects to the userscript, **Then** a dismissible warning banner appears stating the userscript is outdated and includes a link to download/install the latest version.
2. **Given** a version mismatch warning is shown, **When** the user interacts with any configuration control, **Then** all settings controls remain fully functional (no fields are disabled or locked out).
3. **Given** a version mismatch warning is shown, **When** the user clicks the update link, **Then** they are taken to the userscript's install/update URL (the Greasy Fork or GitHub raw script URL, baked in at build time).

---

### User Story 2 - Version Match (No Warning) (Priority: P2)

A student who runs the same version as the deployed config page opens the page. No warning or distraction appears — the UI is identical to the pre-feature experience.

**Why this priority**: False positives erode trust. When versions match, the page must remain clean and unchanged to avoid unnecessary user concern.

**Independent Test**: Open the config page while the userscript reports the same version as the page's baked-in version. No warning or version-related UI element must appear.

**Acceptance Scenarios**:

1. **Given** the config page version and connected userscript version are identical, **When** the page loads and connects, **Then** no version warning or indicator is shown.
2. **Given** the versions match, **When** the user configures settings, **Then** the experience is identical to the current (pre-feature) baseline.

---

### User Story 3 - No Userscript Connected (Priority: P3)

A student visits the config page directly in a browser without the userscript active (e.g., on a different device or browser). The config page cannot obtain a version from the bridge. This state is already handled by the existing "bridge not connected" flow; the version feature must not break or conflict with it.

**Why this priority**: Graceful degradation matters but is secondary — the bridge-not-connected case is already managed by the existing UI; version awareness must simply not regress it.

**Independent Test**: Open the config page in a browser with no active userscript. The version warning must NOT appear (no false mismatch). The existing not-connected UI must still render correctly.

**Acceptance Scenarios**:

1. **Given** no userscript is connected, **When** the page loads, **Then** no version warning appears (the existing not-connected state is shown instead).

---

### Edge Cases

- What happens if the userscript reports a **newer** version than the config page knows about (a downgraded deployment scenario)? The system should treat this gracefully — either show no warning or a distinct notice — without breaking configuration.
- What happens if the version string received from the userscript is malformed or absent? The page must fall back to the not-connected or unknown-version state without throwing an error.
- What if the user dismisses the warning and then reloads the page? The warning should reappear on each fresh page load (no permanent dismissal stored in config — this is not a user preference).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The config page MUST embed the current release version at build time, derived from `package.json` (the same version used for the userscript header and Nx Release tags).
- **FR-002**: The config page MUST embed the userscript's install/update URL at build time (e.g., the Greasy Fork or GitHub raw script URL), so the update link never requires a code change for a new release.
- **FR-003**: The userscript MUST report its own version to the config page over the existing bridge channel when the connection is established or when the config page requests it.
- **FR-004**: The bridge contract MUST be extended with a version-exchange mechanism (new message type or an enriched existing response) so the config page can receive the userscript's running version.
- **FR-005**: The config page MUST compare the received userscript version against its baked-in expected version and classify the result as: match, mismatch (userscript older), unknown (no version received), or newer (userscript ahead).
- **FR-006**: When a version mismatch is detected (userscript older than page), the config page MUST display a visible warning notice that includes: the detected userscript version, the expected version, and a clickable link to the update URL.
- **FR-007**: The warning notice MUST be dismissible within the current page session (the user can hide it to reduce distraction).
- **FR-008**: A version mismatch MUST NOT disable, lock, or hide any configuration controls — the user retains full access to all settings.
- **FR-009**: When versions match, the config page MUST display no version-related UI element.
- **FR-010**: When no userscript is connected, the version feature MUST NOT produce a false-mismatch warning; the existing not-connected behavior is unchanged.

### Key Entities

- **PageVersion**: The version string baked into the config page bundle at build time. Derived from the monorepo root `package.json`. Authoritative for "what the page expects."
- **ScriptVersion**: The version string the connected userscript reports at runtime via the bridge. Authoritative for "what the user is running."
- **VersionStatus**: The comparison result — one of `match`, `outdated`, `newer`, `unknown`. Drives the UI state.
- **UpdateURL**: The userscript install/update link baked into the config page bundle at build time. Does not change at runtime.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A student running an outdated userscript sees a warning notice within 3 seconds of the config page finishing its initial bridge handshake.
- **SC-002**: 100% of configuration controls (provider selection, API key, all toggles) remain usable when a version warning is shown — no functional regression.
- **SC-003**: A student running the current userscript sees zero version-related UI elements — the page is visually and functionally identical to the pre-feature baseline.
- **SC-004**: The update link in the warning banner is always correct and up-to-date without manual code changes on each release (it is resolved at build time).
- **SC-005**: When no userscript is connected, the existing not-connected experience is unchanged — no new UI element appears and no console error related to the version feature is thrown.

## Assumptions

- The monorepo uses a single fixed release group where both packages share the same version string (`package.json` at the workspace root is the source of truth), so comparing the page's baked-in version to the userscript's self-reported version is a valid equivalence check.
- The userscript's version is already embedded in its Tampermonkey/Violentmonkey header (`@version`) at build time via `vite-plugin-monkey`; the same value is accessible at runtime within the script (e.g., via `GM_info.script.version` or an equivalent constant injected by Vite's `define`).
- The update URL (Greasy Fork or GitHub raw) is stable and known at build time; it does not change between patch releases, only between major install flows.
- Semantic versioning is used for all versions. "Mismatch" means the userscript's version is strictly less than the page's version using semver ordering.
- A userscript version that is *newer* than the page version (e.g., if an older config-page build is somehow accessed) is treated as an informational edge case; the primary warning targets the outdated-userscript scenario.
- The warning is session-only: no new config field or GM storage entry is introduced to persist dismissal state — this keeps the schema clean and avoids migration complexity.
- The existing bridge handshake timeout/not-connected handling in the config page is out of scope for this feature; this feature layers on top of a successful connection.
