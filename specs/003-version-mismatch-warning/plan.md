# Implementation Plan: Version Mismatch Warning

**Branch**: `003-version-mismatch-warning` | **Date**: 2026-06-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-version-mismatch-warning/spec.md`

## Summary

Extend the config-page ↔ userscript bridge so that the running userscript's version is
piggy-backed onto the existing `uoc:value` reply. The config page, which always carries its
expected version baked in at Vite build time, compares the two and renders a dismissible
warning banner when the userscript is outdated — linking to the GitHub releases download URL
(also baked in at build time). All configuration controls remain fully usable regardless of
version status.

## Technical Context

**Language/Version**: TypeScript 5.x under `strict` mode (all three packages)

**Primary Dependencies**: pnpm + Nx monorepo; `vite-plugin-monkey` (userscript build);
`@vitejs/plugin-react` (config page); Vitest + jsdom (tests); shadcn/ui + Tailwind v4
(config page); `@testing-library/react` (config page tests)

**Storage**: No new GM storage or localStorage. The version exchange is bridge-level
metadata only; `ProviderConfiguration` and `CONFIG_VERSION` are unchanged.

**Testing**: Vitest with jsdom environment; `nx run-many -t typecheck test build`

**Target Platform**: Tampermonkey/Violentmonkey-compatible userscript; React SPA on GitHub
Pages

**Project Type**: Nx monorepo — three packages:
- `uit-student-captcha-config-core` — shared bridge contract + schema
- `uit-student-captcha` — userscript (MVVM)
- `uit-student-captcha-config-page` — React SPA config editor

**Performance Goals**: No measurable impact. Comparing two short version strings and
rendering a conditional banner is negligible.

**Constraints**: Constitution I (MVVM layer boundaries); Constitution II (no resolver
changes); Constitution III (strict TS, zero errors); Constitution IV (configurable
behaviour, typed constants); Constitution V (no new dependencies, no new grants).

**Scale/Scope**: Six files changed across three packages + two new test cases + one new
component with its spec. No schema migration, no new dependencies, no resolver changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### Constitution I — MVVM layer boundaries ✅

The version exchange is entirely within the bridge layer (`ConfigBridge` on the userscript
side, `PostMessageClient` + `App.tsx` on the SPA side). The ViewModel and View (portal-
side) are untouched. No DOM manipulation changes.

### Constitution II — Provider abstraction ✅

No resolver code changes. No registry/factory changes. The new feature is a bridge-level
concern that is fully orthogonal to the resolver chain.

### Constitution III — Strict type safety ✅

`BridgeMessage`'s `uoc:value` union member gains `scriptVersion?: string` (explicitly typed
optional). `__SCRIPT_VERSION__`, `__PAGE_VERSION__`, and `__UPDATE_URL__` are declared as
`declare const` in their respective `vite-env.d.ts` files. `VersionWarningProps` is
explicitly typed. `pnpm exec nx run-many -t typecheck` must pass with zero errors.

### Constitution IV — Configurability ✅

Both build-time constants (`__PAGE_VERSION__`, `__UPDATE_URL__`) are resolved from
`package.json` and the Vite config at build time — not hardcoded in source. A new release
automatically carries the correct expected version without any source change.

### Constitution V — Minimal footprint ✅

No new runtime dependencies. No new `@grant` privileges. No new GM storage keys. The
semver comparison is a simple inline parse — no semver library added.

### Testing Discipline ✅

New unit tests required:
- `config-core`: `isBridgeMessage` continues to accept `uoc:value` with `scriptVersion`
  (existing guard test extended, or verified to pass as-is).
- `userscript`: `ConfigBridge` `uoc:get` reply includes `scriptVersion` (new assertion in
  `configBridge.spec.ts`).
- `config-page`: `VersionWarning` component renders banner, update link, dismiss (new
  `VersionWarning.spec.tsx`).
- `config-page`: `App` shows banner on mismatch, no banner on match, no banner when
  disconnected (new cases in `App.spec.tsx`).

## Project Structure

### Documentation (this feature)

```text
specs/003-version-mismatch-warning/
├── plan.md              # This file
├── research.md          # Research decisions (7 decisions)
├── data-model.md        # Entities, constants, state, component props
├── quickstart.md        # Validation scenarios
├── contracts/
│   └── version-bridge.contract.md   # Bridge extension + build-time constants
└── checklists/
    └── requirements.md
