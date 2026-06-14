# Implementation Plan: Old-Safari Captcha OCR Compatibility

**Branch**: `004-old-safari-ocr` | **Date**: 2026-06-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-old-safari-ocr/spec.md`

## Summary

On old iOS Safari / old WebKit userscript managers, every OCR request fails with
`DataCloneError: The object can not be cloned.` The cause is the request body: each POST is a
`FormData` (EasyOCR and OCR.space `file` mode also embed a `Blob`), and `GM_xmlhttpRequest` must
structured-clone the request `data` across the userscript↔host bridge — which old WebKit cannot
do for `Blob`/`FormData`. The fix removes `Blob`/`FormData` from the transport entirely: file
uploads (EasyOCR; OCR.space `file`) send a manually-assembled `multipart/form-data` body as an
**`ArrayBuffer`** (ASCII framing built with `charCodeAt`, no `TextEncoder`; image bytes read via
`FileReader.readAsArrayBuffer`); the non-file OCR.space POST modes (`url`, `base64` — the default
provider is POST+url) send a urlencoded **`string`** body. The same-origin canvas extraction is
unchanged. A small shared `model/http/multipart.ts` helper does the encoding; the transport body
type narrows to `string | ArrayBuffer` to enforce the fix at compile time.

## Technical Context

**Language/Version**: TypeScript 5.x under `strict` mode.

**Primary Dependencies**: pnpm + Nx monorepo; `vite-plugin-monkey` (userscript build); Vitest +
jsdom (tests). No new runtime dependencies.

**Storage**: None. No GM storage, no config-schema, no `CONFIG_VERSION` change.

**Testing**: Vitest with jsdom; `nx run-many -t typecheck test build`. jsdom provides `FileReader`,
`Blob`, and `ArrayBuffer` so the encoder and resolvers are fully unit-testable offline.

**Target Platform**: Tampermonkey/Violentmonkey-compatible userscript on
`https://student.uit.edu.vn/*`, including old iOS Safari / old WebKit. Compatibility floor for
the new code: `FileReader.readAsArrayBuffer`, `Uint8Array`, `ArrayBuffer`, `charCodeAt` (all
universal) — explicitly avoiding `TextEncoder` (Safari 10.1+) and `Blob.arrayBuffer()` (14+).

**Project Type**: Nx monorepo. Only `packages/uit-student-captcha` (the userscript) is touched.

**Performance Goals**: Negligible. Building a multipart body for a tiny captcha PNG is a single
allocation + copy.

**Constraints**: Constitution I (encoding stays in the Model layer; View/ViewModel untouched);
II (no resolver-registry change; the helper is provider-agnostic); III (strict TS, narrowed body
type, no `any`); IV (no behavior/config changes — modes still configurable); V (no new deps, no
new grants).

**Scale/Scope**: 1 new module + 1 new test file; edits to 4 files (2 resolvers, HttpClient,
gm.ts) + 3 resolver/http test files. No config-page, schema, or UI changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### Constitution I — MVVM layer boundaries ✅
All changes are in the Model layer (`model/http`, `model/ocr`) and the `platform/gm` transport
wrapper. The View (`PortalView`, including `canvasExtractBytes`) and the ViewModel are untouched.

### Constitution II — Provider abstraction ✅
No change to the `OcrResolver` interface, the registry, or the factory. `multipart.ts` is
provider-agnostic plumbing (no `if provider === …`). Each resolver still builds its own request;
the only per-mode branching (OCR.space `url`/`base64`/`file`) already lived inside
`OcrSpaceResolver` and stays there.

### Constitution III — Strict type safety ✅
`HttpRequest.body` and `GmRequestDetails.data` narrow to `string | ArrayBuffer`, turning FR-001
("no `Blob`/`FormData` over the transport") into a compile-time guarantee. New helper signatures
are fully typed; no `any`. `nx run-many -t typecheck` must pass with zero errors.

### Constitution IV — Configurability ✅
No constants hardcoded, no config schema touched. All OCR.space modes remain selectable; only the
on-the-wire encoding changes.

### Constitution V — Minimal footprint ✅
No new runtime dependency (no multipart/UUID library), no new `@grant`, no new GM storage. Boundary
uses `Math.random` rather than `crypto.randomUUID`.

### Testing Discipline ✅
New `multipart.spec.ts` (encoder unit tests). Updated `EasyOcrResolver.spec.ts`,
`OcrSpaceResolver.spec.ts`, `HttpClient.spec.ts` assert the new body shapes and that no
`Blob`/`FormData` reaches the transport, while keeping the existing success/failure/missing-config
coverage. All run on Node+jsdom, no live network.

**Result**: PASS — no violations, Complexity Tracking omitted.

## Project Structure

### Documentation (this feature)

