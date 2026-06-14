# UIT Student Captcha

Tampermonkey/Violentmonkey userscript that auto-fills the OCR captcha on the [UIT student portal](https://student.uit.edu.vn/) sign-in form. Does **not** fill credentials or submit.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Click [uit-student-captcha.user.js](https://github.com/KevinNitroG/uit-student-captcha/releases/latest/download/uit-student-captcha.user.js) to install.

## Configure

Open the config page via the userscript manager menu → **Configure OCR providers**, or go to [kevinnitrog.github.io/uit-student-captcha/configure.html](https://kevinnitrog.github.io/uit-student-captcha/configure.html).

Add at least one provider and enter its API key. The top provider is tried first; lower ones are fallbacks.

| Provider | Key | Notes |
|---|---|---|
| **EasyOCR** | Access key from [console.easyocr.org](https://console.easyocr.org/) | No free keyless endpoint |
| **OCR.space** | API key from [ocr.space](https://ocr.space/) | Free tier ~500 req/day/IP |

**Lowercase OCR result** is on by default — portal captchas are lowercase. Toggle it off on the config page if needed.

## Development

pnpm + Nx monorepo. Three packages: userscript (`uit-student-captcha`), config SPA (`uit-student-captcha-config-page`), shared schema (`uit-student-captcha-config-core`).

```bash
pnpm install
pnpm exec nx run-many -t typecheck test build
pnpm exec nx serve uit-student-captcha-config-page   # config page dev server
```

Built userscript: `dist/uit-student-captcha/uit-student-captcha.user.js`

Releases are automated via release-please (Conventional Commits → Release PR → tag + GitHub Release + deploy).
