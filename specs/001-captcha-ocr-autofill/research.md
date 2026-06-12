# Phase 0 Research: Captcha OCR Auto-fill

This file captures the **external OCR API shapes, error/status semantics, and the
key engineering decisions** so they do not have to be re-discovered. Fetched
2026-06-12 from the live provider docs (OCR.space `ocrapi`; EasyOCR help/quick-start).

---

## Decision 1 — `OcrResolver` interface as the single extension seam

- **Decision**: One interface `OcrResolver { readonly id: string; async resolve(input: OcrInput): Promise<OcrResult> }`. Concrete resolvers receive their provider-specific, validated config in their constructor. A `createResolver(entry, http)` factory in `registry.ts` is the **only** place that maps a provider id → implementation.
- **Rationale**: Constitution II (NON-NEGOTIABLE) — adding a provider must not touch ViewModel/View/other resolvers (FR-019). The ViewModel only knows the interface and iterates an `ocrResolvers` array.
- **Alternatives considered**: A single function with a `switch` on provider (rejected: provider branching leaks outside the factory); class inheritance (rejected: interface + composition is lighter and matches MVVM Model boundary).

## Decision 2 — Networking via `GM_xmlhttpRequest` behind an `HttpClient` seam

- **Decision**: Use `GM_xmlhttpRequest` (already granted; `@connect` for the three hosts). Wrap it in `HttpClient.request()` returning `{ status, headers, responseText, response }`. The user suggested builtin `fetch`; **rejected** because OCR providers are cross-origin and page `fetch` is blocked by CORS — only the privileged userscript transport works (spec Assumption + FR-014, Constitution V). The config page (same-origin to nothing it calls) does not make OCR calls, so it needs no transport.
- **Rationale**: Cross-origin reliability; one mockable function for tests (Testing Discipline).
- **Alternatives**: builtin `fetch` (rejected — CORS); `GM.xmlHttpRequest` promise form (acceptable, but the classic `GM_xmlhttpRequest` is uniformly available and already granted).

## Decision 3 — Config transport: hosted React page → `postMessage` → `GM_setValue`

- **Decision**: The userscript `@match`es BOTH the portal and the config page. On the config page it runs a **bridge**: the SPA posts `{ type: 'uoc:set', payload: ProviderConfiguration }` via `window.postMessage`; the bridge validates and writes `GM_setValue`. The SPA requests current config with `{ type: 'uoc:get' }` and the bridge replies `{ type: 'uoc:value', payload }`. GM storage is the single source of truth read on the portal.
- **Rationale**: Matches the spec clarification (Session 2026-06-12). GM storage is per-userscript and persists across reloads/restarts (FR-011, SC-005); `postMessage` is the only channel between page-world React and the userscript sandbox.
- **Alternatives**: `GM_setValue` from a Tampermonkey-injected page UI (rejected — spec mandates a hosted React SPA); `localStorage` shared (rejected — not visible to the userscript sandbox / not synced to GM).
- **Security note**: The bridge MUST verify `event.origin === <config page origin>` and `event.source === window` before trusting a message, and ignore everything else.

## Decision 9 — Shared `config-core` package (not mirrored)

- **Decision**: A third workspace package **`packages/uit-student-captcha-config-core`**
  holds the cross-boundary contract: `ProviderConfiguration`/`ProviderEntry` types,
  `DEFAULT_CONFIG`, `validateConfig()`, and the bridge protocol (`BridgeMessage`,
  `STORAGE_KEY`, `isBridgeMessage`). Both the userscript and the config page depend on
  it (`workspace:*`) and import the contract from one source of truth.
- **Rationale**: The config model crosses a **security boundary** — the SPA posts a
  `ProviderConfiguration`, the userscript bridge origin-checks and `validateConfig()`s
  it before `GM_setValue`. Two hand-mirrored copies (the earlier plan) would drift, and
  drift on the validating side of a trust boundary is where bugs/holes appear. One typed
  definition checked on both sides removes that class of error.
- **Consumed as TypeScript source** (no build artifact): the lib's `package.json`
  `exports["."]` points at `./src/index.ts`; Vite (`vite-plugin-monkey` and the React
  build) inlines it, and tsgo resolves the bare specifier via pnpm's workspace symlink.
  Nx infers a `typecheck` (tsgo) and a `test` (vitest, Node env) target; it has **no
  build target** (nothing to emit). `nx sync` manages the TS project references.
- **Scope boundary**: ONLY the config + bridge contract is shared. Resolvers,
  `HttpClient`, `OcrError`/`OcrResult`, provider response types, the DOM/View, and React
  components stay in their own packages.
- **Not in the Nx release group**: it is private and bundled into both apps, so it needs
  no own version/tag; `release.projects` stays `[userscript, config-page]`.
