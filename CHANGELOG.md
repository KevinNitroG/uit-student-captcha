# Changelog

## [1.1.2](https://github.com/KevinNitroG/uit-student-captcha/compare/v1.1.1...v1.1.2) (2026-06-12)


### Continuous Integration

* **release:** bypass Merge plugin so release PRs round-trip and cut tags ([bd74c45](https://github.com/KevinNitroG/uit-student-captcha/commit/bd74c45e3c10445b44429258bd7de64b2c9d315c))
* **release:** force empty component so the merged PR round-trips to a v-tag ([4128024](https://github.com/KevinNitroG/uit-student-captcha/commit/412802420e1870f2c3503c56bfee116dbd3c3cba))
* **release:** keep component in PR title but drop it from the tag ([c572f45](https://github.com/KevinNitroG/uit-student-captcha/commit/c572f45ae3d5ec07a10795e18d7ccdd92af935a9))
* **release:** use canonical single-package config so one PR cuts one v-tag ([e6f7219](https://github.com/KevinNitroG/uit-student-captcha/commit/e6f7219093fd1247c0b9431f346cc66b88fd6621))

## [1.1.1](https://github.com/KevinNitroG/uit-student-captcha/compare/v1.1.0...v1.1.1) (2026-06-12)


### Continuous Integration

* **release:** match empty component so merged Release PR cuts the tag ([b762c07](https://github.com/KevinNitroG/uit-student-captcha/commit/b762c076a130154f647accc38fc9a884709afc72))

## [1.1.0](https://github.com/KevinNitroG/uit-student-captcha/compare/v1.0.0...v1.1.0) (2026-06-12)


### Features

* OCR captcha foundation, US1 autofill, OCR.space resolver; co-locate tests ([cc77800](https://github.com/KevinNitroG/uit-student-captcha/commit/cc778002d34325f0fb40ff518ee664b200905504))
* **us2:** OCR provider fallback chain + inline status badge ([bc62913](https://github.com/KevinNitroG/uit-student-captcha/commit/bc629134ae5e74d13755f16e349f76bb7adfad22))
* **us3:** hosted config page + postMessage bridge; polish ([903191d](https://github.com/KevinNitroG/uit-student-captcha/commit/903191dea07ee20a6fe70ced56b771cb5819a9e5))
* **view:** preserve user-typed captcha; only Retry overwrites ([876de94](https://github.com/KevinNitroG/uit-student-captcha/commit/876de94d3e8358c25aaf48cfe665c60dc2a69b92))


### Bug Fixes

* **bridge:** access GM via vite-plugin-monkey $ import; use unsafeWindow ([3d83a3a](https://github.com/KevinNitroG/uit-student-captcha/commit/3d83a3a6f963b0e81810d772a5cd740ffb107384))
* idk we need to provide the pnpm exec while wrapping with nx cache action ([f925ebd](https://github.com/KevinNitroG/uit-student-captcha/commit/f925ebdbd68d281bcc384175608a27a26c6cbb0d))
* mise alias nx ([70db9af](https://github.com/KevinNitroG/uit-student-captcha/commit/70db9afbc9c53b8a9a4168fb7ede448566739a7a))
* **ocr:** EasyOCR is key-only (console endpoint); empty default chain ([a38e582](https://github.com/KevinNitroG/uit-student-captcha/commit/a38e5824df2ac512e0afb06e7e3b2a18c2bdb40d))
* **ocr:** heal stale EasyOCR endpoint, default OCR.space engine 2, defer run ([0240383](https://github.com/KevinNitroG/uit-student-captcha/commit/0240383f7ee2fbaeafb823466958ef4b4671e4f2))
