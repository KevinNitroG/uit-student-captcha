# Implementation Plan: Alt Text Captcha Solver

**Branch**: `004-alt-text-solver` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-alt-text-solver/spec.md`

## Summary

Add an alt-text-first captcha solving method: extract the solution directly from the
captcha image's `alt` attribute (format `captcha:<solution>`) before attempting any OCR
API call. This makes the script work out-of-the-box with zero configuration. OCR providers
become optional fallbacks for when alt text extraction fails. The config page gains an
explanatory section describing this solving logic.

## Technical Context

**Language/Version**: TypeScript (strict mode), tsgo compiler

**Primary Dependencies**: Vite + vite-plugin-monkey (userscript), React + Vite (config page),
Vitest + jsdom (testing)

**Storage**: GM storage (userscript manager persistent storage API)

**Testing**: Vitest with jsdom environment, mocked DOM/network

**Target Platform**: Tampermonkey/Violentmonkey userscript on `https://student.uit.edu.vn/*`

**Project Type**: pnpm + Nx monorepo — userscript package + hosted React config-page SPA

**Performance Goals**: Alt text extraction completes in <10ms (synchronous DOM read, no
network round-trip). Total solve time <100ms when alt text succeeds.

**Constraints**: MVVM layer separation (Constitution I), provider abstraction (Constitution II),
safe DOM interaction (Constitution V). All DOM access isolated to View layer.

**Scale/Scope**: Single userscript + config page, 2 existing OCR providers, 1 new extraction
method

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. MVVM Architecture | ✅ PASS | Alt text extraction is a DOM read → belongs in View (PortalView.ts). ViewModel unchanged. |
| II. Provider Abstraction | ✅ PASS | Alt text is NOT an OcrResolver — it's a DOM extraction step before the resolver chain. No resolver-specific branching. |
| III. Strict Type Safety | ✅ PASS | All new code typed. No `any` introduced. |
| IV. Configurability | ✅ PASS | No new config needed for alt text (it's always-on, zero-config). OCR providers remain configurable. |
| V. Minimal Footprint & Safe DOM | ✅ PASS | Alt text read is a synchronous property access (`img.alt`). No new DOM manipulation, no new grants. |
| Testing Discipline | ✅ PASS | Alt text extraction is pure logic (string parsing) — easily unit-testable with jsdom. |
| Development Workflow | ✅ PASS | Conventional commits, nx run-many gates. |

**No violations. No complexity tracking needed.**

## Project Structure

### Documentation (this feature)

```text
specs/004-alt-text-solver/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── alt-text-solver.contract.md
└── tasks.md             # Phase 2 output (NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/
├── uit-student-captcha/                    # Userscript package
│   └── src/
│       ├── model/ocr/
│       │   └── AltTextResolver.ts          # NEW: pure string parser (parseAltText)
│       ├── viewmodel/
│       │   └── CaptchaViewModel.ts         # MODIFY: accept AltTextResult in solve()
│       ├── view/
│       │   ├── PortalView.ts               # MODIFY: read img.alt, pass to ViewModel
│       │   └── statusBadge.ts              # MODIFY: update "missing-config" message text
│       └── model/ocr/                      # (existing resolvers unchanged)
│
├── uit-student-captcha-config-page/        # Config page SPA
│   └── src/
│       ├── App.tsx                         # MODIFY: add SolvingLogicInfo section
│       └── components/
│           └── SolvingLogicInfo.tsx         # NEW: explanatory component
│
└── uit-student-captcha-config-core/        # Shared config types
    └── src/
        └── schema.ts                       # NO CHANGES (config shape unchanged)
```

**Structure Decision**: Monorepo layout is pre-existing. Changes follow MVVM layers:

| Layer | File | Change | Rationale |
|-------|------|--------|-----------|
| **Model** | `AltTextResolver.ts` | NEW | Pure parsing logic — no DOM, no I/O (Constitution I) |
| **ViewModel** | `CaptchaViewModel.ts` | MODIFY | Orchestrate alt-text-first, then OCR fallback |
| **View** | `PortalView.ts` | MODIFY | Read `img.alt` from DOM, pass string to ViewModel |
| **View** | `statusBadge.ts` | MODIFY | Update "missing-config" message text |
| **Config** | `SolvingLogicInfo.tsx` | NEW | Informational banner explaining solving logic |
| **Config** | `App.tsx` | MODIFY | Insert SolvingLogicInfo above providers list |

## Complexity Tracking

> No constitution violations — section not applicable.