- Verified: `nx run-many -t typecheck test build` green across all three packages, with
  the config page importing the shared types.

## Decision 4 — Dynamic origins at bundle time via Vite env

- **Decision**: A single env var `VITE_CONFIG_PAGE_ORIGIN` drives the config-page
  origin everywhere. **Default (unset) = `http://localhost:3000`** for local dev;
  production builds pass the deployed origin
  (e.g. `VITE_CONFIG_PAGE_ORIGIN=https://kevinnitrog.github.io/uit-student-captcha pnpm exec nx run-many -t build`).
  The config-page menu-command URL is `${VITE_CONFIG_PAGE_ORIGIN}${BASE}configure.html`,
  where `BASE` is `/` locally and `/uit-student-captcha/` on Pages (the SPA's Vite `base`).

- **Two distinct consumption points — DO NOT confuse them (the "vite meta env at bundle time" requirement):**
  1. **Source code** (`main.ts`, `configBridge.ts`, `bridge/postMessageClient.ts`):
     read `import.meta.env.VITE_CONFIG_PAGE_ORIGIN`. Vite **statically replaces** this
     string literal at bundle time, so the value is frozen into the emitted
     `.user.js` / SPA bundle. This is the canonical "Vite meta env at bundle time" path.
  2. **`vite.config.ts`** (userscript header `match`/`connect`/`homepage`/`downloadURL`,
     and SPA `base`): this file runs in **Node at config time** and therefore **cannot
     use `import.meta.env`**. It MUST read the value via Vite's
     `loadEnv(mode, process.cwd(), "VITE_")` (or `process.env`) and apply the same
     `?? "http://localhost:3000"` default, so the generated userscript `@match`/`@connect`
     entries include the config-page origin (localhost in dev, the deployed host in prod).
- **Userscript header implications**: `@match` and `@connect` must include the
  config-page origin derived from the env (so the bridge runs there). When the origin is
  `http://localhost:3000`, add it to `@match` for local testing. OCR provider hosts
  (`api.easyocr.org`, `console.easyocr.org`, `api.ocr.space`) stay literal in `@connect`.
- **Rationale**: user requirement — dynamic config domain, env-resolved at bundle time;
  localhost default makes the dev/test loop work without deploying Pages.
- **Alternatives**: hardcode (rejected — user wants env-driven); `import.meta.env` inside
  `vite.config.ts` (rejected — undefined there; config runs in Node, hence `loadEnv`);
  runtime config fetch (rejected — extra network dependency).

## Decision 5 — Result normalization

- **Decision**: From a resolver's raw text blocks, strip to `[A-Za-z0-9]`, and if multiple blocks/tokens exist take the **single longest alphanumeric token** (FR-010). Empty/whitespace-only after normalization = provider failure → continue chain.
- **Rationale**: Spec clarification 2026-06-11; captcha field expects one token.

## Decision 6 — Attempt budget & orchestration

- **Decision**: One attempt per provider in configured order; primary once then fallback once; no auto-retry of the same provider (FR-007). Each attempt wrapped in a timeout (Decision 2). Manual "Retry OCR" re-runs the whole chain on the currently-shown image (FR-015/FR-016). A solved-guard prevents re-solving the same image in a loop (FR-017).

---

## Decision 8 — Config-page UI stack: Tailwind v4 + shadcn/ui

- **Decision**: The config SPA uses **Tailwind CSS v4** (via `@tailwindcss/vite`) and
  **shadcn/ui** (new-york style, neutral base, `radix-ui` primitives, lucide icons).
  Wired: `src/index.css` (`@import "tailwindcss"` + theme tokens), `@`→`src` alias in
  `vite.config.ts`/`vitest.config.ts`/the three tsconfigs, `src/lib/utils.ts` (`cn`),
  and `components.json`. Components are vendored under `src/components/ui/` via
  `shadcn add` (invoke today as `mise exec npm:shadcn@latest -- shadcn add <c>`; the
  `shadcn` mise shell-alias works in interactive shells). Verified: `nx run-many -t
  typecheck test build` green; the built page renders styled (Chrome DevTools).
- **Monorepo notes (gotchas captured so they aren't re-hit)**:
  - The shadcn CLI reads the package **root** `tsconfig.json` for alias resolution, so
    `paths` is mirrored there too (the app/spec tsconfigs hold the real ones). Without
    it the CLI writes to a literal `@/` directory.
  - This TS (tsgo) **removed `baseUrl`** — use bare `paths: { "@/*": ["./src/*"] }`
    (resolved relative to the tsconfig dir).
  - Strict `noPropertyAccessFromIndexSignature` → read `loadEnv` results with bracket
    notation: `env["VITE_CONFIG_PAGE_ORIGIN"]`.
  - Tailwind processing lives only in `vite.config.ts`; the alias is added to
    `vitest.config.ts` too so tests can import `@/…`.
- **CI**: `.github/workflows/ci.yaml` sets a workflow-level
  `env.VITE_CONFIG_PAGE_ORIGIN = https://kevinnitrog.github.io/uit-student-captcha` so
  the deployed Pages bundle and the released userscript bake the production origin
  (local builds keep the `http://localhost:3000` default).

## Decision 7 — Verified live portal DOM (Chrome DevTools, 2026-06-12)

Inspected `https://student.uit.edu.vn/` directly. The signin block is Drupal's
`user_login_block` with the **"english_captcha"** module. The captcha is a Drupal
distorted-text PNG — the answer word is rendered as the image, so it is a genuine
OCR target (NOT a semantic riddle). Confirmed: the image at
`.../english_captcha/captcha_*.png` rendered the distorted word **"old"**, and the
adjacent `<strong>` text "What is the opposite of 'young'?" is decorative framing
around that one answer word. (The image `alt` happened to read `captcha:old` on the
inspected page, but the View MUST NOT depend on `alt` leaking the answer — it is not
guaranteed and OCR of the PNG is the reliable path.)

**Verified selectors (for the View layer; all guarded — Constitution V):**

| Element | Selector | name / id |
|---------|----------|-----------|
| Login form | `#user-login-form` | `form_id` hidden = `user_login_block` |
| Captcha image | `.english-captcha-image img` (src matches `/english_captcha/captcha_`) | — |
| Captcha answer input | `#edit-english-captcha-answer` | `name="english_captcha_answer"` |
| Username (DO NOT touch) | `#edit-name` | `name="name"` |
| Password (DO NOT touch) | `#edit-pass` | `name="pass"` |
| Submit (DO NOT touch) | `#edit-submit--2` | `name="op"` |

Notes:
- There is **no in-page captcha-refresh button**; a new challenge comes only on full
  page reload — consistent with FR-016 (solve at load; "Retry OCR" re-reads current image).
- The captcha image is a same-origin `student.uit.edu.vn` URL. For byte-based providers
  (EasyOCR), the View obtains the **bytes** by drawing the already-loaded `<img>` to a
  `<canvas>` (`toBlob`/`toDataURL`) — same-origin, so the canvas is untainted, and this
  avoids a second request that could (in principle) return a different image. OCR.space
  receives the **public URL** directly (the captcha URL is confirmed public/stable, not
  session-bound — spec Clarification 2026-06-12).
- The status badge / "Retry OCR" control mounts inside `.captcha` (or right after
  `.english-captcha-image`) so it sits directly beneath the captcha image (FR-015).
- Hidden fields `captcha_sid` / `captcha_token` bind the challenge server-side; the
  script only fills the answer text and never resubmits.

## EasyOCR API (provider id: `easyocr`)

Two endpoints — a **free, keyless** one (default primary, FR-018) and a **keyed console** one.

### Free / keyless endpoint
- **Method/URL**: `POST https://api.easyocr.org/ocr` (China mirror `https://cn-api.easyocr.org/ocr`).
- **Auth**: none.
- **Body**: `multipart/form-data`, field name **`file`** = image bytes. (Image **bytes** only — no URL mode.)
- **Limits**: max file size 10 MB; formats JPG/PNG/BMP/GIF/WebP. Advertised "no usage limits".
- **Success response** (HTTP 200):
  ```json
  {
    "words": [
      { "text": "Akile Exchange", "left": 53.9, "top": 79.7, "right": 508.6, "bottom": 171.1, "rate": 0.998 }
    ]
  }
  ```
  Recognized text = each `words[i].text`; `rate` is confidence 0–1. (Some help pages show an alternate `{ success, text, confidence }` shape — treat `words[]` as canonical and fall back to reading `text` if `words` is absent.)

### Keyed console endpoint
- **Method/URL**: `POST https://console.easyocr.org/api/ocr`.
- **Auth**: header **`X-Access-Key: eocr_...`** (required).
- **Body**: same `multipart/form-data` `file` field.
- **Success response** (HTTP 200) adds metadata:
  ```json
  {
    "elapsed_seconds": 0.47,
    "message": "OCR recognition succeeded.",
    "remaining_quota": 1093,
    "request_id": "b9f0...",
    "result_summary": "Recognition completed with 13 text blocks.",
    "user": "demo_user",
    "words": [ { "text": "...", "left": 53.9, "top": 79.7, "right": 508.6, "bottom": 171.1, "rate": 0.998 } ]
  }
  ```

### EasyOCR error model (HTTP status driven)
EasyOCR signals failure via **HTTP status code** (body shape for errors is not strongly documented; read `message`/`error` if present):

| HTTP | Meaning | Mapped `OcrErrorCode` |
|------|---------|-----------------------|
| 400 | Bad request / malformed | `BAD_REQUEST` |
| 401/403 | Missing/invalid `X-Access-Key` (keyed) | `AUTH` |
| 413 | Image too large (>10 MB) | `PAYLOAD_TOO_LARGE` |
| 415 | Unsupported image format | `UNSUPPORTED_MEDIA` |
| 429 | Too many requests | `RATE_LIMIT` |
| 500 | Server error | `PROVIDER_ERROR` |
| (200 but `words` empty/missing) | No text recognized | `EMPTY_RESULT` |

---

## OCR.space API (provider id: `ocrspace`)

Highly configurable; **URL by default** for our use (the captcha PNG is a public
`.../english_captcha/captcha_*.png` URL), with base64/file modes also supported.

- **Endpoints** (HTTP and HTTPS both supported):
  - `POST https://api.ocr.space/parse/image` (full — `file` / `base64Image` / `url`)
  - `GET  https://api.ocr.space/parse/imageurl` (simple — `url` only; params `apikey`,`url`,`language`,`isOverlayRequired`)
- **Auth**: `apikey` (in body for POST, or query/header). Free key via registration.
- **Key request params**:
  | Param | Notes |
  |-------|-------|
  | `apikey` | required |
  | `url` | remote image URL (our default input) — mutually exclusive with `file`/`base64Image` |
  | `base64Image` | base64 with content-type prefix (e.g. `data:image/png;base64,...`) |
  | `file` | multipart upload |
  | `OCREngine` | `1` \| `2` \| `3` (default 1) |
  | `language` | `eng` default (engine 1); `auto` engines 2/3 |
  | `isOverlayRequired`, `detectOrientation`, `scale`, `isTable`, `filetype` | optional tuning |
- **Limits (free tier)**: 25,000 req/month, **500 req/day per IP**, **1 MB** file size, 3 PDF pages.

### Success / structured response (almost always HTTP 200 — errors are in-body)
```json
{
  "ParsedResults": [
    {
      "TextOverlay": { "Lines": [], "HasOverlay": false, "Message": null },
      "FileParseExitCode": 1,
      "ParsedText": "RECOGNIZED TEXT\n",
      "ErrorMessage": "",
      "ErrorDetails": ""
    }
  ],
  "OCRExitCode": 1,
  "IsErroredOnProcessing": false,
  "ErrorMessage": null,
  "ErrorDetails": null,
  "SearchablePDFURL": null,
  "ProcessingTimeInMilliseconds": "313"
}
```
Recognized text = `ParsedResults[0].ParsedText`.

### OCR.space error model (in-body, NOT HTTP status)
OCR.space returns **HTTP 200** even on most logical failures; the truth is in
`OCRExitCode` + `IsErroredOnProcessing` + `ErrorMessage`:

| `OCRExitCode` | Meaning | Mapped `OcrErrorCode` |
|---------------|---------|-----------------------|
| 1 | Success (all pages parsed) | — (success) |
| 2 | Partial success (some pages failed) | success if text present, else `EMPTY_RESULT` |
| 3 | All pages failed | `PROVIDER_ERROR` |
| 4 | Fatal parsing error | `PROVIDER_ERROR` |

Per-page `FileParseExitCode`: `1` success; `0` file not found; `-10` parse error;
`-20` timeout; `-30` validation error; `-99` unknown.

Additional mapping rules:
- `IsErroredOnProcessing === true` → use `ErrorMessage` (e.g. invalid API key, file
  too large, rate limit text) → `AUTH` / `PAYLOAD_TOO_LARGE` / `RATE_LIMIT` /
  `PROVIDER_ERROR` by message inspection.
- HTTP 403 → `AUTH` (bad/expired key); HTTP 429 → `RATE_LIMIT`; HTTP 5xx → `PROVIDER_ERROR`.
- `ParsedText` empty/whitespace after normalization → `EMPTY_RESULT`.

---

## Unified `OcrErrorCode` taxonomy (used by both resolvers)

`BAD_REQUEST | AUTH | PAYLOAD_TOO_LARGE | UNSUPPORTED_MEDIA | RATE_LIMIT |
TIMEOUT | NETWORK | PROVIDER_ERROR | EMPTY_RESULT | MISSING_CONFIG`

Each resolver maps its provider's HTTP/in-body status into one of these and throws
`OcrError(code, message, { provider, httpStatus?, raw? })`. The ViewModel treats any
`OcrError` as "this provider failed → try next"; the View renders the human message
on the badge after the chain is exhausted (FR-014/FR-015).

**Output**: all NEEDS CLARIFICATION resolved — no open unknowns. Provider shapes,
error mapping, transport, config bridge, and dynamic-origin strategy are fixed.
