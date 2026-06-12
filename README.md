# UIT Student Captcha

A Tampermonkey/Violentmonkey userscript that **auto-fills the OCR captcha** on the
[UIT student portal](https://student.uit.edu.vn/) sign-in form. It reads the captcha
image, sends it to a configurable OCR provider (with fallback), and types the result
into the captcha field. It does **not** fill credentials or submit the form.

## Installation

1. **Install a userscript manager** — [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Firefox/Edge) or [Violentmonkey](https://violentmonkey.github.io/) (Chrome/Firefox).
2. **Install the userscript** — click [uit-student-captcha.user.js](https://github.com/KevinNitroG/uit-student-captcha/releases/latest/download/uit-student-captcha.user.js); your userscript manager will prompt you to install it.
3. **Open the portal** — go to [https://student.uit.edu.vn/](https://student.uit.edu.vn/).

On first visit you'll see a notice beneath the captcha: *"No OCR provider configured"*.
You need to add at least one provider (see below) before the script can solve captchas.

## Getting API keys

Every OCR provider requires a key. Get yours before configuring:

### EasyOCR

1. Go to [console.easyocr.org](https://console.easyocr.org/) and sign up / log in.
2. Navigate to the API section and generate an **access key** (starts with `eocr_...`).
3. This is your `X-Access-Key`. There is no free keyless endpoint.

### OCR.space

1. Go to [ocr.space](https://ocr.space/) and register a free account.
2. Copy your **API key** from the dashboard.
3. The free tier allows ~500 requests/day per IP.

## Configuration

Open the configuration page:

- **Via the userscript menu**: on any `student.uit.edu.vn` page, click your userscript
  manager's toolbar icon → **Configure OCR providers**.
- **Direct link**: [kevinnitrog.github.io/uit-student-captcha/configure.html](https://kevinnitrog.github.io/uit-student-captcha/configure.html)

On the config page:

1. Click **+ Add provider** and choose **EasyOCR** or **OCR.space**.
2. Enter the provider's key (and any advanced options).
3. Add additional providers for fallback ordering — the top entry is tried first.
4. Click **Save** (the tab must stay open briefly to save via the userscript bridge).

Settings persist in your userscript manager's storage across reloads and browser restarts.

### Provider reference

| Provider | Key field | Notes |
|---|---|---|
| **EasyOCR** | `accessKey` (`X-Access-Key`) | Endpoint: `POST https://console.easyocr.org/api/ocr`. Sends image bytes. |
| **OCR.space** | `apiKey` | Free tier ~500 req/day/IP, 1 MB limit. Default OCR engine **2** (engine 1 fails on these captchas). Supports URL/base64/file input modes. |

- **Fallback chain**: providers are tried top-to-bottom; each gets one attempt, then the
  next is tried only if the previous one failed.
- **Timeout**: per-attempt timeout defaults to 15 s (configurable).
- **Toggle**: disable a provider without deleting it.

## Usage on the portal

Once configured, visit any page on `https://student.uit.edu.vn/*` that shows the sign-in
form. The script automatically:

- Detects the captcha image and the answer field
- Sends the image to the configured OCR provider(s)
- Fills the recognized text into the captcha answer field

**The script never** fills your username/password or clicks the Sign-in button.

If you're already typing the captcha yourself, your input is left alone — the script
skips OCR entirely. Only clicking **↻ Retry OCR** (shown beneath the captcha on failure)
overwrites a pre-filled value.

### Status indicators

A small badge appears beneath the captcha image:

- **No provider configured** (blue/neutral) — go add a provider via the menu command.
- **Loading / recognizing** — OCR is in progress.
- **Failed** (red) — all providers exhausted, with a **↻ Retry OCR** button to re-run
  the chain on the current image.
- **Success** — no badge shown; the field is filled silently.

### Edge cases

- **No sign-in form on the page** (e.g. already logged in): script does nothing, logs
  an informational message to the console.
- **Captcha image not loaded yet**: script waits briefly for it to appear.
- **Network / provider error**: error propagates gracefully — no uncaught exceptions,
  no broken page state.

---

## Development

This is a pnpm + Nx monorepo with three packages:

| Package | Description |
|---|---|
| [`packages/uit-student-captcha`](packages/uit-student-captcha) | The userscript (Vite + `vite-plugin-monkey`), structured MVVM: model (OCR resolvers/transport), view-model (fallback chain), view (portal DOM + status badge), bridge (config-page mode). |
| [`packages/uit-student-captcha-config-page`](packages/uit-student-captcha-config-page) | React + Vite SPA (Tailwind v4 + shadcn/ui) for configuring OCR providers, deployed to GitHub Pages. |
| [`packages/uit-student-captcha-config-core`](packages/uit-student-captcha-config-core) | Shared, source-only library holding the config schema, `validateConfig()`, and the postMessage bridge contract used by both apps. |

### Prerequisites

- Node ^26, pnpm (pinned via `.tool-versions`)
- A userscript manager (Tampermonkey/Violentmonkey) for testing

### Commands

```bash
pnpm install
pnpm exec nx run-many -t typecheck test build       # check everything
pnpm exec nx build uit-student-captcha              # build just the userscript
pnpm exec nx serve uit-student-captcha-config-page  # run the config page locally
```

The built userscript is at `packages/uit-student-captcha/dist/uit-student-captcha.user.js`
— load it into your userscript manager for manual testing.

### Config-page origin

`VITE_CONFIG_PAGE_ORIGIN` is resolved at bundle time. Default (unset) is
`http://localhost:3000` for local dev. For production:

```bash
VITE_CONFIG_PAGE_ORIGIN="https://kevinnitrog.github.io/uit-student-captcha" pnpm exec nx run-many -t build
```

### Testing

```bash
pnpm exec nx run-many -t test     # unit tests (Vitest + jsdom)
pnpm exec nx run-many -t typecheck  # TypeScript type checking (tsgo)
```

### Releases

Versioning is driven by **Nx Release** (Conventional Commits, single fixed group).
Releases are triggered manually from the **CI** workflow (`workflow_dispatch` →
`release: true`), which versions, builds, creates the GitHub Release, attaches the
`.user.js` asset, and deploys the config page to GitHub Pages.
