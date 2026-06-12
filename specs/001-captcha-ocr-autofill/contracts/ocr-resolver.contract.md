# Contract: `OcrResolver` interface & error taxonomy

The single stable seam every OCR backend implements (Constitution II, FR-019).

## Interface

```ts
interface OcrResolver {
  readonly id: string;
  resolve(input: OcrInput): Promise<OcrResult>;   // resolves to normalized text, or throws OcrError
}
```

- `input: OcrInput` — `{ imageUrl, imageBytes, mimeType }`. The resolver picks the
  representation its config dictates; if the required one is missing (e.g. EasyOCR
  needs bytes but only a URL was provided) it throws `OcrError(BAD_REQUEST)`.
- Success → `OcrResult { provider, rawText, text, confidence }` where `text` is the
  normalized single longest alphanumeric token (FR-010). Empty after normalization
  → throw `OcrError(EMPTY_RESULT)`.
- Construction receives `(entry: ProviderEntry, http: HttpClient)`. Missing required
  config → throw `OcrError(MISSING_CONFIG)` at construct/validate time (FR-013).

## Registry / factory (only provider switch in the codebase)

```ts
function createResolver(entry: ProviderEntry, http: HttpClient): OcrResolver {
  switch (entry.provider) {        // the ONLY allowed provider switch
    case "easyocr":  return new EasyOcrResolver(entry, http);
    case "ocrspace": return new OcrSpaceResolver(entry, http);
  }
}
```
Adding a provider = new resolver file + one `case` here + a config-union member.
ViewModel/View/other resolvers stay untouched (FR-019).

## HttpClient seam (mockable transport)

```ts
interface HttpRequest {
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string>;
  body?: string | FormData | Blob;     // FormData for multipart, string for urlencoded/base64
  timeoutMs: number;
  responseType?: "text" | "json" | "blob";
}
interface HttpResponse { status: number; headers: Record<string, string>; text: string; json(): unknown; blob?: Blob; }

interface HttpClient { request(req: HttpRequest): Promise<HttpResponse>; }
```
Production impl wraps `GM_xmlhttpRequest`; a timeout rejects with `OcrError(TIMEOUT)`,
a transport failure with `OcrError(NETWORK)`. Tests inject a fake `HttpClient`.

## Error taxonomy (`OcrErrorCode`)

| Code | When |
|------|------|
| `MISSING_CONFIG` | required key/field absent before any request |
| `BAD_REQUEST` | malformed request / wrong input representation |
| `AUTH` | invalid/expired/missing key (HTTP 401/403, or in-body invalid-key) |
| `PAYLOAD_TOO_LARGE` | image exceeds provider size limit (HTTP 413, or in-body) |
| `UNSUPPORTED_MEDIA` | unsupported image format (HTTP 415) |
| `RATE_LIMIT` | quota/throttle (HTTP 429, or in-body) |
| `TIMEOUT` | exceeded `timeoutMs` |
| `NETWORK` | transport-level failure (DNS/connection/blocked) |
| `PROVIDER_ERROR` | server error / fatal parse (HTTP 5xx, OCRExitCode 3/4) |
| `EMPTY_RESULT` | HTTP/exit ok but no usable text |

The ViewModel treats every thrown `OcrError` uniformly as "provider failed → next".
