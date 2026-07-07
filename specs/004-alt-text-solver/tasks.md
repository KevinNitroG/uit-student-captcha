# Tasks: Alt Text Captcha Solver

**Input**: Design documents from `/specs/004-alt-text-solver/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new Model-layer file that all user stories depend on

- [x] T001 Create `AltTextResult` interface and `parseAltText()` function in `packages/uit-student-captcha/src/model/ocr/AltTextResolver.ts` per contract at `specs/004-alt-text-solver/contracts/alt-text-solver.contract.md`

**Checkpoint**: Model-layer parser exists and exports `parseAltText` — ready for ViewModel integration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire the alt text parser into the ViewModel orchestration — blocks all user stories

- [x] T002 Modify `CaptchaViewModel.solve()` in `packages/uit-student-captcha/src/viewmodel/CaptchaViewModel.ts` to accept optional `AltTextResult` parameter and return solved immediately when alt text succeeds (per research.md Decision 3)

**Checkpoint**: ViewModel can accept alt text result and short-circuit the OCR chain — ready for View integration

---

## Phase 3: User Story 1 — Captcha solved instantly via alt text (Priority: P1) 🎯 MVP

**Goal**: Script extracts captcha solution from image `alt` attribute and fills the answer field without any OCR API call.

**Independent Test**: Load portal page with captcha image having `alt="captcha:ram"`. Answer field filled within ~100ms. No OCR network requests.

### Implementation for User Story 1

- [x] T003 [US1] Modify `PortalView.solveInto()` in `packages/uit-student-captcha/src/view/PortalView.ts` to read `context.captchaImage.alt`, call `parseAltText()`, and pass result to `viewModel.solve(altResult)` (per research.md Decision 4)
- [x] T004 [US1] Add import for `parseAltText` from `../model/ocr/AltTextResolver.ts` in `packages/uit-student-captcha/src/view/PortalView.ts`
- [x] T005 [US1] Add console log in `PortalView.solveInto()` when alt text extraction succeeds: `[uit-captcha] captcha solved via alt text: <solution>` in `packages/uit-student-captcha/src/view/PortalView.ts`

**Checkpoint**: MVP complete — captcha is auto-filled via alt text extraction on portal pages with valid alt text

---

## Phase 4: User Story 2 — Fallback to OCR when alt text unavailable (Priority: P2)

**Goal**: When alt text extraction fails, script falls back to configured OCR provider chain. When both fail, clear error message shown.

**Independent Test**: Configure OCR provider with valid key. Load page with empty/malformed alt text. Confirm OCR fills the answer field.

### Implementation for User Story 2

- [x] T006 [US2] Update "missing-config" badge text in `packages/uit-student-captcha/src/view/statusBadge.ts` to mention alt text was tried: "No captcha solution found (alt text unavailable). Configure an OCR provider as fallback. ⚙ Open configuration" (per research.md Decision 8)
- [x] T007 [US2] Add console log in `PortalView.solveInto()` when alt text extraction fails and falling back to OCR: `[uit-captcha] alt text extraction failed, falling back to OCR` in `packages/uit-student-captcha/src/view/PortalView.ts`

**Checkpoint**: Fallback chain works — OCR is called only when alt text fails, clear messaging on total failure

---

## Phase 5: User Story 3 — Config page explains solving logic (Priority: P2)

**Goal**: Configuration page includes informational section explaining alt-text-first logic. OCR providers shown as optional.

**Independent Test**: Open config page. Explanatory text visible above providers list. No warnings when no providers configured.

### Implementation for User Story 3

- [x] T008 [P] [US3] Create `SolvingLogicInfo` React component in `packages/uit-student-captcha-config-page/src/components/SolvingLogicInfo.tsx` with informational banner explaining: alt text extraction is primary (free, instant, no config), OCR providers are optional fallbacks
- [x] T009 [US3] Import and render `SolvingLogicInfo` above the providers section in `packages/uit-student-captcha-config-page/src/App.tsx`

**Checkpoint**: Config page clearly explains why the script works without configuration

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T010 Run type checking: `pnpm exec nx run-many -t typecheck` — confirm zero errors
- [x] T011 Run test suite: `pnpm exec nx run-many -t test` — confirm all tests pass
- [x] T012 Run build: `pnpm exec nx run-many -t build` — confirm successful build
- [x] T013 Validate against quickstart.md scenarios: verify alt text solve, OCR fallback, config page explanation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 (T002) — MVP
- **US2 (Phase 4)**: Depends on Phase 2 (T002) — can run parallel with US1
- **US3 (Phase 5)**: No dependency on US1/US2 — can run parallel with US1+US2
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on T001, T002 — no dependency on other stories
- **US2 (P2)**: Depends on T001, T002 — can run parallel with US1
- **US3 (P2)**: Independent of US1/US2 — config page changes don't affect userscript

### Parallel Opportunities

```
# Phase 1+2 (sequential — foundation):
T001 → T002

# Phase 3+4+5 (parallel — independent stories):
├── T003 → T004 → T005  (US1: alt text MVP)
├── T006 → T007          (US2: OCR fallback)
└── T008 → T009          (US3: config page)

# Phase 6 (sequential — validation):
T010 → T011 → T012 → T013
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001 (AltTextResolver model)
2. Complete T002 (ViewModel orchestration)
3. Complete T003–T005 (View integration)
4. **STOP and VALIDATE**: Load portal page, verify captcha fills via alt text
5. Ship if ready — this is the core value

### Incremental Delivery

1. T001–T002: Foundation ready (parser + ViewModel wiring)
2. T003–T005: **MVP!** Alt text solving works end-to-end
3. T006–T007: OCR fallback + error messaging complete
4. T008–T009: Config page explains the logic
5. T010–T013: Validation and polish

### Parallel Team Strategy

With multiple developers:
1. Developer A: T001 → T002 → T003–T005 (US1 — MVP path)
2. Developer B: T008–T009 (US3 — config page, independent)
3. After T002: Developer C: T006–T007 (US2 — fallback, after foundation)

---

## Notes

- Tests are NOT included in this task list — the feature spec does not request TDD or explicit test tasks. Unit tests for `parseAltText()` can be added as a follow-up.
- All tasks follow the strict checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- Total tasks: 13 (1 setup + 1 foundational + 3 US1 + 2 US2 + 2 US3 + 4 polish)
