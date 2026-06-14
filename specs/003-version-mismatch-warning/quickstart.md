# Quickstart: Validate Version Mismatch Warning

**Feature**: `003-version-mismatch-warning` | **Date**: 2026-06-14

---

## Prerequisites

- pnpm + Nx workspace set up: `pnpm install`
- All packages typecheck cleanly: `pnpm exec nx run-many -t typecheck`

---

## Scenario 1 — Version mismatch warning appears (outdated userscript)

**Goal**: Confirm the warning banner renders when the userscript reports an older version.

### Unit test (config page)

```bash
pnpm exec nx run uit-student-captcha-config-page:test
```

In `App.spec.tsx`, the `FakeClient` will be extended to accept `scriptVersion` in
`requestConfig()`. A test case supplies `scriptVersion: "1.0.0"` while `__PAGE_VERSION__`
is the current build version (e.g., `"1.2.0"` or later). The test asserts:

- An element matching `/outdated|update/i` (or similar) appears in the DOM.
- All configuration controls remain enabled/interactive.
- The update link `href` matches `__UPDATE_URL__`.

### Manual browser validation

1. Build the config page: `pnpm exec nx build uit-student-captcha-config-page`
2. Build the userscript: `pnpm exec nx build uit-student-captcha`
3. Install the built userscript in Tampermonkey and navigate to
   `https://kevinnitrog.github.io/uit-student-captcha/configure.html` (or the local dev
   server if testing locally).
4. To simulate an old userscript, temporarily change `__SCRIPT_VERSION__` in the userscript
   source to a lower version (e.g., `"0.9.0"`) before building.
5. **Expected**: A warning banner appears above the settings form stating the script is
   outdated, with an update link. All settings controls are functional.

---

## Scenario 2 — No warning when versions match

**Goal**: Confirm the happy path shows no banner.

### Unit test

In `App.spec.tsx`, supply `scriptVersion` equal to `__PAGE_VERSION__`. Assert no warning
element is present and the connected indicator shows normally.

### Manual browser validation

Install the userscript built from the same commit as the config page. Navigate to the config
page. **Expected**: No version warning. UI matches the pre-feature baseline.

---

## Scenario 3 — No warning when userscript not connected

**Goal**: Confirm the existing not-connected state is unchanged.

### Unit test

In `App.spec.tsx`, use a `FakeClient` that never replies (simulating no userscript). Assert
no version warning element appears (the existing "not detected" notice shows instead).

---

## Scenario 4 — Dismiss hides the banner within the session

**Goal**: Confirm dismissal works and does not persist.

### Unit test

In `VersionWarning.spec.tsx`, render the component with mismatch props. Click the dismiss
control. Assert the banner is no longer visible. Unmount and re-render. Assert the banner is
visible again (dismissal does not persist).

---

## Full CI gate

```bash
pnpm exec nx run-many -t typecheck test build
```

All three targets must pass across all three packages before the feature is considered done.
See `contracts/version-bridge.contract.md` §E for the build-time constants that must be
present in both Vite configs.
