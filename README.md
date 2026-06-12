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

**Every OCR backend needs a key**, so nothing is configured out of the box: on first run
the portal shows a "No OCR provider configured → open configuration" notice. Open the
config page (the **Configure OCR providers** menu command on the portal), click
**+ Add provider**, enter a key, and Save. Settings are saved into your userscript
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
| **EasyOCR** | `X-Access-Key` (required) | `console.easyocr.org/api/ocr` — get a key at console.easyocr.org. Sends the image bytes. There is no keyless endpoint. |
| **OCR.space** | `apiKey` (required) | Free key at ocr.space. Advanced: scheme, method, input mode (URL/base64/file), OCR engine (default **2** — engine 1 fails on these small captchas), language, flags. |

Settings carry a schema `version`; on load, a config from a newer build is reset to
defaults (compatible changes migrate forward without data loss).

Adding a new provider is a small, isolated change: a new resolver + one registry case +
one config-union member + one config-page sub-form — no view-model/view edits.

## Releases

Versioning is driven by **Nx Release** (Conventional Commits, single fixed group, one
`v{version}` git tag for both packages). Releases are triggered manually from the
**CI** workflow (`workflow_dispatch` → `release: true`). That one run versions, builds,
creates the GitHub Release, attaches the `.user.js` asset, and deploys the config page
to GitHub Pages — all in the same `release` job (a `GITHUB_TOKEN`-created release does
not fire the `release` event, so the deploy is chained inline rather than split out).
