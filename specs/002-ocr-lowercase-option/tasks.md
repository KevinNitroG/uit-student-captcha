# Tasks: OCR Result Lowercase Toggle

**Input**: Design documents from `specs/002-ocr-lowercase-option/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story. Tests are included per constitution Testing Discipline (unit
tests are mandatory for all new behaviour).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies)
- **[Story]**: Which user story this task belongs to (US1 or US2)
- Exact file paths are included in every task description

## Path Conventions (this feature)

```
packages/uit-student-captcha-config-core/src/          # config-core
packages/uit-student-captcha/src/view/                 # userscript View
packages/uit-student-captcha/src/                      # userscript root
packages/uit-student-captcha-config-page/src/          # config page SPA
```

---

## Phase 1: Foundational — Shared Schema & Validation

**Purpose**: Update `config-core`, the shared package that both `userscript` and
`config-page` import. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: All other tasks depend on these schema types being correct.

- [x] T001 Add `lowercaseResult: boolean` to `ProviderConfiguration`, set `version: 2`, bump `CONFIG_VERSION` to `2`, add `lowercaseResult: true` to `DEFAULT_CONFIG` in `packages/uit-student-captcha-config-core/src/schema.ts`
- [x] T002 Add `asBoolean(obj['lowercaseResult'], true)` coercion in `validateConfig()` and update the return literal to `version: CONFIG_VERSION` (now 2) in `packages/uit-student-captcha-config-core/src/validate.ts`
- [x] T003 [P] Add `validateConfig()` test cases for `lowercaseResult` coercion: absent key → `true`, `false` → `false`, non-boolean → `true`, version > 2 resets to `DEFAULT_CONFIG.lowercaseResult === true` in `packages/uit-student-captcha-config-core/src/validate.spec.ts`
- [x] T004 [P] Add `DEFAULT_CONFIG.lowercaseResult === true` assertion and `CONFIG_VERSION === 2` assertion in `packages/uit-student-captcha-config-core/src/schema.spec.ts`

**Checkpoint**: Run `pnpm exec nx test uit-student-captcha-config-core` — all tests pass, including T003/T004. TypeScript compiles cleanly.

---

## Phase 2: User Story 1 — OCR Result Auto-Lowercased (Priority: P1) 🎯 MVP

**Goal**: When `lowercaseResult` is enabled (the default), the value written into the
captcha answer field contains no uppercase letters, regardless of provider output.

**Independent Test**: With default config (no saved settings), load the portal signin page, let OCR run, and confirm the captcha answer field contains only lowercase characters regardless of the raw OCR response casing.

### Implementation for User Story 1

- [x] T005 [US1] Add `readonly lowercaseResult?: boolean` to `PortalViewOptions` and store as `private readonly lowercaseResult: boolean` (defaulting to `true`) in the `PortalView` constructor in `packages/uit-student-captcha/src/view/PortalView.ts`
- [x] T006 [US1] Apply `this.lowercaseResult ? text.toLowerCase() : text` in `PortalView.fillAnswer()` before writing to `input.value` in `packages/uit-student-captcha/src/view/PortalView.ts`
- [x] T007 [US1] Pass `lowercaseResult: config.lowercaseResult` in the `PortalView` constructor call inside `runPortalMode()` in `packages/uit-student-captcha/src/main.ts`

### Tests for User Story 1

- [x] T008 [P] [US1] Add `PortalView` test: with `lowercaseResult: true`, a solved OCR result of `"AbCd12"` writes `"abcd12"` to the answer input in `packages/uit-student-captcha/src/view/PortalView.spec.ts`
- [x] T009 [P] [US1] Add `PortalView` test: with `lowercaseResult: false`, a solved OCR result of `"AbCd12"` writes `"AbCd12"` to the answer input in `packages/uit-student-captcha/src/view/PortalView.spec.ts`
- [x] T010 [P] [US1] Add `PortalView` test: with `lowercaseResult` absent from options, a solved OCR result of `"AbCd12"` writes `"abcd12"` (default-true behavior) in `packages/uit-student-captcha/src/view/PortalView.spec.ts`

**Checkpoint**: Run `pnpm exec nx test uit-student-captcha` — T008/T009/T010 pass. US1 is fully functional and independently testable end-to-end.

---

## Phase 3: User Story 2 — Config-Page Toggle (Priority: P2)

**Goal**: A user can toggle the lowercase option on/off from the configuration page and the change persists across reloads.

**Independent Test**: Open the config page, toggle the switch off, save, reload — the switch remains unchecked and the portal subsequently fills with un-lowercased text.

### Implementation for User Story 2

- [x] T011 [US2] Add `lowercaseResult: boolean` and `onLowercaseChange: (v: boolean) => void` to `GlobalSettingsProps`, import `Switch` from `@/components/ui/switch`, and render a labelled `<Switch>` below the timeout field in `packages/uit-student-captcha-config-page/src/components/GlobalSettings.tsx`
- [x] T012 [US2] Wire `lowercaseResult={current.lowercaseResult}` and `onLowercaseChange={(lowercaseResult) => update({ ...current, lowercaseResult })}` on the `<GlobalSettings>` render in `packages/uit-student-captcha-config-page/src/App.tsx`

### Tests for User Story 2

- [x] T013 [P] [US2] Add `GlobalSettings` render test: with `lowercaseResult: true`, the Switch is rendered as checked in `packages/uit-student-captcha-config-page/test/` (or alongside the component)
- [x] T014 [P] [US2] Add `GlobalSettings` render test: with `lowercaseResult: false`, the Switch is rendered as unchecked in `packages/uit-student-captcha-config-page/test/`
- [x] T015 [P] [US2] Add `GlobalSettings` interaction test: toggling the Switch calls `onLowercaseChange` with the new boolean value in `packages/uit-student-captcha-config-page/test/`

**Checkpoint**: Run `pnpm exec nx test uit-student-captcha-config-page` — T013/T014/T015 pass. US1 and US2 are both independently functional.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Full suite validation and build verification across all three packages.

- [x] T016 Run `pnpm exec nx run-many -t typecheck test build` and confirm zero TypeScript errors and zero test failures across `uit-student-captcha-config-core`, `uit-student-captcha`, and `uit-student-captcha-config-page`
- [x] T017 [P] Manually validate Scenario A from `specs/002-ocr-lowercase-option/quickstart.md`: open the config page in dev mode (`nx serve uit-student-captcha-config-page`), confirm the "Lowercase OCR result" Switch is checked by default

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately.
- **Phase 2 (US1)** and **Phase 3 (US2)**: Both depend on Phase 1 completion. After Phase 1, US1 and US2 can proceed in parallel (they touch different packages).
- **Phase 4 (Polish)**: Depends on all prior phases being complete.

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 1 only. `PortalView.ts` and `main.ts` — no US2 dependency.
- **US2 (P2)**: Depends on Phase 1 only. `GlobalSettings.tsx` and `App.tsx` — no US1 dependency.

### Within Each Phase

- T001 before T002 (validate.ts imports from schema.ts)
- T003 and T004 can run in parallel after T001/T002
- T005 before T006 before T007 (sequential: type → transform → wire)
- T008, T009, T010 can run in parallel after T005/T006 (same file, no ordering between them)
- T011 before T012 (App.tsx uses the updated GlobalSettings props)
- T013, T014, T015 can run in parallel after T011

---

## Parallel Opportunities

### Phase 1 — Parallel after T001+T002

```
T003: validate.spec.ts — new coercion cases
T004: schema.spec.ts — DEFAULT_CONFIG + CONFIG_VERSION assertions
```

### Phase 2 (US1) — Parallel after T005+T006+T007

```
T008: PortalView test — lowercaseResult: true
T009: PortalView test — lowercaseResult: false
T010: PortalView test — lowercaseResult absent (default)
```

### Phase 3 (US2) — Parallel after T011+T012

```
T013: GlobalSettings test — Switch checked
T014: GlobalSettings test — Switch unchecked
T015: GlobalSettings test — toggle interaction
```

### Phase 2 and Phase 3 in parallel (after Phase 1)

```
Developer A: T005 → T006 → T007 → T008/T009/T010
Developer B: T011 → T012 → T013/T014/T015
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001–T004)
2. Complete Phase 2: User Story 1 (T005–T010)
3. **STOP and VALIDATE**: `nx test uit-student-captcha` passes; default-on lowercasing is live.
4. Ship US1 — portal users get correct lowercase fill with no config action required.

### Incremental Delivery

1. Phase 1 → shared schema updated → both packages compile correctly.
2. Phase 2 (US1) → default-on lowercasing in the portal — deploy/test.
3. Phase 3 (US2) → config-page toggle — users can opt out if needed — deploy/test.
4. Phase 4 → full suite green, build artifacts verified.

---

## Notes

- `[P]` tasks touch different files or are order-independent within the same file
- `[USn]` label maps each task to its user story for traceability
- Constitution Testing Discipline requires all new behaviour to have jsdom unit tests
- Commit after each checkpoint (Phase 1, US1 complete, US2 complete, Polish)
- The bridge serializes the full `ProviderConfiguration` — no bridge changes needed; `lowercaseResult` rides through automatically once the schema is updated
