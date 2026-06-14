# Contract: Structured-clone-safe OCR request bodies

Governs how the userscript's Model layer builds OCR request bodies so they survive the
`GM_xmlhttpRequest` bridge on old WebKit. Verified behavior, not aspirational.

## C1. Transport seam types (`model/http/HttpClient.ts`, `platform/gm.ts`)

```ts
// HttpRequest.body and GmRequestDetails.data:
body?: string | ArrayBuffer;   // was: string | FormData | Blob
data?: string | ArrayBuffer;   // was: string | FormData | Blob
```

- The transport MUST pass `body`/`data` to `GM_xmlhttpRequest` unchanged.
- No call site MAY construct a `Blob` or `FormData` for a request body. (Compile-time enforced.)

## C2. Multipart encoder (`model/http/multipart.ts`)

```ts
export function asciiBytes(s: string): Uint8Array;          // charCodeAt → bytes (no TextEncoder)
export function blobToUint8Array(blob: Blob): Promise<Uint8Array>; // FileReader.readAsArrayBuffer

export interface MultipartFile {
  readonly name: string;        // form field name, e.g. "file"
  readonly filename: string;    // e.g. "captcha.png"
  readonly contentType: string; // e.g. "image/png"
  readonly bytes: Uint8Array;   // raw image bytes, inserted verbatim
}

export function buildMultipartBody(
  textFields: Record<string, string>,
  file: MultipartFile,
): { body: ArrayBuffer; contentType: string };

export function encodeUrlForm(fields: Record<string, string>): string;
```

Contract:
- `buildMultipartBody` MUST emit, in order: each text field as a `form-data` part, then the
  file part (with `filename` and `Content-Type`), then the closing `--boundary--` delimiter,
  each segment separated by CRLF per RFC 7578.
- The returned `contentType` MUST be `multipart/form-data; boundary=<boundary>` with the **same**
  boundary used in the body.
- `file.bytes` MUST appear verbatim in the body (byte-exact; FR-004).
- All non-image segments MUST be ASCII-encoded via `asciiBytes` (FR-005 — no `TextEncoder`).
- `encodeUrlForm` MUST percent-encode keys and values and join with `&`.

## C3. EasyOCR request (`model/ocr/EasyOcrResolver.ts`)

- MUST read `input.imageBytes` via `blobToUint8Array`, build the body via `buildMultipartBody({},
  { name: "file", filename: "captcha.png", contentType: "image/png", bytes })`.
- MUST set headers `{ "X-Access-Key": <key>, "Content-Type": <contentType> }`.
- MUST send `body` as the returned `ArrayBuffer`. Field name (`file`), filename, bytes, and the
  access-key header MUST be unchanged from today.

## C4. OCR.space POST request (`model/ocr/OcrSpaceResolver.ts`)

Text fields (unchanged set): `apikey`, `OCREngine`, `language`, plus the enabled flags
(`isOverlayRequired`, `detectOrientation`, `scale`, `isTable`).

- `inputMode === "file"`: read bytes via `blobToUint8Array`; `buildMultipartBody(textFields,
  { name: "file", filename: "captcha.png", contentType: "image/png", bytes })`; set
  `Content-Type` to the returned multipart content type; body = `ArrayBuffer`.
- `inputMode === "url"`: `encodeUrlForm({ ...textFields, url: input.imageUrl })`; body = string;
  `Content-Type: application/x-www-form-urlencoded`.
- `inputMode === "base64"`: `encodeUrlForm({ ...textFields, base64Image: <data-url> })`; body =
  string; `Content-Type: application/x-www-form-urlencoded`.
- GET mode is unchanged (query string, no body).
- The set of fields sent and their values MUST match the previous `FormData` exactly.

## C5. Observable guarantees (tested)

- No request reaching the transport has a `Blob` or `FormData` body (asserted in resolver tests).
- A multipart body decoded back to text exposes the expected field names, `filename="captcha.png"`,
  and `Content-Type: image/png`, and embeds the original image bytes.
- A urlencoded body contains the expected `key=value` pairs.
- Success / failure (HTTP status mapping) / missing-config behavior is unchanged.
