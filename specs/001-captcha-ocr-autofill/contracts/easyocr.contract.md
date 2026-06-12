# Contract: EasyOCR resolver (`provider: "easyocr"`)

Source: easyocr.org help/quick-start (fetched 2026-06-12). See `research.md`.

## Request

**Key-only** — there is no keyless endpoint (`api.easyocr.org` does not resolve;
verified 2026-06-12). Image is sent as **bytes** (no URL mode). `multipart/form-data`,
field `file`, with the access key in a header.

| Method / URL | Auth |
|--------------|------|
| `POST https://console.easyocr.org/api/ocr` (overridable `endpoint`) | header `X-Access-Key: eocr_…` (required) |

Limits: ≤10 MB; JPG/PNG/BMP/GIF/WebP. Resolver requires `input.imageBytes`; if only a
URL is available the View fetches the bytes first (via `HttpClient` GET → blob).

```ts
// request building
const fd = new FormData();
fd.append("file", input.imageBytes!, "captcha.png");
http.request({
  method: "POST", url: entry.endpoint, timeoutMs,
  headers: { "X-Access-Key": entry.accessKey! },
  body: fd, responseType: "json",
});
```

## Success response (HTTP 200)

```ts
interface EasyOcrWord { text: string; left: number; top: number; right: number; bottom: number; rate: number; }
interface EasyOcrResponse {
  words?: EasyOcrWord[];        // canonical
  // keyed endpoint also returns:
  message?: string; elapsed_seconds?: number; remaining_quota?: number;
  request_id?: string; result_summary?: string; user?: string;
  // alternate help-doc shape (defensive fallback):
  success?: boolean; text?: string; confidence?: number;
}
```
- `rawText` = `words.map(w => w.text).join(" ")`, else `text`.
- `confidence` = max/avg `rate` if present, else `confidence`, else `null`.
- Normalize → if empty throw `OcrError(EMPTY_RESULT, { provider:"easyocr", raw })`.

## Error mapping (HTTP-status driven)

| HTTP | `OcrErrorCode` |
|------|----------------|
| 400 | `BAD_REQUEST` |
| 401 / 403 | `AUTH` (bad/missing `X-Access-Key`) |
| 413 | `PAYLOAD_TOO_LARGE` |
| 415 | `UNSUPPORTED_MEDIA` |
| 429 | `RATE_LIMIT` |
| 5xx | `PROVIDER_ERROR` |
| 200 but `words` empty & no `text` | `EMPTY_RESULT` |

Construct-time: empty `accessKey` → `MISSING_CONFIG`.

## Tests (required: success / failure / missing-config)
- 200 `{words}` → normalized token; sends the `X-Access-Key` header.
- missing `accessKey` → `MISSING_CONFIG` at construct.
- 429 → `RATE_LIMIT`; 200 `{words:[]}` → `EMPTY_RESULT`.