```

### Source Code (affected files)

```text
packages/uit-student-captcha-config-core/
├── src/
│   ├── bridge.ts                    ← add scriptVersion? to uoc:value union member
│   └── index.ts                     ← no change (BridgeMessage already re-exported)

packages/uit-student-captcha/
├── vite.config.ts                   ← add define: { __SCRIPT_VERSION__ }
├── src/
│   ├── vite-env.d.ts                ← declare const __SCRIPT_VERSION__: string
│   └── bridge/
│       ├── configBridge.ts          ← include scriptVersion: __SCRIPT_VERSION__ in uoc:value reply
│       └── configBridge.spec.ts     ← assert uoc:value reply includes scriptVersion

packages/uit-student-captcha-config-page/
├── vite.config.ts                   ← add define: { __PAGE_VERSION__, __UPDATE_URL__ }; import pkg
├── src/
│   ├── vite-env.d.ts                ← declare const __PAGE_VERSION__, __UPDATE_URL__: string
│   ├── App.tsx                      ← track scriptVersion state; compute versionStatus; render <VersionWarning>
│   ├── App.spec.tsx                 ← extend FakeClient; add mismatch/match/disconnected test cases
│   └── components/
│       ├── VersionWarning.tsx       ← new: dismissible banner component
│       └── VersionWarning.spec.tsx  ← new: unit tests for the banner
```

**Structure Decision**: Three-package Nx monorepo, existing structure. No new packages.
Changes are contained to the bridge layer and the config page's UI shell — MVVM boundaries
are preserved.

## Complexity Tracking

> No Constitution violations — table omitted per template instructions.

## Phase 0: Research

*Complete — see `research.md` for all 7 decisions.*

Key resolutions:
- Version baked in via Vite `define` (not `GM_info`, not env vars) — Decision 1 & 2
- `uoc:value` enriched with `scriptVersion?` (not new message types) — Decision 3
- Inline semver parse, no library — Decision 4
- Session-only React state for dismissal — Decision 5
- "newer script" → silent/no-op — Decision 6
- shadcn/ui `Alert` for the banner — Decision 7

## Phase 1: Design & Contracts

*Complete — see `data-model.md`, `contracts/version-bridge.contract.md`, `quickstart.md`.*

### Implementation steps (ordered by dependency)

**Step 1 — Config core: extend bridge type** (`config-core/src/bridge.ts`)

Change `uoc:value` union member:
```typescript
// before
| { readonly type: "uoc:value"; readonly payload: ProviderConfiguration }
// after
| { readonly type: "uoc:value"; readonly payload: ProviderConfiguration; readonly scriptVersion?: string }
```

`isBridgeMessage` type guard logic is unchanged (tests only check `type`). Run existing
tests to confirm no regression.

**Step 2 — Userscript: inject and transmit version** (`userscript/vite.config.ts`, `vite-env.d.ts`, `configBridge.ts`)

2a. In `vite.config.ts`, add to the returned config object:
```typescript
define: { __SCRIPT_VERSION__: JSON.stringify(version) }
```
(`version` is already declared in that file from `pkg.version`.)

2b. In `src/vite-env.d.ts`, add:
```typescript
declare const __SCRIPT_VERSION__: string;
```

2c. In `configBridge.ts`, change the `uoc:get` handler's reply:
```typescript
// before
this.reply({ type: "uoc:value", payload: this.loadConfig() });
// after
this.reply({ type: "uoc:value", payload: this.loadConfig(), scriptVersion: __SCRIPT_VERSION__ });
```

**Step 3 — Userscript test: assert scriptVersion in reply** (`configBridge.spec.ts`)

In the existing `"answers uoc:get with the stored configuration"` test (or as a new
assertion), confirm `postMessage` was called with an object containing `scriptVersion`.
The test environment needs `__SCRIPT_VERSION__` available — add it to the Vitest global
defines in `vitest.config.ts` (e.g., `define: { __SCRIPT_VERSION__: '"test-version"' }`).

**Step 4 — Config page: bake in constants** (`config-page/vite.config.ts`, `vite-env.d.ts`)

4a. In `vite.config.ts`, import root `package.json` and define constants:
```typescript
import pkg from "../../package.json" with { type: "json" };
const pageVersion = (pkg as { version?: string }).version ?? "0.0.0";
const updateUrl = "https://github.com/KevinNitroG/uit-student-captcha/releases/latest/download/uit-student-captcha.user.js";
// inside defineConfig return:
define: {
  __PAGE_VERSION__: JSON.stringify(pageVersion),
  __UPDATE_URL__: JSON.stringify(updateUrl),
}
```

4b. In `src/vite-env.d.ts`, add:
```typescript
declare const __PAGE_VERSION__: string;
declare const __UPDATE_URL__: string;
```

**Step 5 — Config page: VersionWarning component** (`components/VersionWarning.tsx`)

New component. Props: `{ scriptVersion: string; pageVersion: string; updateUrl: string }`.
Owns `dismissed` boolean state. When not dismissed, renders the shadcn/ui `Alert` with:
- Warning text including `scriptVersion` and `pageVersion`
- An `<a href={updateUrl} target="_blank" rel="noreferrer">` update link
- A dismiss button (sets `dismissed = true`)

**Step 6 — Config page: VersionWarning tests** (`components/VersionWarning.spec.tsx`)

Three test cases:
1. Renders the banner with both version strings visible.
2. Clicking dismiss hides the banner.
3. Re-rendering (unmount + remount) brings the banner back (no persistence).

**Step 7 — Config page: App integration** (`App.tsx`)

7a. Add state: `const [scriptVersion, setScriptVersion] = useState<string | undefined>(undefined);`

7b. In the `uoc:value` handler, extract `scriptVersion`:
```typescript
setScriptVersion(message.scriptVersion);
```

7c. Compute `versionStatus` as a derived value (inline function or `useMemo`).

7d. Render `<VersionWarning>` conditionally above `<GlobalSettings>`:
```typescript
{versionStatus === "outdated" && scriptVersion && (
  <VersionWarning
    scriptVersion={scriptVersion}
    pageVersion={__PAGE_VERSION__}
    updateUrl={__UPDATE_URL__}
  />
)}
```

**Step 8 — Config page: App.spec.tsx updates**

8a. Extend `FakeClient.requestConfig()` to accept an optional `scriptVersion` on the
`uoc:value` it fires:
```typescript
this.listener?.({ type: "uoc:value", payload: this.initial, scriptVersion: this.scriptVersion });
```

8b. Add test cases:
- Mismatch (`scriptVersion: "1.0.0"`, page version `"1.2.0"` or later): warning banner visible.
- Match (`scriptVersion === __PAGE_VERSION__`): no warning banner.
- No reply (disconnected): no warning banner, existing not-connected notice shown.

(The `__PAGE_VERSION__` and `__UPDATE_URL__` globals need to be declared in `vitest.config.ts`'s `define` for the config-page test environment.)

**Step 9 — Config page: vitest.config.ts define**

Add to `vitest.config.ts` in `uit-student-captcha-config-page`:
```typescript
define: {
  __PAGE_VERSION__: '"test-version"',
  __UPDATE_URL__: '"https://example.com/update"',
}
```

(And for the userscript's `vitest.config.ts`: `__SCRIPT_VERSION__: '"test-version"'`.)
