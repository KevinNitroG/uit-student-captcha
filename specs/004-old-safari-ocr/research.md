# Research: Old-Safari Captcha OCR Compatibility

All Technical Context unknowns are resolved below. No `NEEDS CLARIFICATION` remain.

## Decision 1 — Root cause is the GM transport serializing `FormData`/`Blob`, not the canvas

**Decision**: Treat the `DataCloneError` as a transport-serialization failure, and leave the
same-origin canvas extraction (`PortalView.canvasExtractBytes`, `canvas.toBlob`) untouched.

**Rationale**: `canvas.toBlob` produces a `Blob` locally — no structured clone is involved, so
it works on old WebKit. The error appears one step later: every OCR request is a POST whose
body is a `FormData` (EasyOCR and OCR.space file mode also embed a `Blob`). `GM_xmlhttpRequest`
hands the request `data` across the userscript↔host bridge, which serializes it with the
structured clone algorithm. Old WebKit's structured clone cannot clone `Blob`/`FormData`
(`FormData` is not even part of the structured-clone spec) → `"DataCloneError: The object can
not be cloned."` Both providers fail identically because both ship a `FormData`.

**Alternatives considered**: Re-encoding the canvas (e.g. `toDataURL` instead of `toBlob`) —
rejected: the canvas step is not the failure point, and `toDataURL` would only matter for a
base64 path, not for EasyOCR's required byte upload.

## Decision 2 — Send request bodies as `ArrayBuffer` (binary) and urlencoded `string` (text)

**Decision**: Replace every `FormData` body with a structured-clone-safe payload:
- **File uploads** (EasyOCR; OCR.space `file` mode): a manually-assembled `multipart/form-data`
  body delivered as an **`ArrayBuffer`**, with the `Content-Type: multipart/form-data;
  boundary=…` header set explicitly.
- **Non-file OCR.space POST modes** (`url`, `base64`): a urlencoded **`string`** body with
  `Content-Type: application/x-www-form-urlencoded`.

**Rationale**: `ArrayBuffer` is in the structured-clone spec and is reliably cloneable on old
WebKit, and `XMLHttpRequest.send()` accepts both `ArrayBuffer(View)` and `string`. Strings are
trivially cloneable, so the url/base64 modes (which carry no binary) need nothing heavier than a
urlencoded string. This removes `Blob`/`FormData` from the transport entirely.

**Alternatives considered**:
- *Keep `FormData`, only fix the file `Blob`* — rejected: `FormData` itself is the
  non-cloneable object; url/base64 POST modes (including the **default** POST+url provider)
  would still throw.
- *Binary string + Tampermonkey's `binary: true` flag* — rejected: manager-specific
  (Violentmonkey / Safari userscript apps don't share the flag), and brittle vs. a plain
  `ArrayBuffer` that every XHR accepts.
- *Switch the default to OCR.space GET (no body)* — rejected: a config/behavior change, not a
  transport fix; doesn't help EasyOCR or POST-mode users.

## Decision 3 — Build the multipart ASCII framing without `TextEncoder`

**Decision**: Encode the boundary and part headers to bytes with a tiny `asciiBytes(s)` helper
that does `charCodeAt` into a `Uint8Array`; concatenate those ASCII segments with the raw image
bytes into one `Uint8Array`, then hand over its `.buffer`.

**Rationale**: `TextEncoder` is only Safari 10.1+; the multipart framing (`--boundary`,
`Content-Disposition: form-data; name="…"`, `Content-Type`, CRLFs, field values like the API
key / `"true"` / engine number / language code, and the file name `captcha.png`) is pure ASCII,
so a `charCodeAt` loop is exact and dependency-free. The only non-ASCII part is the image
itself, which is inserted as raw bytes (never stringified). This satisfies FR-005.

**Alternatives considered**: `new TextEncoder().encode(...)` — rejected per the very-old-Safari
target (FR-005). `Blob`-based assembly — rejected (re-introduces the non-cloneable type).

## Decision 4 — Read the captcha `Blob` to bytes via `FileReader.readAsArrayBuffer`

**Decision**: Convert `OcrInput.imageBytes` (a `Blob`) to a `Uint8Array` with
`FileReader.readAsArrayBuffer` (mirroring the existing `blobToDataUrl` FileReader pattern in
`OcrSpaceResolver`), not with `Blob.arrayBuffer()`.

**Rationale**: `Blob.prototype.arrayBuffer()` is Safari 14+; `FileReader.readAsArrayBuffer` is
universal and already the project's idiom for reading captcha bytes. Works in jsdom for tests.

**Alternatives considered**: `await blob.arrayBuffer()` — rejected (too new for the target,
FR-006). Passing the `Blob` straight through — rejected (the bug).

## Decision 5 — A shared multipart/form helper in the Model http layer

**Decision**: Add one small module `model/http/multipart.ts` exporting `asciiBytes`,
`blobToUint8Array`, `buildMultipartBody(...)`, and `encodeUrlForm(...)`. Both resolvers import
it; no per-provider duplication.

**Rationale**: Constitution I keeps transport/encoding concerns in the Model layer; Constitution
II is preserved because the helper is provider-agnostic plumbing (no `if provider === …`), and
the resolver registry/factory is untouched. Centralizing avoids two hand-rolled multipart
encoders drifting apart.

**Alternatives considered**: Inline the encoder in each resolver — rejected (duplication, harder
to test once). Put it in `HttpClient` — rejected: the client is a thin transport seam; body
shaping belongs with the request builders (the resolvers), fed by a shared util.

## Decision 6 — Narrow the transport body type to `string | ArrayBuffer`

**Decision**: Change `HttpRequest.body` and `GmRequestDetails.data` from
`string | FormData | Blob` to `string | ArrayBuffer`.

**Rationale**: Makes FR-001 ("no `Blob`/`FormData` over the transport") a compile-time guarantee
(Constitution III) rather than a convention — any future resolver that tries to pass a `Blob`
fails typecheck. Nothing else in the codebase relies on the wider type.

**Alternatives considered**: Leave the union wide and rely on review — rejected (loses the
type-level guard for the exact regression we're fixing).

## Decision 7 — Boundary generation

**Decision**: Generate a boundary as a fixed ASCII prefix plus a random suffix, e.g.
`----uocFormBoundary` + `Math.random().toString(16)` slices (no `crypto` dependency needed).

**Rationale**: Multipart only requires the boundary not to occur inside any part. The captcha is
a tiny PNG and the boundary has enough entropy that collision is negligible; this avoids
depending on `crypto.randomUUID` (newer) or adding any library (Constitution V).

**Alternatives considered**: `crypto.randomUUID()` — rejected (Safari 15.4+, and unnecessary).
Scanning the payload for the boundary and regenerating — rejected as over-engineering for a
small image.
