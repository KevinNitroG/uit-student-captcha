---
description: "Task list for Auto-fill Captcha via OCR for UIT Student Portal"
---

# Tasks: Auto-fill Captcha via OCR for UIT Student Portal

**Input**: Design documents from `/specs/001-captcha-ocr-autofill/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED — the constitution's *Testing Discipline* makes them non-negotiable
(every resolver ships success/failure/missing-config tests; View/ViewModel/bridge are
jsdom-unit-tested with resolvers and the HTTP transport mocked).

**Organization**: Grouped by user story (US1=P1 MVP, US2=P2 fallback+UX, US3=P2 config).

## Path Conventions

- Userscript (MVVM): `packages/uit-student-captcha/src/...`, tests in `packages/uit-student-captcha/test/...`
- Config page (React SPA): `packages/uit-student-captcha-config-page/src/...`, tests in `.../test/...`
- Shared contract (source-only lib): `packages/uit-student-captcha-config-core/src/...` (research.md Decision 9)

Already in place (no task needed): pnpm+Nx monorepo, all three Vite/Vitest setups,
Tailwind v4 + shadcn/ui on the config page, the userscript header (`match`/`grant`/`connect`),
and the **`uit-student-captcha-config-core` package scaffold** — its `schema.ts`
(`ProviderConfiguration` + `DEFAULT_CONFIG`) and `bridge.ts` (`BridgeMessage` +
`STORAGE_KEY` + `isBridgeMessage`) are written and both apps depend on it
(`workspace:*`). Tasks below add `validateConfig()` and the consumers.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Source skeleton and bundle-time wiring shared by all stories.

- [X] T001 Create the userscript MVVM source skeleton (empty dirs + barrel notes): `model/ocr/`, `model/config/`, `model/http/`, `viewmodel/`, `view/`, `bridge/`, `platform/` under `packages/uit-student-captcha/src/`
- [X] T002 Make the userscript header env-driven: read `VITE_CONFIG_PAGE_ORIGIN` via `loadEnv()` and inject the origin into `@match` and `@connect` (default `http://localhost:3000`) in `packages/uit-student-captcha/vite.config.ts` (per research.md Decision 4)
- [X] T003 [P] Add test helpers — fake `GM_*` (getValue/setValue/registerMenuCommand/xmlhttpRequest) and a fake `HttpClient` factory — in `packages/uit-student-captcha/test/helpers/mocks.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contracts, transport, config, and pure utilities every story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 [P] Define `ProviderConfiguration` + `ProviderEntry` union + `DEFAULT_CONFIG` (EasyOCR-free enabled, OCR.space disabled) + `BridgeMessage`/`STORAGE_KEY` — **done** in `packages/uit-student-captcha-config-core/src/{schema,bridge,index}.ts` (data-model.md §3/§5)
- [X] T004 [P] Define `OcrResolver` interface + `OcrInput`/`OcrResult` types in `packages/uit-student-captcha/src/model/ocr/OcrResolver.ts` (per contracts/ocr-resolver.contract.md, data-model.md §1)
- [X] T005 [P] Define `OcrError` class + `OcrErrorCode` union in `packages/uit-student-captcha/src/model/ocr/errors.ts` (data-model.md §2)
- [X] T006 [P] Implement `normalizeCaptchaText()` (strip to `[A-Za-z0-9]`, pick single longest token; empty → signal failure) in `packages/uit-student-captcha/src/model/ocr/normalize.ts` (FR-010)
- [X] T008 [P] Implement typed `GM` shims (`getValue`/`setValue`/`registerMenuCommand`/`xmlhttpRequest`, narrowed at the boundary) in `packages/uit-student-captcha/src/platform/gm.ts`
- [X] T009 Implement `validateConfig(raw): ProviderConfiguration` (fill defaults, clamp `ocrEngine`/`timeoutMs`, flag missing keys, drop disabled from runtime chain) in **`packages/uit-student-captcha-config-core/src/validate.ts`** + export from `index.ts` (depends on T007)
- [X] T010 Implement `HttpClient` seam + `GmHttpClient` over `GM_xmlhttpRequest` (timeout → `OcrError(TIMEOUT)`, transport failure → `OcrError(NETWORK)`) in `packages/uit-student-captcha/src/model/http/HttpClient.ts` (depends on T005, T008; contracts/ocr-resolver.contract.md)
- [X] T011 [P] Unit tests for `normalizeCaptchaText` (userscript), `validateConfig` (in `packages/uit-student-captcha-config-core/test/validate.spec.ts`; `DEFAULT_CONFIG`/`isBridgeMessage` already covered by `config-core/test/schema.spec.ts`), and `GmHttpClient` error mapping (timeout → `OcrError(TIMEOUT)`, transport failure → `OcrError(NETWORK)`) using the fake `GM_xmlhttpRequest` from T003, in `packages/uit-student-captcha/test/HttpClient.spec.ts` (covers SC-007) (depends on T006, T009, T010)

**Checkpoint**: Contracts, config, and transport are ready — stories can begin.

---

## Phase 3: User Story 1 - Captcha is read and filled automatically (Priority: P1) 🎯 MVP

**Goal**: On a portal page with the signin form, detect the captcha, recognize it with the default no-key provider (EasyOCR free), and fill the answer field — touching nothing else.

**Independent Test**: Load a portal page with the captcha, do nothing; the answer field fills with the recognized text within a few seconds; username/password/submit untouched (SC-001, SC-004).

### Implementation for User Story 1

- [X] T012 [P] [US1] Implement `EasyOcrResolver` (free + keyed variants; multipart `file` bytes; `X-Access-Key` when keyed; map `words[]`/`text` → normalized result; HTTP-status error mapping) in `packages/uit-student-captcha/src/model/ocr/EasyOcrResolver.ts` (contracts/easyocr.contract.md)
- [X] T013 [P] [US1] `EasyOcrResolver` tests — free 200 `{words}` → token; keyed missing `accessKey` → `MISSING_CONFIG`; 429 → `RATE_LIMIT`; `{words:[]}` → `EMPTY_RESULT` (fake HttpClient) in `packages/uit-student-captcha/test/EasyOcrResolver.spec.ts`
- [X] T014 [US1] Implement `createResolver(entry, http)` registry with the `easyocr` case — the only provider switch — in `packages/uit-student-captcha/src/model/ocr/registry.ts` (depends on T012; Constitution II)
- [X] T015 [US1] Implement `CaptchaViewModel` — load+validate config, build `ocrResolvers[]` via registry, hold `imageUrl`/`imageBytes`, run the provider chain (single attempt each, normalize), expose `CaptchaStatus` — in `packages/uit-student-captcha/src/viewmodel/CaptchaViewModel.ts` (depends on T010, T014; data-model.md §4)
- [X] T016 [P] [US1] `CaptchaViewModel` happy-path tests — single mocked resolver → `solved` with normalized text — in `packages/uit-student-captcha/test/CaptchaViewModel.us1.spec.ts`
- [X] T017 [US1] Implement `PortalView` — detect `#user-login-form`, read `.english-captcha-image img`, obtain bytes by drawing the loaded same-origin `<img>` to a `<canvas>` (`toBlob`/`toDataURL`; no re-fetch) and keep its public `src` as `imageUrl`, fill `#edit-english-captcha-answer` (set value + dispatch `input`/`change`), guard every access — in `packages/uit-student-captcha/src/view/PortalView.ts` (research.md Decision 7; FR-002/003/008/009)
- [X] T018 [P] [US1] `PortalView` jsdom tests — fills only the answer input; absent form → no-op + console log; never writes `#edit-name`/`#edit-pass`/`#edit-submit--2` — in `packages/uit-student-captcha/test/PortalView.spec.ts`
- [X] T019 [US1] Wire portal mode in `packages/uit-student-captcha/src/main.ts` — at `document-idle`, construct `GmHttpClient` + `CaptchaViewModel` + `PortalView`, run once with a solved-guard (FR-016/FR-017)

