# UIT Student Captcha

A Tampermonkey/Violentmonkey userscript that **auto-fills the OCR captcha** on the
[UIT student portal](https://student.uit.edu.vn/) sign-in form. It reads the captcha
image, sends it to a configurable OCR provider (with fallback), and types the result
into the captcha field. It does **not** fill credentials or submit the form.

## Repository (pnpm + Nx monorepo)

| Package | Description |
| --- | --- |
| [`packages/uit-student-captcha`](packages/uit-student-captcha) | The userscript (Vite + `vite-plugin-monkey`). |
| [`packages/uit-student-captcha-config-page`](packages/uit-student-captcha-config-page) | React + Vite SPA for configuring OCR providers, deployed to GitHub Pages. |

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
2. Configure your OCR providers from the userscript-manager menu → **Configuration**,
   which opens the hosted [config page](https://kevinnitrog.github.io/uit-student-captcha/configure.html).

## Releases

Versioning is driven by **Nx Release** (Conventional Commits, single fixed group, one
`v{version}` git tag for both packages). Releases are triggered manually from the
**CI** workflow (`workflow_dispatch` → `release: true`). That one run versions, builds,
creates the GitHub Release, attaches the `.user.js` asset, and deploys the config page
to GitHub Pages — all in the same `release` job (a `GITHUB_TOKEN`-created release does
not fire the `release` event, so the deploy is chained inline rather than split out).