```text
specs/004-old-safari-ocr/
├── plan.md              # This file
├── research.md          # 7 decisions (root cause, ArrayBuffer body, no TextEncoder, …)
├── data-model.md        # Request-body shapes + narrowed transport types
├── quickstart.md        # Validation scenarios
├── contracts/
│   └── request-body.contract.md
└── checklists/
    └── requirements.md
```

### Source Code (affected files)

```text
packages/uit-student-captcha/
├── src/
│   ├── platform/
│   │   └── gm.ts                         ← GmRequestDetails.data: string | ArrayBuffer
│   └── model/
│       ├── http/
│       │   ├── HttpClient.ts             ← HttpRequest.body: string | ArrayBuffer
│       │   ├── HttpClient.spec.ts        ← assert ArrayBuffer body passed as data
│       │   ├── multipart.ts              ← NEW: asciiBytes, blobToUint8Array,
│       │   │                                buildMultipartBody, encodeUrlForm
│       │   └── multipart.spec.ts         ← NEW: encoder unit tests
│       └── ocr/
│           ├── EasyOcrResolver.ts        ← multipart ArrayBuffer body + Content-Type
│           ├── EasyOcrResolver.spec.ts   ← assert ArrayBuffer body, no Blob/FormData
│           ├── OcrSpaceResolver.ts       ← file→multipart; url/base64→urlencoded string
│           └── OcrSpaceResolver.spec.ts  ← assert per-mode body shapes
```

**Structure Decision**: Existing three-package monorepo; changes confined to the userscript
package's Model + platform layers. No new package, no cross-package change.

## Complexity Tracking

> No Constitution violations — table omitted per template instructions.

## Phase 0: Research

*Complete — see [research.md](research.md).*

Key resolutions: root cause is the GM bridge serializing `FormData`/`Blob`, not the canvas (D1);
bodies become `ArrayBuffer` (binary) + urlencoded `string` (text) (D2); ASCII framing via
`charCodeAt`, no `TextEncoder` (D3); `Blob`→bytes via `FileReader.readAsArrayBuffer`, not
`Blob.arrayBuffer()` (D4); shared `multipart.ts` helper (D5); narrow transport body type to
`string | ArrayBuffer` (D6); random-suffix boundary, no `crypto` (D7).

## Phase 1: Design & Contracts

*Complete — see [data-model.md](data-model.md), [contracts/request-body.contract.md](contracts/request-body.contract.md), [quickstart.md](quickstart.md).*

### Implementation steps (ordered by dependency)

**Step 1 — New encoder module** (`model/http/multipart.ts`)

- `asciiBytes(s: string): Uint8Array` — `for` loop with `charCodeAt(i) & 0xff`.
- `blobToUint8Array(blob: Blob): Promise<Uint8Array>` — `FileReader.readAsArrayBuffer`, resolve
  `new Uint8Array(reader.result as ArrayBuffer)`, reject on `reader.error` (mirror the existing
  `blobToDataUrl` shape in `OcrSpaceResolver`).
- `buildMultipartBody(textFields: Record<string,string>, file: MultipartFile)`:
  - boundary = `"----uocFormBoundary" + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)`.
  - Assemble an ordered list of segments: for each text field the `--boundary\r\nContent-
    Disposition: form-data; name="k"\r\n\r\nv\r\n` string; then the file part header string
    `--boundary\r\nContent-Disposition: form-data; name="file"; filename="captcha.png"\r\n
    Content-Type: image/png\r\n\r\n`, then `file.bytes`, then `"\r\n"`; then closing
    `--boundary--\r\n`.
  - Convert each string segment with `asciiBytes`; compute total length; allocate one
    `Uint8Array`, `set()` each segment/byte-block at the running offset; return
    `{ body: buf.buffer, contentType: \`multipart/form-data; boundary=${boundary}\` }`.
- `encodeUrlForm(fields: Record<string,string>): string` —
  `Object.entries(fields).map(([k,v]) => \`${encodeURIComponent(k)}=${encodeURIComponent(v)}\`).join("&")`.

**Step 2 — Narrow transport body types** (`model/http/HttpClient.ts`, `platform/gm.ts`)

- `HttpClient.ts`: `body?: string | ArrayBuffer;` (was `string | FormData | Blob`).
- `gm.ts`: `data?: string | ArrayBuffer;` (was `string | FormData | Blob`). `gmXmlHttpRequest`
  passes it through unchanged — no logic change.

**Step 3 — EasyOCR resolver** (`model/ocr/EasyOcrResolver.ts`)

Replace the `FormData` block:
```ts
// before: const form = new FormData(); form.append("file", input.imageBytes, "captcha.png");
const bytes = await blobToUint8Array(input.imageBytes);
const { body, contentType } = buildMultipartBody(
  {},
  { name: "file", filename: "captcha.png", contentType: "image/png", bytes },
);
const headers = { "X-Access-Key": this.accessKey, "Content-Type": contentType };
// http.request({ ..., headers, body, ... })
```
Keep the existing `if (!input.imageBytes) throw BAD_REQUEST` guard ahead of the read (FR-008).