**Checkpoint**: MVP — captcha auto-fills via EasyOCR free with zero user action.

---

## Phase 4: User Story 2 - Graceful fallback across OCR providers (Priority: P2)

**Goal**: Add a second provider (OCR.space) and the primary→fallback chain, plus the inline failure badge + "Retry OCR" and the missing-config notice.

**Independent Test**: Configure a failing primary + working fallback; the field is filled by the fallback with one clear status message; with all providers failing, a red badge + working Retry appears beneath the captcha and the page stays usable (SC-002, SC-006).

### Implementation for User Story 2

- [X] T020 [P] [US2] Implement `OcrSpaceResolver` (http/https, GET/POST, `OCREngine` 1–3, `url`/`base64`/`file` input, default POST+url; map `ParsedResults[0].ParsedText`; in-body `OCRExitCode`/`IsErroredOnProcessing` + HTTP error mapping) in `packages/uit-student-captcha/src/model/ocr/OcrSpaceResolver.ts` (contracts/ocrspace.contract.md)
- [X] T021 [P] [US2] `OcrSpaceResolver` tests — POST+url `OCRExitCode:1` → token; empty `apiKey` → `MISSING_CONFIG`; `IsErroredOnProcessing` invalid-key → `AUTH`; `ParsedText:" "` → `EMPTY_RESULT` — in `packages/uit-student-captcha/src/model/ocr/OcrSpaceResolver.spec.ts`
- [X] T022 [US2] Extend `createResolver` with the `ocrspace` case in `packages/uit-student-captcha/src/model/ocr/registry.ts` (depends on T020)
- [X] T023 [US2] Harden `CaptchaViewModel` chain — iterate enabled providers in order, one attempt each bounded by `timeoutMs`, skip misconfigured, all-fail → `failed` (carry last error + attempts), empty chain → `missing-config`, no same-provider retry — in `packages/uit-student-captcha/src/viewmodel/CaptchaViewModel.ts` (FR-007/014/021)
- [X] T024 [P] [US2] `CaptchaViewModel` chain tests — primary fail → fallback success; all fail → `failed`; empty chain → `missing-config`; timeout triggers fallback; solved-guard prevents re-solve loop — in `packages/uit-student-captcha/src/viewmodel/CaptchaViewModel.us2.spec.ts`
- [X] T025 [US2] Implement `statusBadge` — mount beneath `.english-captcha-image` inside `.captcha`; render `loading`/`solved`/`missing-config`/`failed` (red badge + "Retry OCR" control); idempotent single mount — in `packages/uit-student-captcha/src/view/statusBadge.ts` (contracts/config-ui.contract.md §B; FR-015)
- [X] T026 [P] [US2] `statusBadge` jsdom tests — `failed` renders badge + Retry that re-invokes the chain; `missing-config` shows the config-page link; running twice yields one badge — in `packages/uit-student-captcha/src/view/statusBadge.spec.ts`
- [X] T027 [US2] Wire the badge + Retry handler into `PortalView`/`main.ts` — Retry re-reads the current image (canvas→bytes; `src`→URL) and re-runs the chain from `idle` (targets transient-failure recovery; image is unchanged between retries) — in `packages/uit-student-captcha/src/view/PortalView.ts`

