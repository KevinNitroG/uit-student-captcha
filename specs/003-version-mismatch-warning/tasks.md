# Tasks: Version Mismatch Warning

**Input**: Design documents from `specs/003-version-mismatch-warning/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Organization**: Tasks are grouped by phase and user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1/US2/US3)
- Exact file paths are included in every description

---

## Phase 1: Foundational — Bridge Type Extension

**Purpose**: Extend the shared bridge contract in `config-core`. This is the single blocking prerequisite — all other tasks depend on the updated TypeScript type.

**⚠️ CRITICAL**: No user-story work can begin until T001 is complete (it changes the shared type that both the userscript and config page compile against).

- [x] T001 Extend `uoc:value` union member in `packages/uit-student-captcha-config-core/src/bridge.ts` to add `readonly scriptVersion?: string` — update `isBridgeMessage` acceptance check in the same file if the guard logic needs updating (it should not, since the guard only checks `type`), then run `pnpm exec nx run uit-student-captcha-config-core:typecheck` to confirm zero errors

**Checkpoint**: `config-core` typechecks cleanly — userscript and config-page work can now proceed in parallel.

---

## Phase 2: User Story 1 — Version Mismatch Warning (Priority: P1) 🎯 MVP

**Goal**: When the connected userscript reports an older version than the config page was built for, a dismissible warning banner appears with an update link. All configuration controls remain fully usable.

**Independent Test**: Open the config page with a userscript that sends `scriptVersion: "1.0.0"` while `__PAGE_VERSION__` is `"1.2.0"` or later. The warning banner must appear with the update link. All settings must be editable and saveable. (See `quickstart.md` Scenario 1.)

### Userscript package tasks

- [x] T002 [P] [US1] Add `define: { __SCRIPT_VERSION__: JSON.stringify(version) }` to the returned config object in `packages/uit-student-captcha/vite.config.ts` (`version` is already declared in that file)
- [x] T003 [P] [US1] Declare `declare const __SCRIPT_VERSION__: string;` in `packages/uit-student-captcha/src/vite-env.d.ts`
- [x] T004 [P] [US1] Add `define: { __SCRIPT_VERSION__: '"test-version"' }` to the `defineConfig` call in `packages/uit-student-captcha/vitest.config.ts` so the constant is available in Vitest's jsdom environment
- [x] T005 [US1] In `packages/uit-student-captcha/src/bridge/configBridge.ts`, change the `uoc:get` handler reply from `{ type: "uoc:value", payload: this.loadConfig() }` to `{ type: "uoc:value", payload: this.loadConfig(), scriptVersion: __SCRIPT_VERSION__ }` (depends on T001, T002, T003)
- [x] T006 [US1] In `packages/uit-student-captcha/src/bridge/configBridge.spec.ts`, extend the existing `"answers uoc:get with the stored configuration"` test to also assert that `postMessage` was called with an object containing `scriptVersion: "test-version"` (depends on T004, T005)

### Config page package tasks

- [x] T007 [P] [US1] In `packages/uit-student-captcha-config-page/vite.config.ts`: import the root `package.json` with `import pkg from "../../package.json" with { type: "json" }`, declare `const pageVersion = (pkg as { version?: string }).version ?? "0.0.0"` and `const updateUrl = "https://github.com/KevinNitroG/uit-student-captcha/releases/latest/download/uit-student-captcha.user.js"`, then add `define: { __PAGE_VERSION__: JSON.stringify(pageVersion), __UPDATE_URL__: JSON.stringify(updateUrl) }` to the returned config object
- [x] T008 [P] [US1] Add `declare const __PAGE_VERSION__: string;` and `declare const __UPDATE_URL__: string;` to `packages/uit-student-captcha-config-page/src/vite-env.d.ts`
- [x] T009 [P] [US1] Add `define: { __PAGE_VERSION__: '"test-version"', __UPDATE_URL__: '"https://example.com/update"' }` to the `defineConfig` call in `packages/uit-student-captcha-config-page/vitest.config.ts` so the constants are available in Vitest's jsdom environment (depends on T008)
- [x] T010 [US1] Create `packages/uit-student-captcha-config-page/src/components/VersionWarning.tsx`: a React component accepting `{ scriptVersion: string; pageVersion: string; updateUrl: string }` props that owns a `dismissed` boolean state (default `false`); when not dismissed, renders a shadcn/ui `Alert` containing the two version strings, an `<a href={updateUrl} target="_blank" rel="noreferrer">` update link, and a dismiss button that sets `dismissed = true` (depends on T008)
- [x] T011 [US1] Create `packages/uit-student-captcha-config-page/src/components/VersionWarning.spec.tsx` with three test cases: (1) banner renders with both version strings and update link visible, (2) clicking dismiss hides the banner, (3) unmounting and remounting the component shows the banner again — confirming no persistence (depends on T009, T010)
- [x] T012 [US1] In `packages/uit-student-captcha-config-page/src/App.tsx`: add `const [scriptVersion, setScriptVersion] = useState<string | undefined>(undefined)`; in the `uoc:value` handler branch add `setScriptVersion(message.scriptVersion)`; add an inline `compareVersions` helper that returns `"match" | "outdated" | "newer" | "unknown"` (parse `M.N.P` integers, compare tuples); render `{versionStatus === "outdated" && scriptVersion && <VersionWarning scriptVersion={scriptVersion} pageVersion={__PAGE_VERSION__} updateUrl={__UPDATE_URL__} />}` above `<GlobalSettings>` (depends on T001, T007, T008, T010)
- [x] T013 [US1] In `packages/uit-student-captcha-config-page/src/App.spec.tsx`: extend `FakeClient` to accept an optional `scriptVersion` constructor arg and include it in the `uoc:value` message fired by `requestConfig()`; add three new test cases — (a) mismatch (`scriptVersion: "1.0.0"`): warning element visible; (b) match (`scriptVersion: "test-version"`): no warning element; (c) disconnected (no reply): no warning element (depends on T009, T012)

**Checkpoint**: US1 fully implemented. Run `pnpm exec nx run-many -t typecheck test` across all packages — all tests must pass. Open the config page in a browser with an old-versioned userscript to verify the banner appears and settings remain usable.

---

## Phase 3: User Story 2 & 3 — Validation (Priority: P2 / P3)

**Goal**: Confirm no false-positive warnings when versions match (US2) or when the userscript is not connected (US3).

**Note**: US2 and US3 require no additional implementation — the same code path handles them. T013's test cases (b) and (c) already cover these stories. This phase is a validation checkpoint only.

**Independent Tests**:
- US2: In `App.spec.tsx`, the "match" test case (part of T013) asserts no banner. Manual: install the current userscript alongside the current config page build — no banner should appear.
- US3: In `App.spec.tsx`, the "disconnected" test case (part of T013) asserts no banner. Manual: open the config page without the userscript active — existing not-connected UI unchanged.

**Checkpoint**: `pnpm exec nx run uit-student-captcha-config-page:test` passes all existing tests plus the three new cases from T013. The pre-feature UI baseline is preserved.

---

## Phase 4: Polish & CI Gate

**Purpose**: Final verification across all packages.

- [x] T014 [P] Run the full CI gate `pnpm exec nx run-many -t typecheck test build` across all three packages and confirm zero TypeScript errors, all tests green, and all three builds succeed
- [ ] T015 [P] Manually run `quickstart.md` Scenarios 1–4 to validate the warning banner, version-match baseline, disconnected fallback, and dismiss behaviour in a real browser session

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately with T001
- **Phase 2 (US1)**: Depends on T001 completion
  - Userscript tasks T002–T004 can start immediately after T001 (parallel)
  - Config page tasks T007–T009 can start immediately after T001 (parallel with T002–T004)
  - T005 depends on T001 + T002 + T003
  - T006 depends on T004 + T005
  - T010 depends on T008
  - T011 depends on T009 + T010
  - T012 depends on T001 + T007 + T008 + T010
  - T013 depends on T009 + T012
- **Phase 3 (Validation)**: Covered by T013; no new tasks
- **Phase 4 (Polish)**: Depends on all Phase 2 tasks complete

### User Story Dependencies

- **US1 (P1)**: Can start after T001 — no dependencies on US2/US3
- **US2 (P2)**: Covered by US1 implementation; test case in T013
- **US3 (P3)**: Covered by US1 implementation; test case in T013

---

## Parallel Example: Phase 2 (US1)

```bash
# After T001 completes, launch all of these in parallel:

