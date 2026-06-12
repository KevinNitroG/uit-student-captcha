# UIT Student Captcha

A Tampermonkey/Violentmonkey userscript that **auto-fills the OCR captcha** on the
[UIT student portal](https://student.uit.edu.vn/) sign-in form. It reads the captcha
image, sends it to a configurable OCR provider (with fallback), and types the result
into the captcha field. It does **not** fill credentials or submit the form.

## Repository (pnpm + Nx monorepo)

| Package | Description |
| --- | --- |
| [`packages/uit-student-captcha`](packages/uit-student-captcha) | The userscript (Vite + `vite-plugin-monkey`), structured MVVM: model (OCR resolvers/transport), view-model (fallback chain), view (portal DOM + status badge), bridge (config-page mode). |
| [`packages/uit-student-captcha-config-page`](packages/uit-student-captcha-config-page) | React + Vite SPA (Tailwind v4 + shadcn/ui) for configuring OCR providers, deployed to GitHub Pages. |
| [`packages/uit-student-captcha-config-core`](packages/uit-student-captcha-config-core) | Shared, source-only library holding the config schema, `validateConfig()`, and the postMessage bridge contract used by both apps. |

Tasks run through Nx with inference plugins — `@nx/js/typescript` (typecheck via `tsgo`),
`@nx/vite` (build/serve), and `@nx/vitest` (test):

```bash
pnpm install
pnpm exec nx run-many -t typecheck test build       # check everything
pnpm exec nx build uit-student-captcha              # build just the userscript
pnpm exec nx serve uit-student-captcha-config-page  # run the config page locally
```

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey).
2. Install the [userscript](https://github.com/KevinNitroG/uit-student-captcha/releases/latest/download/uit-student-captcha.user.js).

## Usage

1. Open the [UIT student portal](https://student.uit.edu.vn/). When the sign-in form
   with a captcha is present, the captcha field is filled automatically.
2. Configure your OCR providers from the userscript-manager menu → **Configure OCR
   providers**, which opens the hosted
   [config page](https://kevinnitrog.github.io/uit-student-captcha/configure.html).
3. If every provider fails, a non-blocking red badge with a **↻ Retry OCR** button
   appears beneath the captcha — the form stays fully usable and you can always type
   the captcha by hand.

## Configuration

Out of the box (no key required) the script uses **EasyOCR (free)**. Open the config
page to change providers, order, and keys. Settings are saved into your userscript
manager's storage via a `postMessage` bridge (keep the tab open while saving) and are
read on the next portal load.

- **Provider order = the fallback chain.** The top entry is the primary; each lower
  entry is tried, once, only if the ones above it fail. Per-attempt timeout is
  configurable (default 15 s).
- **Enable toggle** removes a provider from the runtime chain without deleting it.
- **Keys** are entered as password fields and are never logged. An entry whose required
  key is empty shows an inline ⚠ and is skipped on the portal until you supply one.

| Provider | Key | Notes |
| --- | --- | --- |
| **EasyOCR (free)** | none | Default primary. Sends the image bytes; no signup. |
| **EasyOCR (keyed)** | `X-Access-Key` | Console endpoint; set the access key in Advanced. |
| **OCR.space** | `apiKey` (required) | Disabled by default until you add a free key. Advanced: scheme, method, input mode (URL/base64/file), OCR engine (1–3), language, flags. |

Adding a new provider is a small, isolated change: a new resolver + one registry case +
one config-union member + one config-page sub-form — no view-model/view edits.

## Releases

Versioning is driven by **Nx Release** (Conventional Commits, single fixed group, one
`v{version}` git tag for both packages). Releases are triggered manually from the
**CI** workflow (`workflow_dispatch` → `release: true`). That one run versions, builds,
creates the GitHub Release, attaches the `.user.js` asset, and deploys the config page
to GitHub Pages — all in the same `release` job (a `GITHUB_TOKEN`-created release does
not fire the `release` event, so the deploy is chained inline rather than split out).
