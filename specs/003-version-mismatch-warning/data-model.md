# Data Model: Version Mismatch Warning

**Feature**: `003-version-mismatch-warning` | **Date**: 2026-06-14

---

## §1 — New Constants (baked in at Vite build time)

| Constant | Package | Source | Type |
|----------|---------|--------|------|
| `__SCRIPT_VERSION__` | `uit-student-captcha` | `vite.config.ts` `define` from `pkg.version` | `string` |
| `__PAGE_VERSION__` | `uit-student-captcha-config-page` | `vite.config.ts` `define` from root `package.json` | `string` |
| `__UPDATE_URL__` | `uit-student-captcha-config-page` | `vite.config.ts` `define` — the GitHub releases download URL | `string` |

These are compile-time constants injected by Vite's `define`. They are not stored in GM storage or any persisted config and do not appear in `ProviderConfiguration`.

---

## §2 — Bridge Contract Extension

### Extended `uoc:value` message

The existing `uoc:value` message gains one optional field:

```
Before:
  { type: "uoc:value"; payload: ProviderConfiguration }

After:
  { type: "uoc:value"; payload: ProviderConfiguration; scriptVersion?: string }
```

**Field**: `scriptVersion?: string`
- Present only when the userscript bundle includes `__SCRIPT_VERSION__` (i.e., all userscript versions built after this feature ships).
- Absent in older userscript builds → `undefined` in the SPA → `VersionStatus = "unknown"`.
- Value: a standard semver string, e.g., `"1.3.0"`.

No other bridge messages are changed.

---

## §3 — Version Status Enum

Computed client-side by the config page after receiving `uoc:value`:

| Status | Condition | UI effect |
|--------|-----------|-----------|
| `"match"` | `scriptVersion === __PAGE_VERSION__` | No banner |
| `"outdated"` | `scriptVersion` present AND `parse(scriptVersion) < parse(__PAGE_VERSION__)` | Warning banner shown |
| `"newer"` | `scriptVersion` present AND `parse(scriptVersion) > parse(__PAGE_VERSION__)` | No banner (silent) |
| `"unknown"` | `scriptVersion` absent or not a parseable semver | No banner (safe fallback) |

`parse` extracts `[major, minor, patch]` integers from a `"M.N.P"` string. Comparison is lexicographic over the tuple.

---

## §4 — React State (config page App)

New state added to `App.tsx` (no new GM storage or config fields):

| State variable | Type | Initial value | Description |
|----------------|------|---------------|-------------|
| `scriptVersion` | `string \| undefined` | `undefined` | The version string received from `uoc:value`. Set on each bridge connection. |

`versionStatus` is derived (not stored state): computed from `scriptVersion` and `__PAGE_VERSION__` on each render.

`dismissed` lives **inside `VersionWarning`** as local component state, reset to `false` whenever `scriptVersion` changes (i.e., a fresh connection resets the dismissal).

---

## §5 — `VersionWarning` Component Props

```
interface VersionWarningProps {
  scriptVersion: string;         // The outdated version the userscript reported
  pageVersion: string;           // The version the config page was built for (__PAGE_VERSION__)
  updateUrl: string;             // The install/update link (__UPDATE_URL__)
}
```

The parent (`App.tsx`) only renders `<VersionWarning>` when `versionStatus === "outdated"`. The component owns its own `dismissed` state.

---

## §6 — No `ProviderConfiguration` Changes

This feature does NOT modify `ProviderConfiguration`, `CONFIG_VERSION`, or `validateConfig()`. The version exchange is bridge-level metadata, not user-configurable data.
