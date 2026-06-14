# Feature Specification: Old-Safari Captcha OCR Compatibility

**Feature Branch**: `004-old-safari-ocr`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Make captcha OCR work on old iOS Safari / old WebKit userscript managers. Root cause: the captcha image bytes are sent to the OCR providers (EasyOCR and OCR.space) as a FormData containing a Blob, which GM_xmlhttpRequest must serialize across the userscript bridge using the structured clone algorithm; old WebKit cannot structured-clone a Blob/FormData and throws \"DataCloneError: The object can not be cloned.\" Fix: stop sending Blob/FormData over the GM transport. Build the multipart/form-data request body manually as an ArrayBuffer/Uint8Array, set the Content-Type header with the boundary explicitly, and pass the ArrayBuffer as the request data — ArrayBuffers are reliably structured-cloneable on old WebKit. This applies to both EasyOCR (multipart file upload, the only mode) and OCR.space file mode. Build the ASCII portions without depending on TextEncoder (use charCodeAt into a Uint8Array) to remain compatible with very old Safari. The same-origin canvas toBlob extraction stays unchanged."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Captcha solved on an old iPhone Safari (Priority: P1)

A UIT student opens the student portal signin page in an older iPhone's Safari (an
older WebKit version) with a userscript manager installed and the captcha userscript
active. The captcha image is read and a configured OCR provider is contacted via a
POST request (EasyOCR; or OCR.space in any of its POST modes — the default is POST +
url). The answer field is auto-filled with the recognized text instead of the status
badge reporting a read failure.

Today every one of these POST requests is built with a `FormData` body (EasyOCR and
OCR.space file mode also wrap a `Blob`), which is exactly what old WebKit cannot
serialize across the userscript bridge — so the student gets a `DataCloneError` and no
captcha is ever solved.

**Why this priority**: This is the entire purpose of the feature — today these users
get `DataCloneError` and the script cannot solve any captcha at all, making the script
useless on their device. Restoring this is the MVP.

**Independent Test**: Configure a byte-upload provider, simulate an environment whose
request transport rejects non-cloneable payloads (Blob/FormData) the way old WebKit
does, run the resolve flow against a mocked provider response, and confirm a solved
result with the recognized text — with no `DataCloneError` surfaced.

**Acceptance Scenarios**:

1. **Given** a configured EasyOCR provider and a captcha image read into bytes, **When**
   the resolve chain runs on a transport that cannot clone a Blob/FormData, **Then** the
   request is delivered successfully and the captcha is solved (answer field filled).
2. **Given** a configured OCR.space provider using POST in url mode (the default), **When**
   the resolve chain runs on the same restricted transport, **Then** the request is
   delivered successfully and the captcha is solved.
3. **Given** a configured OCR.space provider using POST in base64 or file mode, **When**
   the resolve chain runs on the same restricted transport, **Then** the request is
   delivered successfully and the captcha is solved.
4. **Given** the same providers running on a modern browser/transport, **When** the
   resolve chain runs, **Then** behavior is unchanged from today (still solves correctly).

---

### User Story 2 - Byte-upload OCR providers still solve on modern browsers (Priority: P2)

An existing user on a current desktop browser (the common case today) continues to get
captchas solved by EasyOCR and OCR.space file mode exactly as before, with the same
recognition accuracy and no regression in success rate.

**Why this priority**: The fix changes how request bodies are constructed for the most
common providers; it must not break the existing, working majority. Important, but
secondary to restoring the broken old-Safari case.

**Independent Test**: Run the existing provider unit tests (success / failure /
missing-config paths) and confirm the recognized request content (field names, file
field, image bytes, headers) is equivalent to the prior multipart upload.

**Acceptance Scenarios**:

1. **Given** EasyOCR is selected, **When** a captcha is solved, **Then** the provider
   receives the image under the same `file` field with the same bytes and the
   `X-Access-Key` header, and returns a recognized result.
2. **Given** OCR.space file mode is selected, **When** a captcha is solved, **Then** the
   provider receives the same fields (api key, engine, language, file bytes, flags) and
   returns a recognized result.

---

### Edge Cases

