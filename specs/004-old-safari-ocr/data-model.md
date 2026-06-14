# Data Model: Old-Safari Captcha OCR Compatibility

This feature is transport/encoding plumbing — it introduces no persisted entities and no
config-schema changes. The "entities" below are the in-memory request-body shapes produced by
the new helper and consumed by the cross-origin transport.

## 1. Multipart part (input to the encoder)

A discriminated description of one `multipart/form-data` part.

| Field | Type | Notes |
|-------|------|-------|
| `kind` | `"text" \| "file"` | discriminator |
| `name` | `string` (ASCII) | form field name (`apikey`, `language`, `file`, …) |
| `value` | `string` (ASCII) | text parts only |
| `filename` | `string` (ASCII) | file parts only (e.g. `captcha.png`) |
| `contentType` | `string` (ASCII) | file parts only (e.g. `image/png`) |
| `bytes` | `Uint8Array` | file parts only — the raw image bytes |

Validation / invariants:
- Text-part `name`/`value` and file-part `name`/`filename`/`contentType` are ASCII; they are
  encoded via `asciiBytes` (`charCodeAt`), never `TextEncoder`.
- `bytes` is inserted verbatim — never decoded/re-encoded — so the image is byte-exact (FR-004).

## 2. Built request body (output of the encoder)

`buildMultipartBody(textFields, file)` returns:

| Field | Type | Notes |
|-------|------|-------|
| `body` | `ArrayBuffer` | boundary framing + parts + closing delimiter, all concatenated |
| `contentType` | `string` | `multipart/form-data; boundary=<boundary>` |

Layout per part (CRLF = `\r\n`):

```
--<boundary>CRLF
Content-Disposition: form-data; name="<name>"CRLF              (text part)
CRLF
<value>CRLF
--<boundary>CRLF
Content-Disposition: form-data; name="<name>"; filename="<filename>"CRLF   (file part)
Content-Type: <contentType>CRLF
CRLF
<raw bytes>CRLF
--<boundary>--CRLF                                            (closing delimiter)
```

`encodeUrlForm(fields: Record<string,string>)` returns a `string`
(`application/x-www-form-urlencoded`) for the non-file OCR.space POST modes.

## 3. Transport request (changed type)

`HttpRequest` / `GmRequestDetails` — the body/data type narrows:

| Field | Before | After |
|-------|--------|-------|
| `HttpRequest.body` | `string \| FormData \| Blob` | `string \| ArrayBuffer` |
| `GmRequestDetails.data` | `string \| FormData \| Blob` | `string \| ArrayBuffer` |

Everything else on these types is unchanged. The narrowing is the compile-time enforcement of
FR-001 (Decision 6).

## 4. Per-provider request shape (after the change)

| Provider / mode | Body type | Content-Type header | Carries image as |
|-----------------|-----------|---------------------|------------------|
| EasyOCR | `ArrayBuffer` (multipart) | `multipart/form-data; boundary=…` | `file` part, raw bytes |
| OCR.space POST `file` | `ArrayBuffer` (multipart) | `multipart/form-data; boundary=…` | `file` part, raw bytes |
| OCR.space POST `base64` | `string` (urlencoded) | `application/x-www-form-urlencoded` | `base64Image` field (data URL) |
| OCR.space POST `url` | `string` (urlencoded) | `application/x-www-form-urlencoded` | `url` field (no image bytes) |
| OCR.space GET `url` | none (query string) | — | `url` query param (unchanged) |

Header note: EasyOCR continues to send `X-Access-Key`; the only new header in every POST case is
the explicit `Content-Type` (previously auto-set by `FormData`).