**Checkpoint**: Two providers with automatic fallback and a graceful, non-blocking failure UX.

---

## Phase 5: User Story 3 - Configure OCR providers and settings (Priority: P2)

**Goal**: A hosted React (Tailwind + shadcn) config page that edits `ProviderConfiguration` and persists it into userscript GM storage via the postMessage bridge; reachable from a userscript menu command.

**Independent Test**: Open the menu command → config page, set provider order + a key, Save, reload; values persist (GM storage) and are the ones used on the next portal load (SC-005).

### Implementation for User Story 3

- [X] T028 [P] [US3] Re-export the shared config/bridge contract for SPA components — **done** in `packages/uit-student-captcha-config-page/src/config/schema.ts` (re-exports `uit-student-captcha-config-core`; replaces the old "mirror" approach per research.md Decision 9)
- [X] T029 [US3] Add shadcn primitives used by the form (`input`, `label`, `switch`, `select`, `card`, `collapsible`, `badge`) via `mise exec npm:shadcn@latest -- shadcn add ...` into `packages/uit-student-captcha-config-page/src/components/ui/`
- [X] T030 [P] [US3] Implement SPA `postMessageClient` — `uoc:get`/`uoc:set` with an explicit `targetOrigin`, origin-filtered receive validated with `isBridgeMessage` (imported from config-core) — in `packages/uit-student-captcha-config-page/src/bridge/postMessageClient.ts` (contracts/config-bridge.contract.md)
- [X] T031 [P] [US3] Implement `EasyOcrFields` (variant radio, endpoint, conditional access key) in `packages/uit-student-captcha-config-page/src/components/EasyOcrFields.tsx`
- [X] T032 [P] [US3] Implement `OcrSpaceFields` (required API key + collapsible Advanced: scheme/method/inputMode/engine/language/flags) in `packages/uit-student-captcha-config-page/src/components/OcrSpaceFields.tsx`
- [X] T033 [US3] Implement `ProviderCard` (discriminated `provider` switch → fields; enable toggle, delete) and `ProviderList` (reorder = chain order) in `packages/uit-student-captcha-config-page/src/components/` (depends on T031, T032)
- [X] T034 [US3] Implement `GlobalSettings` (timeout), `AddProviderMenu`, and `SaveBar` (dirty/ack/error) in `packages/uit-student-captcha-config-page/src/components/`
- [X] T035 [US3] Compose `App.tsx` — hydrate via `postMessageClient`, hold config state, surface required-key warnings, Save/Reset, userscript-connected indicator — in `packages/uit-student-captcha-config-page/src/App.tsx` (depends on T028, T030, T033, T034)
- [X] T036 [P] [US3] Config-page jsdom tests — `uoc:get` round-trip renders config; Save posts `uoc:set` and shows ack; invalid payload shows error; empty required key shows ⚠ — in `packages/uit-student-captcha-config-page/src/App.spec.tsx`
- [X] T037 [US3] Implement `configBridge` (userscript side) — verify `event.origin`/`event.source`, `isBridgeMessage` guard, handle `uoc:get`/`uoc:set` against GM storage at `STORAGE_KEY`, `validateConfig` before persist, reply `uoc:value`/`uoc:ack`/`uoc:error` (all from config-core) — in `packages/uit-student-captcha/src/bridge/configBridge.ts` (depends on T009; contracts/config-bridge.contract.md)
- [X] T038 [P] [US3] `configBridge` jsdom tests — foreign origin ignored (no `GM_setValue`); valid `uoc:set` persists + acks; invalid payload → `uoc:error` — in `packages/uit-student-captcha/src/bridge/configBridge.spec.ts`
- [X] T039 [US3] Wire config-page mode in `packages/uit-student-captcha/src/main.ts` — route on the config-page origin to `configBridge`, and register the `GM_registerMenuCommand` that opens `${VITE_CONFIG_PAGE_ORIGIN}${BASE}configure.html` on the portal (FR-011/FR-020). Confirm `GM_registerMenuCommand` + `GM_openInTab` are in the `@grant` list (add them in `vite.config.ts` if missing — do not defer to T040) and that the config-page build emits `configure.html` (not just `index.html`)

