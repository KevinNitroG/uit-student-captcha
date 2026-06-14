# Tasks: Old-Safari Captcha OCR Compatibility

**Input**: Design documents from `/specs/004-old-safari-ocr/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/request-body.contract.md ✅

**Tests**: Test tasks are included (the spec requires testing discipline — success, failure, and missing-config paths, plus the no-Blob/FormData transport assertions from SC-004).

**Organization**: Tasks are grouped by user story. Phase 2 (foundational) must complete before story phases; the two story phases are independent of each other.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

## Path Conventions

All paths are under `packages/uit-student-captcha/src/` (userscript) or `packages/uit-student-captcha/src/model/http/` and `packages/uit-student-captcha/src/model/ocr/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new dependencies or config needed — the project already has Vitest+jsdom, strict TypeScript, and the monorepo toolchain. This phase documents what to verify before starting.

- [ ] T001 Verify branch is `004-old-safari-ocr` and `pnpm exec nx run-many -t typecheck test build` passes on the baseline (no changes yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The multipart encoder module and the narrowed transport types must exist before the resolvers can be edited. Both tasks can be started in parallel.

**⚠️ CRITICAL**: No resolver work can begin until T002 and T003 are complete.

- [ ] T002 [P] Create `packages/uit-student-captcha/src/model/http/multipart.ts` — export `asciiBytes`, `blobToUint8Array`, `MultipartFile` interface, `buildMultipartBody`, `encodeUrlForm` per contracts/request-body.contract.md C2 and plan.md Step 1 (ASCII via `charCodeAt`, `FileReader.readAsArrayBuffer`, single `Uint8Array` allocation, random boundary using `Math.random().toString(16)`)
- [ ] T003 [P] Narrow transport body types in `packages/uit-student-captcha/src/model/http/HttpClient.ts` and `packages/uit-student-captcha/src/platform/gm.ts` — change `body?` and `data?` from `string | FormData | Blob` to `string | ArrayBuffer` (plan.md Step 2, contract C1)
- [ ] T004 Create `packages/uit-student-captcha/src/model/http/multipart.spec.ts` — unit tests for the encoder: `asciiBytes`, `blobToUint8Array`, `buildMultipartBody` (assert `body instanceof ArrayBuffer`, boundary in contentType, field name/value, filename, image bytes present), `encodeUrlForm` (plan.md Step 5)

**Checkpoint**: Foundation ready — `multipart.ts` exports are available, transport types are narrowed, encoder tests pass.

---

## Phase 3: User Story 1 — Captcha solved on old iPhone Safari (Priority: P1) 🎯 MVP

**Goal**: Remove all `Blob`/`FormData` from EasyOCR and OCR.space POST requests so old WebKit's `GM_xmlhttpRequest` bridge can clone the request body without a `DataCloneError`.

**Independent Test**: Run `pnpm exec nx run uit-student-captcha:test` — all resolver tests pass, no `Blob`/`FormData` reaches the transport for any OCR request, ArrayBuffer / urlencoded-string body shapes are asserted.

### Implementation for User Story 1

- [ ] T005 [US1] Edit `packages/uit-student-captcha/src/model/ocr/EasyOcrResolver.ts` — replace `new FormData()` + `form.append("file", blob, "captcha.png")` with `blobToUint8Array(input.imageBytes)` + `buildMultipartBody({}, { name:"file", filename:"captcha.png", contentType:"image/png", bytes })`, set headers `{ "X-Access-Key": this.accessKey, "Content-Type": contentType }`, keep the existing `!input.imageBytes` guard (plan.md Step 3, contract C3)
- [ ] T006 [US1] Edit `packages/uit-student-captcha/src/model/ocr/OcrSpaceResolver.ts` — rework `requestPost`: build `fields: Record<string,string>` with `apikey`, `OCREngine`, `language`; change `appendFlags` to write into `Record<string,string>` instead of `FormData`; `file` mode → `blobToUint8Array` + `buildMultipartBody` + ArrayBuffer body; `url`/`base64` modes → `encodeUrlForm` string body + `application/x-www-form-urlencoded`; keep `blobToDataUrl` and `requestGet` unchanged (plan.md Step 4, contract C4)

### Tests for User Story 1

- [ ] T007 [US1] Update `packages/uit-student-captcha/src/model/ocr/EasyOcrResolver.spec.ts` — add test asserting `req.body instanceof ArrayBuffer`, `req.headers["Content-Type"]` starts with `multipart/form-data; boundary=`, and decoded body contains `name="file"` + `filename="captcha.png"`; keep all existing tests (words-response, X-Access-Key, MISSING_CONFIG, RATE_LIMIT, EMPTY_RESULT) (plan.md Step 6)
- [ ] T008 [US1] Update `packages/uit-student-captcha/src/model/ocr/OcrSpaceResolver.spec.ts` — add per-mode tests: url-mode body is `string` containing `url=` + `apikey=` with `Content-Type: application/x-www-form-urlencoded`; base64-mode body is `string` containing `base64Image=`; file-mode body is `ArrayBuffer` with multipart Content-Type and decoded body containing `filename="captcha.png"`; assert no test yields `FormData`/`Blob`; provide `imageBytes` blob for file/base64 cases; keep existing error-mapping tests (plan.md Step 7)
- [ ] T009 [US1] Update `packages/uit-student-captcha/src/model/http/HttpClient.spec.ts` — add test: POST with an `ArrayBuffer` body passes that exact `ArrayBuffer` as `details.data` through `installFakeXhr` (plan.md Step 8)

**Checkpoint**: User Story 1 fully functional — `pnpm exec nx run uit-student-captcha:test` green, no Blob/FormData in transport, ArrayBuffer/string body shapes confirmed.

---

## Phase 4: User Story 2 — No regression on modern browsers (Priority: P2)

**Goal**: The field names, file-field name, image bytes, and headers (including `X-Access-Key`) are semantically equivalent to the previous `FormData` upload so provider recognition is unaffected on current browsers.

**Independent Test**: Run `pnpm exec nx run-many -t typecheck test build` — all existing success/failure/missing-config tests still pass (they already exercise the same resolver paths); confirm recognized fields and bytes are structurally identical by reviewing the decoder output in the new multipart tests.

### Implementation for User Story 2

- [ ] T010 [P] [US2] Verify field names in `buildMultipartBody` calls match the previous `form.append` keys exactly: EasyOCR uses `file`/`captcha.png`; OCR.space uses `apikey`, `OCREngine`, `language`, `isOverlayRequired`, `detectOrientation`, `scale`, `isTable`, `file`/`captcha.png` or `url` or `base64Image` (contract C4 cross-check — no code change if T005/T006 already correct, otherwise fix)
- [ ] T011 [P] [US2] Run `pnpm exec nx run-many -t typecheck test build` from repo root and confirm zero typecheck errors (the narrowed `string | ArrayBuffer` type proves no `Blob`/`FormData` remains in source), all tests green, and bundle builds (plan.md Step 9)

**Checkpoint**: US2 complete — no regression; all stories functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup.

- [ ] T012 Run `pnpm exec nx run-many -t typecheck test build` from repo root — confirm full green suite as required by plan.md Step 9 (zero typecheck errors, all tests pass, userscript bundle builds)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — T002 and T003 can run in parallel; T004 depends on T002
- **Phase 3 (US1 — old Safari)**: T005 and T006 depend on T002+T003 (foundational complete); T007 depends on T005; T008 depends on T006; T009 depends on T003
- **Phase 4 (US2 — no regression)**: T010 depends on T005+T006; T011 is the final verification gate
- **Phase 5 (Polish)**: Depends on all phases complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 (Foundational) — no dependency on US2
- **User Story 2 (P2)**: Depends on US1 implementation completing (T005, T006) since it validates the same code paths

### Within Each Phase

- T002 (multipart.ts) and T003 (type narrowing) can run in parallel (different files)
- T004 (encoder tests) depends on T002
- T005 (EasyOCR) and T006 (OcrSpace) can run in parallel once T002+T003 are done
- T007 depends on T005; T008 depends on T006; T009 depends on T003 — the three test updates can run in parallel

### Parallel Opportunities

- T002 ‖ T003 (foundational, different files)
- T005 ‖ T006 (resolver edits, different files)
- T007 ‖ T008 ‖ T009 (test updates, different files)
- T010 ‖ T011 (US2 cross-check, different concerns)

---

## Parallel Example: Phase 2 Foundation

```
Parallel batch A:
  T002 — Create multipart.ts
  T003 — Narrow HttpClient.ts + gm.ts

Then sequential:
  T004 — Write multipart.spec.ts (needs T002)
```

## Parallel Example: User Story 1 Implementation

```
Parallel batch B (after T002 + T003 done):
  T005 — Edit EasyOcrResolver.ts
  T006 — Edit OcrSpaceResolver.ts

Parallel batch C (after T005 done):
  T007 — Update EasyOcrResolver.spec.ts
Parallel batch C (after T006 done):
  T008 — Update OcrSpaceResolver.spec.ts
Parallel (after T003 done):
  T009 — Update HttpClient.spec.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (baseline check)
2. Complete Phase 2: Foundational — T002, T003 in parallel, then T004
3. Complete Phase 3: US1 — T005+T006 in parallel, then T007+T008+T009
4. **STOP and VALIDATE**: `pnpm exec nx run-many -t typecheck test build` — green
5. US2 (P2) is achieved automatically because the same resolver paths are covered

### Incremental Delivery

1. T002+T003 → multipart encoder + type narrowing (compile-time safety)
2. T004 → encoder verified in isolation
3. T005+T006 → resolvers migrated
4. T007+T008+T009 → transport assertions in place
5. T011 → full suite green → ready to deliver

---

## Notes

- [P] tasks = different files, no shared state, can run concurrently
- The `[US2]` story phase requires no new code if T005/T006 implement the fields correctly — T010 is a verification step
- No View, ViewModel, config-schema, or config-page code is touched
- No new runtime dependencies; `FileReader`, `Uint8Array`, `ArrayBuffer`, `charCodeAt` are all baseline browser APIs
- The `blobToDataUrl` helper in `OcrSpaceResolver.ts` is kept unchanged (used by base64 mode)
- `requestGet` in `OcrSpaceResolver.ts` is kept unchanged
- `canvasExtractBytes` in the View is kept unchanged
