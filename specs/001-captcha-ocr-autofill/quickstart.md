# Quickstart & Validation: Captcha OCR Auto-fill

Run/validate the feature. Details live in [data-model.md](./data-model.md),
[contracts/](./contracts/), and [research.md](./research.md).

## Prerequisites

- Node ^26, pnpm (pinned via `mise`/`.tool-versions`).
- A userscript manager (Tampermonkey/Violentmonkey).
- Install deps: `pnpm install`.

## Build & test (Nx)

```bash
pnpm exec nx run-many -t typecheck test build   # tsgo + Vitest(jsdom) + Vite build, all packages
```
Per package:
```bash
pnpm exec nx test uit-student-captcha            # unit tests (jsdom)
pnpm exec nx build uit-student-captcha           # emits dist/uit-student-captcha.user.js
pnpm exec nx build uit-student-captcha-config-page
```

## Dynamic config-page origin

`VITE_CONFIG_PAGE_ORIGIN` is resolved at **bundle time**; default (unset) is
`http://localhost:3000` for local dev. Production build passes the deployed origin:
```bash
VITE_CONFIG_PAGE_ORIGIN="https://kevinnitrog.github.io/uit-student-captcha" pnpm exec nx run-many -t build
```
It drives the userscript `@match`/`@connect`/`homepage`/menu-command URL and the bridge
origin check. Source reads `import.meta.env.VITE_CONFIG_PAGE_ORIGIN` (Vite inlines it);
both `vite.config.ts` files read it via `loadEnv()` since config code runs in Node and
`import.meta.env` is unavailable there (see research.md Decision 4). Dev loop:
```bash
pnpm exec nx serve uit-student-captcha-config-page   # serves configure.html at http://localhost:3000
```

## Manual validation scenarios

Install the built `.user.js` in your userscript manager, then:

| # | Scenario | Expected | Maps to |
|---|----------|----------|---------|
| 1 | Load a `student.uit.edu.vn` page showing the signin form | Captcha answer field auto-fills within a few seconds; username/password/submit untouched | SC-001, SC-004 |
| 2 | Configure a failing primary + working fallback, reload | Field filled by fallback; one status message reflects recovery | SC-002 |
| 3 | Load a page with no signin form | Zero visible effect; one informational console log; no errors | SC-003 |
| 4 | All providers fail | One inline non-blocking error badge beneath the captcha + working "Retry OCR"; page stays usable | SC-006 |
| 5 | Open menu command → config page, set order + key, Save, reopen | Values persisted (GM storage) and shown on reopen; used on next portal load | SC-005 |
| 6 | First run, no config saved | EasyOCR free (no key) attempts recognition; OCR.space fallback shown disabled until key set | FR-018, FR-021 |
| 7 | Wrong fill, click "Retry OCR" | Current captcha image re-read and re-filled | FR-015/FR-016 |

## Automated coverage (must pass before done)

- Resolver unit tests: each of EasyOCR / OCR.space covers success, failure (mapped
  `OcrErrorCode`), and missing-config (per contracts) using a fake `HttpClient`.
- ViewModel: fallback chain (primary fail → fallback success), all-fail → `failed`
  status, empty chain → `missing-config`, solved-guard prevents re-solve loop.
- View (jsdom): detects/ignores absent form, fills only the answer input, renders
  badge + Retry, never touches username/password/submit.
- Bridge (jsdom): origin/source checks, persist + ack, invalid payload → error.

## Done checklist

- [ ] `nx run-many -t typecheck test build` green across affected packages.
- [ ] New resolvers each ship success/failure/missing-config tests.
- [ ] No uncaught exceptions reach the host page in any scenario above.