- **Empty / zero-byte image**: If the canvas extraction yields no usable bytes, the
  byte-upload providers MUST fail the same way they do today (a clear "needs image
  bytes" / read failure), not with a transport clone error.
- **Provider returns no text**: An empty OCR result still surfaces as an empty-result
  failure that allows the next provider in the chain to try — unchanged from today.
- **Non-ASCII in part headers**: Field names and the file name are ASCII (`file`,
  `captcha.png`, etc.); the multipart framing MUST remain valid ASCII regardless of the
  image's binary content.
- **Transport that still accepts Blob/FormData**: On modern environments the request
  MUST still be accepted — the new body shape must be a valid request body everywhere,
  not only on old WebKit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: No OCR request sent over the cross-origin transport MAY pass a `Blob` or
  `FormData` as its body. This covers EasyOCR and **all** OCR.space POST modes (url,
  base64, file) — every one of which uses `FormData` today.
- **FR-002**: For file-upload requests (EasyOCR; OCR.space file mode) the system MUST
  construct the `multipart/form-data` request body as a single binary buffer (the
  boundary framing, part headers, and raw image bytes assembled together) that the
  transport can serialize without the structured-clone failure seen on old WebKit, and
  MUST declare the matching `multipart/form-data; boundary=…` content type.
- **FR-003**: For non-file OCR.space POST modes (url, base64) the system MUST send the
  request fields as a urlencoded string body (a structured-clone-safe payload), replacing
  the current `FormData`.
- **FR-004**: The request payloads MUST be semantically equivalent to the previous
  `FormData` uploads — same field names, same file field name and file name, the exact
  original image bytes, and the same headers (e.g. EasyOCR's access-key header) — so
  provider recognition is unaffected.
- **FR-005**: The ASCII framing of the multipart body MUST be produced without relying on
  APIs unavailable on very old Safari (specifically, it MUST NOT depend on `TextEncoder`).
- **FR-006**: Reading the captcha image bytes MUST use only APIs available on old WebKit
  (the same-origin canvas extraction is unchanged; any Blob→bytes conversion MUST NOT
  depend on APIs unavailable on old Safari, such as `Blob.arrayBuffer()`).
- **FR-007**: Provider success, failure, and missing-config behavior — including chain
  fallback between providers and the status reported to the user — MUST be unchanged from
  current behavior aside from the body-construction mechanism.
- **FR-008**: When image bytes are required but unavailable, the affected provider MUST
  fail with its existing "requires image bytes" error rather than attempting a transport
  call that errors.

### Key Entities *(include if feature involves data)*

- **Multipart request body**: The assembled upload payload for a byte-upload OCR
  request. Comprises a boundary delimiter, one or more named parts (text fields and a
  single binary file part holding the captcha image), and a closing delimiter. Carries
  the recognized image bytes and the field metadata each provider expects.
- **Captcha image bytes**: The raw bytes extracted from the same-origin captcha image,
  produced unchanged by the existing canvas extraction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On an environment that rejects non-cloneable request payloads (old WebKit
  behavior), a captcha that previously failed with a clone error is now solved — 0
  occurrences of the clone failure across the byte-upload providers.
- **SC-002**: Captcha recognition success on current browsers for EasyOCR and OCR.space
  file mode is unchanged (no regression) versus before the change.
- **SC-003**: The receiving OCR provider parses the manually-built request identically to
  the previous upload — recognized text matches what the prior multipart upload produced
  for the same image.
- **SC-004**: 100% of automated tests for the affected providers (success, failure,
  missing-config) pass, including a test that asserts no `Blob`/`FormData` reaches the
  transport for any OCR request (EasyOCR and every OCR.space POST mode).

## Assumptions

- The `DataCloneError` originates from the cross-origin request transport serializing
  the request body across the userscript bridge, not from the same-origin canvas
  extraction (which produces bytes locally without cloning).
- The cross-origin request transport accepts a binary buffer body and a manually-set
  content-type header on all target environments (old and new).
- "Old iOS Safari / old WebKit" refers to versions old enough to fail structured-cloning
  of `Blob`/`FormData` but new enough to support `ArrayBuffer`/`Uint8Array` and reading
  image bytes — the common reality for the older iPhones students still use.
- Every OCR.space POST mode (url, base64, file) currently builds a `FormData` body, so
  all three break on old WebKit — not just file mode. The default provider added by the
  config page is POST + url, so this is the common real-world case. OCR.space GET mode
  already sends no body (query string only) and is unaffected.
- Scope is limited to how the request body is constructed for OCR requests; no changes to
  provider selection, configuration schema, the config page, or the status UI.
