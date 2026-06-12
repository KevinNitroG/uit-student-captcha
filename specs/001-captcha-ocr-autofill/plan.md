# Implementation Plan: Auto-fill Captcha via OCR for UIT Student Portal

**Branch**: `001-captcha-ocr-autofill` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-captcha-ocr-autofill/spec.md`

## Summary

A Tampermonkey/Violentmonkey userscript that, on `https://student.uit.edu.vn/*`,
detects the signin form, reads the captcha image, runs it through a configurable
chain of OCR providers (primary → fallback, one attempt each), normalizes the
result to a single alphanumeric token, and writes it into the captcha answer
field — never touching credentials or the submit button. A second runtime mode of
the same bundle runs on a hosted React config page and bridges saved settings into
userscript storage via `postMessage`.

Technical approach: an **`OcrResolver`** interface (`async resolve(input): Promise<OcrResult>`)
with two concrete implementations — `EasyOcrResolver` and `OcrSpaceResolver` —
selected and ordered by typed configuration, instantiated into an `ocrResolvers`
array held by the ViewModel. Each resolver maps its provider's native response and
error/status codes into a uniform `OcrResult` or throws a typed `OcrError`. The
ViewModel orchestrates the fallback chain and exposes status; the View binds to the
portal DOM and renders an inline status/error badge with a "Retry OCR" control. All
network calls go through `GM_xmlhttpRequest` (the userscript privileged transport),
wrapped behind a small `HttpClient` seam so tests mock one function.

## Technical Context

**Language/Version**: TypeScript 6.x (`strict`), compiled via Vite 8 + `vite-plugin-monkey` 8 (userscript) and `@vitejs/plugin-react` (config page).

**Primary Dependencies**: `vite-plugin-monkey` (userscript header/transport); config page = React + **Tailwind v4** (`@tailwindcss/vite`) + **shadcn/ui** (radix-ui, lucide, `cn`). Userscript runtime deps kept minimal per constitution; the UI deps are config-page-only and never enter the userscript bundle.

**Storage**: Userscript host storage (`GM_getValue`/`GM_setValue`) as the source of truth for `ProviderConfiguration`; the config page persists via the userscript over `postMessage`.

**Testing**: Vitest on Node with the **jsdom** environment. Resolvers and the HTTP transport are mocked (`vi.mock`/fakes); no live network or browser.

**Target Platform**: Tampermonkey/Violentmonkey on `https://student.uit.edu.vn/*` and the hosted config page `https://kevinnitrog.github.io/uit-student-captcha/*`.

**Project Type**: pnpm + Nx monorepo, three packages — `packages/uit-student-captcha` (userscript, MVVM), `packages/uit-student-captcha-config-page` (React SPA), and `packages/uit-student-captcha-config-core` (shared, source-only lib holding the config + bridge contract; see research.md Decision 9).

**Performance Goals**: Per-attempt bounded by a configurable timeout (default ~15s); non-blocking on the host page; resolution feels "within a few seconds" for the common case.

**Constraints**: No uncaught exceptions into the host page; no DOM access in Model/ViewModel; secrets never committed; minimal `grant`/`connect` privileges; config-page host origin and userscript `@connect`/match values resolved at bundle time from Vite env where dynamic.

**Scale/Scope**: Single-user client-side script; 2 providers initially, designed for N; ~one signin form per page.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. MVVM & Separation | PASS | Model = resolvers/config/contracts (no DOM); ViewModel = orchestration + state (no DOM); View = portal DOM bind + badge. |
| II. Provider Abstraction (NON-NEGOTIABLE) | PASS | Single `OcrResolver` contract; resolvers chosen via a `createResolver` registry/factory. No `if provider===` outside the factory. New provider = new file + registry entry, no ViewModel/View edits (FR-019). |
| III. Strict Type Safety | PASS | All contracts explicitly typed; `any` only at GM/DOM boundary, narrowed immediately. `tsc --noEmit` must pass. |
| IV. Configurability | PASS | `ProviderConfiguration` is typed data with defaults + validation; endpoints/keys/engine/method/timeout/order all configurable; no committed secrets. |
| V. Minimal Footprint & Safe DOM | PASS | `run-at: document-idle`; every DOM access guarded; only `GM_*` grants already declared; never autosubmits. |
| Testing Discipline | PASS | jsdom unit tests; resolvers + transport mocked; each resolver ships success/failure/missing-config tests. |