# Userscript package:
Task T002: "Add __SCRIPT_VERSION__ define to packages/uit-student-captcha/vite.config.ts"
Task T003: "Declare __SCRIPT_VERSION__ in packages/uit-student-captcha/src/vite-env.d.ts"
Task T004: "Add __SCRIPT_VERSION__ define to packages/uit-student-captcha/vitest.config.ts"

# Config page package (parallel with userscript tasks above):
Task T007: "Add defines to packages/uit-student-captcha-config-page/vite.config.ts"
Task T008: "Declare __PAGE_VERSION__, __UPDATE_URL__ in packages/uit-student-captcha-config-page/src/vite-env.d.ts"

# Then:
Task T005 (after T002+T003): "Send scriptVersion in configBridge.ts"
Task T009 (after T008):      "Add defines to config-page vitest.config.ts"
Task T010 (after T008):      "Create VersionWarning.tsx"

# Then:
Task T006 (after T004+T005): "Assert scriptVersion in configBridge.spec.ts"
Task T011 (after T009+T010): "Create VersionWarning.spec.tsx"
Task T012 (after T001+T007+T008+T010): "Integrate in App.tsx"

# Finally:
Task T013 (after T009+T012): "Extend App.spec.tsx test cases"
```

---

## Implementation Strategy

### MVP (US1 only)

1. Complete Phase 1: T001 (bridge type extension)
2. Complete Phase 2: T002–T013
3. **STOP and VALIDATE**: Run `nx run-many -t typecheck test`; manually test banner in browser
4. Deploy — US2/US3 are validated by the same tests

### Incremental within Phase 2

The userscript side (T002–T006) and config page side (T007–T013) can be worked concurrently by two developers once T001 is done. T013 (App.spec.tsx) is the final integration point where both sides must be complete.

---

## Notes

- [P] tasks touch different files with no shared dependencies — safe to run concurrently
- `__SCRIPT_VERSION__`, `__PAGE_VERSION__`, and `__UPDATE_URL__` must be declared in both `vite.config.ts` (production) and `vitest.config.ts` (test environment) for each package
- `ProviderConfiguration`, `CONFIG_VERSION`, and `validateConfig()` are NOT touched — no schema migration
- US2 and US3 require no dedicated implementation tasks — they are validated by test cases (b) and (c) in T013
- Commit after each logical group (e.g., after T001; after T002–T004; after T005–T006; after T007–T010; after T011–T013)
