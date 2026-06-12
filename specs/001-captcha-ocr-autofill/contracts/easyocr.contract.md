# Contract: EasyOCR resolver (`provider: "easyocr"`)

Source: easyocr.org help/quick-start (fetched 2026-06-12). See `research.md`.

## Request

Image is sent as **bytes** (no URL mode). `multipart/form-data`, field `file`.

| Variant | Method / URL | Auth |
|---------|--------------|------|
| `free` (default primary) | `POST https://api.easyocr.org/ocr` (CN mirror `https://cn-api.easyocr.org/ocr`) | none |
| `keyed` | `POST https://console.easyocr.org/api/ocr` | header `X-Access-Key: eocr_...` |

Limits: ≤10 MB; JPG/PNG/BMP/GIF/WebP. Resolver requires `input.imageBytes`; if only a
URL is available the View fetches the bytes first (via `HttpClient` GET → blob).

```ts
// request building
const fd = new FormData();
fd.append("file", input.imageBytes!, "captcha.png");
http.request({
  method: "POST", url: entry.endpoint, timeoutMs,
  headers: entry.variant === "keyed" ? { "X-Access-Key": entry.accessKey! } : {},
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
| 401 / 403 | `AUTH` (keyed: bad/missing `X-Access-Key`) |
| 413 | `PAYLOAD_TOO_LARGE` |
| 415 | `UNSUPPORTED_MEDIA` |
| 429 | `RATE_LIMIT` |
| 5xx | `PROVIDER_ERROR` |
| 200 but `words` empty & no `text` | `EMPTY_RESULT` |

Construct-time: `variant:"keyed"` with empty `accessKey` → `MISSING_CONFIG`.

## Tests (required: success / failure / missing-config)
- free variant 200 `{words}` → normalized token.
- keyed variant missing `accessKey` → `MISSING_CONFIG` at construct.
- 429 → `RATE_LIMIT`; 200 `{words:[]}` → `EMPTY_RESULT`.