**Checkpoint**: Settings edited on the hosted page persist into GM storage and drive recognition.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation and final hardening across stories.

- [X] T040 [P] Review userscript `@grant`/`@connect`/`@match` are minimal and complete (add `GM_openInTab` only if used) in `packages/uit-student-captcha/vite.config.ts` (Constitution V)
- [X] T041 Run `pnpm exec nx run-many -t typecheck test build` and ensure it is green across both packages
- [ ] T042 [P] Execute the manual scenarios in `specs/001-captcha-ocr-autofill/quickstart.md` (install built `.user.js`, run scenarios 1–7) and record results — ⚠ MANUAL: requires installing the built `.user.js` in Tampermonkey/Violentmonkey against the live portal; not executable in this headless environment. Automated coverage (45 unit tests) substitutes for scenarios 1–7 at the unit level.
- [X] T043 [P] Update `README.md` with install + configuration usage (menu command, providers, keys)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories.
- **US1 (Phase 3)**: depends on Foundational. MVP.
- **US2 (Phase 4)**: depends on Foundational; extends US1's registry/ViewModel/View (T022/T023/T027 touch US1 files — sequence after US1, or coordinate).
- **US3 (Phase 5)**: depends on Foundational; largely independent of US1/US2 (config-page + bridge). T037 depends on `validateConfig` (T009).
- **Polish (Phase 6)**: after the desired stories are complete.

### Within Each User Story

- Resolver + its tests before registry wiring; ViewModel before View wiring; tests alongside per the constitution.

### Parallel Opportunities

- Foundational T004–T008 are all [P] (distinct files); T009/T010 follow their inputs.
- US1: T012/T013 [P]; T016/T018 [P]. US2: T020/T021 [P]; T024/T026 [P].
- US3: T028/T030/T031/T032 [P]; T036/T038 [P].
- With capacity, US3 can proceed in parallel with US1/US2 (different packages), except T037 needs T009.

---

## Parallel Example: User Story 1

```bash
# After Foundational completes, launch in parallel:
Task: "T012 Implement EasyOcrResolver in src/model/ocr/EasyOcrResolver.ts"
Task: "T013 EasyOcrResolver tests in test/EasyOcrResolver.spec.ts"
# Then, once the ViewModel/View exist:
Task: "T016 CaptchaViewModel happy-path tests"
Task: "T018 PortalView jsdom tests"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (captcha auto-fills via EasyOCR free) → demo.

### Incremental Delivery

1. Foundation ready → 2. US1 (MVP, auto-fill) → 3. US2 (fallback + failure UX) → 4. US3 (hosted config). Each story is independently testable and adds value without breaking the previous.

---

## Notes

- [P] = different files, no incomplete-task dependency.
- Tests are mandatory here (constitution Testing Discipline) — resolvers/View/ViewModel/bridge are covered with mocked transport and GM APIs.
- Adding a future provider = new resolver file + one registry case + one config-union member + one SPA `*Fields` component — no ViewModel/View edits (Constitution II / FR-019).
- Commit after each task or logical group; keep DOM-selector changes isolated to the View.
