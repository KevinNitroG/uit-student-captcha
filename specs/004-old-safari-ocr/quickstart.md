# Quickstart / Validation: Old-Safari Captcha OCR Compatibility

How to validate that OCR requests no longer pass `Blob`/`FormData` over the transport and that
recognition is unchanged. References `contracts/request-body.contract.md` and `data-model.md`.

## Prerequisites

- Repo bootstrapped: `pnpm install`.
- Node + Vitest (jsdom) — the existing test harness; no live network or browser needed.

## 1. Automated checks (primary)

```bash
pnpm exec nx run-many -t typecheck test build
```

Expected:
- **typecheck** passes — the narrowed `HttpRequest.body: string | ArrayBuffer` (and
  `GmRequestDetails.data`) compiles, and no resolver references `FormData`/`Blob` as a body.
- **test** passes, including the new/updated cases:
  - `multipart.spec.ts`: `asciiBytes` round-trips ASCII; `buildMultipartBody` returns an
    `ArrayBuffer` whose decoded text contains the boundary, each field's `Content-Disposition`,
    `filename="captcha.png"`, `Content-Type: image/png`, and embeds the raw bytes; `contentType`
    carries the same boundary; `blobToUint8Array` returns the Blob's bytes.
  - `EasyOcrResolver.spec.ts`: request `body instanceof ArrayBuffer`, `headers["Content-Type"]`
    starts with `multipart/form-data; boundary=`, `X-Access-Key` still sent; success/empty/4xx
    mappings unchanged.
  - `OcrSpaceResolver.spec.ts`: url & base64 POST modes send a urlencoded **string** body with
    the expected pairs; file mode sends an `ArrayBuffer` multipart body; no test sees a
    `FormData`/`Blob`; in-body error mapping (`OCRExitCode`, `IsErroredOnProcessing`) unchanged.
- **build** produces the userscript bundle with no errors.

## 2. Guard assertion (the regression we are fixing)

At least one assertion per byte-upload provider MUST prove the body is **not** a `Blob`/`FormData`:

```ts
expect(req.body).toBeInstanceOf(ArrayBuffer);
expect(req.body).not.toBeInstanceOf(Blob);
// FormData has no presence in the body union anymore (compile-time), but assert at runtime too.
```

## 3. Manual validation on a real old device (acceptance)

1. Build: `pnpm exec nx build uit-student-captcha`; install the generated `*.user.js` in the
   userscript manager on the old iPhone Safari.
2. Configure a provider (e.g. OCR.space POST + url — the default — and separately EasyOCR).
3. Open `https://student.uit.edu.vn/` signin page.
4. **Expected**: the status badge goes Reading… → Solved and the captcha answer field is filled.
   **No** `DataCloneError` in the console (previously every attempt threw it).
5. Repeat with OCR.space `file` and `base64` POST modes.

## 4. Regression check on a modern browser

Run steps 2–4 on a current desktop browser with a userscript manager. Recognition results MUST
match pre-change behavior for the same captcha image (same provider, same config).