**Step 4 — OCR.space resolver** (`model/ocr/OcrSpaceResolver.ts`)

Rework `requestPost` (and drop the local `FormData`):
```ts
const fields: Record<string,string> = {
  apikey: this.entry.apiKey,
  OCREngine: String(this.entry.ocrEngine),
  language: this.entry.language,
};
this.appendFlags(fields);              // appendFlags now writes into a Record, not FormData

if (this.entry.inputMode === "file") {
  if (!input.imageBytes) throw BAD_REQUEST;
  const bytes = await blobToUint8Array(input.imageBytes);
  const { body, contentType } = buildMultipartBody(fields,
    { name: "file", filename: "captcha.png", contentType: "image/png", bytes });
  return this.http.request({ method:"POST", url:this.endpoint, headers:{ "Content-Type": contentType },
                             body, timeoutMs:this.timeoutMs, responseType:"json" });
}
// url / base64 → urlencoded string
if (this.entry.inputMode === "url") {
  if (!input.imageUrl) throw BAD_REQUEST;
  fields["url"] = input.imageUrl;
} else { // base64
  if (!input.imageBytes) throw BAD_REQUEST;
  fields["base64Image"] = await blobToDataUrl(input.imageBytes);
}
return this.http.request({ method:"POST", url:this.endpoint,
  headers:{ "Content-Type": "application/x-www-form-urlencoded" },
  body: encodeUrlForm(fields), timeoutMs:this.timeoutMs, responseType:"json" });
```
- `appendFlags` changes signature to take `Record<string,string>` and set `"true"` values (same
  flags, same values).
- `blobToDataUrl` stays (used by base64 mode). `requestGet` is unchanged.

**Step 5 — Encoder tests** (`model/http/multipart.spec.ts`, new)

- `asciiBytes("AB")` → `Uint8Array [65,66]`.
- `buildMultipartBody({apikey:"k"}, {name:"file",filename:"captcha.png",contentType:"image/png",
  bytes:new Uint8Array([1,2,3])})`: decode `body` (e.g. `String.fromCharCode(...new Uint8Array(body))`)
  and assert it contains the boundary, `name="apikey"`, the value `k`,
  `filename="captcha.png"`, `Content-Type: image/png`, and the bytes `1,2,3` at the tail; assert
  `contentType` contains the same boundary; assert `body instanceof ArrayBuffer`.
- `blobToUint8Array(new Blob(["bytes"]))` resolves to the bytes of "bytes".
- `encodeUrlForm({a:"1",b:"x y"})` → `"a=1&b=x%20y"`.

**Step 6 — EasyOCR test updates** (`EasyOcrResolver.spec.ts`)

- Add a case capturing the request: `body instanceof ArrayBuffer`, not `Blob`/`FormData`;
  `headers["Content-Type"]` starts with `multipart/form-data; boundary=`; decoded body contains
  `name="file"` + `filename="captcha.png"`. Keep the `X-Access-Key` assertion and all
  status-mapping cases (they already pass with the existing `fakeHttpClient`).

**Step 7 — OCR.space test updates** (`OcrSpaceResolver.spec.ts`)

- url-mode POST: `typeof req.body === "string"`, contains `url=` (encoded) + `apikey=`,
  `Content-Type: application/x-www-form-urlencoded`.
- base64-mode POST: string body contains `base64Image=` (encoded data URL).
- file-mode POST: `req.body instanceof ArrayBuffer`, multipart Content-Type, decoded body has
  `filename="captcha.png"`. Provide `input.imageBytes` as a `Blob` for file/base64 cases.
- Assert no case yields a `FormData`/`Blob` body. Keep the in-body error-mapping tests
  (`IsErroredOnProcessing`, `OCRExitCode`, 403/429/5xx).

**Step 8 — HttpClient test** (`HttpClient.spec.ts`)

- Add a case: a POST with an `ArrayBuffer` body passes that exact `data` to the fake
  `GM_xmlhttpRequest` (via `installFakeXhr`, capturing `details.data`), confirming the transport
  forwards binary bodies untouched.

**Step 9 — Verify**

`pnpm exec nx run-many -t typecheck test build` — zero typecheck errors (the narrowed body type
proves no `Blob`/`FormData` remains), all tests green, userscript bundle builds.

### Agent context update

`CLAUDE.md`'s SPECKIT block updated to point at `specs/004-old-safari-ocr/plan.md`.

## Phase 2

`/speckit-tasks` will turn the Steps above into an ordered `tasks.md`. Per the repo workflow rule,
all `specs/004-old-safari-ocr/` files, `.specify/feature.json`, and `CLAUDE.md` are committed in
the same PR/push as the implementation.