**Result**: PASS — no violations; Complexity Tracking table left empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-captcha-ocr-autofill/
├── plan.md              # This file
├── research.md          # Phase 0 output — API shapes, error mapping, decisions
├── data-model.md        # Phase 1 output — entities & typed contracts
├── quickstart.md        # Phase 1 output — validation/run guide
├── contracts/           # Phase 1 output
│   ├── ocr-resolver.contract.md      # OcrResolver interface + OcrError taxonomy
│   ├── easyocr.contract.md           # EasyOCR request/response/error shapes
│   ├── ocrspace.contract.md          # OCR.space request/response/error shapes
│   ├── config-bridge.contract.md     # postMessage <-> GM storage protocol
│   └── config-ui.contract.md         # config-page layout/options + portal badge
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
packages/uit-student-captcha-config-core/     # Shared contract (source-only lib)
└── src/
    ├── schema.ts                             # ProviderConfiguration + ProviderEntry + DEFAULT_CONFIG
    ├── validate.ts                           # validateConfig() (Phase 2 task)
    ├── bridge.ts                             # BridgeMessage + STORAGE_KEY + isBridgeMessage
    └── index.ts                              # public barrel (exports → src as TS source)

packages/uit-student-captcha/                 # Userscript (MVVM)
├── vite.config.ts                            # monkey() header: match/grant/connect/version
└── src/
    ├── main.ts                               # entry: route by origin (portal vs config page)
    ├── env.d.ts / vite-env.d.ts              # Vite env typing (VITE_CONFIG_PAGE_ORIGIN, ...)
    ├── model/
    │   ├── ocr/
    │   │   ├── OcrResolver.ts                # interface + OcrInput/OcrResult/OcrError types
    │   │   ├── EasyOcrResolver.ts            # console.easyocr.org/api/ocr (key-only, X-Access-Key)
    │   │   ├── OcrSpaceResolver.ts           # ocr.space (http/https, GET/POST, engine 1-3, url/base64/file)
    │   │   ├── registry.ts                   # createResolver(factory) — the only provider switch
    │   │   └── errors.ts                     # OcrError + OcrErrorCode taxonomy
    │   ├── config/
    │   │   └── (schema/defaults/validate now live in config-core; the userscript
    │   │        imports them from `uit-student-captcha-config-core`)
    │   └── http/
    │       └── HttpClient.ts                 # GM_xmlhttpRequest wrapper (mockable seam)
    ├── viewmodel/
    │   └── CaptchaViewModel.ts               # holds imageUrl/imageBytes + ocrResolvers[]; runs chain
    ├── view/
    │   ├── PortalView.ts                     # detect form, read image, fill field, render badge
    │   └── statusBadge.ts                    # inline status/error UI + "Retry OCR" control
    ├── bridge/
    │   └── configBridge.ts                   # config-page mode: postMessage <-> GM storage
    └── platform/
        └── gm.ts                             # typed GM_getValue/GM_setValue/menu-command shims
└── test/                                     # Vitest + jsdom; resolvers & HttpClient mocked

packages/uit-student-captcha-config-page/     # React SPA (config UI)
├── vite.config.ts                            # base + (via loadEnv) VITE_CONFIG_PAGE_ORIGIN
└── src/
    ├── App.tsx                               # hydrate via bridge, hold config, SaveBar
    ├── components/                           # GlobalSettings, ProviderList, ProviderCard,
    │                                         #   EasyOcrFields, OcrSpaceFields, AddProviderMenu
    ├── bridge/postMessageClient.ts           # send/receive config to/from userscript
    └── config/schema.ts                      # re-export of the shared config-core contract
```

**Structure Decision**: Existing pnpm + Nx monorepo with the two packages already
scaffolded. This feature fills `packages/uit-student-captcha/src` with the MVVM
layers (model/viewmodel/view/bridge/platform) and the config page's form + bridge.
The config schema and bridge protocol are the contract shared via the
`uit-student-captcha-config-core` package across the postMessage seam (research.md
Decision 9) — not mirrored.

**Verified against the live portal** (Chrome DevTools, 2026-06-12 — see research.md
Decision 7): the signin block is Drupal `user_login_block` + `english_captcha`; the
captcha PNG renders the distorted answer word (a real OCR target, not a riddle).
Real selectors are pinned for the View: form `#user-login-form`, image
`.english-captcha-image img`, answer `#edit-english-captcha-answer`; username/password/
submit (`#edit-name`/`#edit-pass`/`#edit-submit--2`) are never touched.

**Bundle-time env**: `VITE_CONFIG_PAGE_ORIGIN` (default `http://localhost:3000`) drives
the config-page origin. Source reads `import.meta.env.*` (Vite inlines it); both
`vite.config.ts` files read it via `loadEnv()` (config runs in Node — `import.meta.env`
is unavailable there) to inject `@match`/`@connect`/`homepage` and the SPA `base`.

## Complexity Tracking

> No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
