# Research: Version Mismatch Warning

**Feature**: `003-version-mismatch-warning` | **Date**: 2026-06-14

## Decision 1 — How the userscript exposes its runtime version

**Decision**: Inject `__SCRIPT_VERSION__` as a Vite `define` constant in the userscript's `vite.config.ts`, reading from `pkg.version` (already imported there for the `@version` header). The constant is accessible anywhere in the userscript bundle at runtime.

**Rationale**: `vite.config.ts` already imports `pkg` and reads `pkg.version` for the `@version` header. Adding `define: { __SCRIPT_VERSION__: JSON.stringify(version) }` is zero-cost and exactly mirrors the existing pattern used to inline `VITE_*` env vars. The alternative — reading `GM_info.script.version` — works at runtime but is not importable in test environments (jsdom/Vitest don't emulate `GM_info`), requiring an extra platform shim just for one string. The `define` approach gives the value directly, requires no new GM grant, and is fully testable.

**Alternatives considered**:
- `GM_info.script.version`: works at runtime but requires a new mock in the test harness for every test that touches the bridge. Rejected.
- Reading from the `@version` comment at runtime: fragile string-parsing of the script header. Rejected.

## Decision 2 — How the config page gets its expected version and the update URL

**Decision**: Add `define` entries to the config page's `vite.config.ts`: `__PAGE_VERSION__` from the root/local `package.json` version (consistent with Decision 1), and `__UPDATE_URL__` from the same constant already used for `downloadURL` in the userscript header (`"https://github.com/KevinNitroG/uit-student-captcha/releases/latest/download/uit-student-captcha.user.js"`).

**Rationale**: Same pattern as the userscript. The config page's `vite.config.ts` currently doesn't read `package.json`, but adding `import pkg from "../../package.json" with { type: "json" }` (pointing to the workspace root) follows the same approach already in the userscript. This bakes both constants at build time, so every deployed config page build always carries the correct expected version and update URL with no runtime indirection.

**Alternatives considered**:
- Reading from a `VITE_*` env var at bundle time: works but requires CI to pass the version explicitly, adding brittleness. Rejected.
- Fetching the latest version from the GitHub API at runtime: introduces a network dependency and async complexity for a value known at build time. Rejected.

## Decision 3 — Bridge extension: enrich `uoc:value` vs. new message pair

**Decision**: Enrich the existing `uoc:value` message with an optional `scriptVersion?: string` field rather than introducing new `uoc:version-request` / `uoc:version` message types.

**Rationale**: The first thing the SPA does on connecting is send `uoc:get` and receive `uoc:value`. Piggybacking the script version on that reply costs zero extra round-trips. The field is optional (`?`), so existing old userscripts that don't set it produce `scriptVersion: undefined`, which maps to `"unknown"` version status — the safe fallback (no spurious warning). A separate request/response pair would add a round-trip and two new message types for the same information flow.

**Alternatives considered**:
- `uoc:version-request` / `uoc:version` pair: more explicit but a redundant round-trip. Rejected.
- Embedding version in all bridge messages: too noisy; version only matters at connection time. Rejected.

## Decision 4 — Semver comparison strategy

**Decision**: Parse major/minor/patch from the version strings manually (`.split(".")` → `parseInt`) for the three-part comparison. No semver library dependency added.

**Rationale**: The monorepo uses a single version string with a standard `MAJOR.MINOR.PATCH` format (driven by Nx Release / Conventional Commits). A lightweight parse-and-compare handles all cases without a new runtime dependency. Constitution V (minimal footprint) explicitly discourages adding dependencies. Edge case: pre-release suffixes (`1.3.0-alpha.1`) are out of scope; the GA version is always clean semver.

**Alternatives considered**:
- `compare-versions` npm package: overkill for a simple 3-part comparison. Rejected.
- Strict equality only: would miss the "newer script than page" informational case and can't distinguish "outdated" from "newer" for the two different UX states. Rejected.

## Decision 5 — Warning dismissal storage

**Decision**: Session-only React state (`dismissed: boolean`) initialized to `false`. No GM storage field, no `localStorage`, no new config key.

**Rationale**: The spec explicitly calls this out as a design constraint. Persisting dismissal would require a schema migration and a new config field for a transient user preference that has no value after the script is updated. The warning should reappear on each fresh page load so users who haven't yet updated see the reminder persistently.

**Alternatives considered**:
- `localStorage` keyed by version string: survives reloads but risks users permanently hiding valid warnings if they never update. Rejected.
- New GM storage key: adds schema complexity for a non-config preference. Rejected.

## Decision 6 — Handling "newer script than page"

**Decision**: Treat `scriptVersion > pageVersion` (script is ahead of page, e.g., user installed a pre-release or the GitHub Pages build is lagging) as a silent/no-op state — no warning. The spec says "treat this gracefully" and the primary user-visible case is the outdated-userscript scenario.

**Rationale**: A deployed GitHub Pages build will always be built from the same commit as the released userscript in normal CI flow. A "newer" script can only happen in abnormal circumstances (dev build, early release, stale CDN cache). Showing a warning in this case would confuse the user. Showing nothing is the safest path.

**Alternatives considered**:
- An informational notice (non-warning) for the "newer" case: adds complexity for a rare edge case. Rejected.

## Decision 7 — UI component approach for the warning banner

**Decision**: A new `VersionWarning.tsx` component using the existing shadcn/ui `Alert` component (already available in the project) with a yellow/warning visual treatment. The component is rendered in `App.tsx` above the settings form when `versionStatus === "outdated"` and not dismissed.

**Rationale**: The config page already uses shadcn/ui components. The `Alert` component covers the banner-style warning pattern without new dependencies. Placing it in a dedicated component keeps `App.tsx` lean and makes the banner independently unit-testable.

**Alternatives considered**:
- Inline in `App.tsx`: couples the warning logic to the app shell. Rejected.
- A modal/dialog: too intrusive — the spec says configuration must remain fully accessible. Rejected.
