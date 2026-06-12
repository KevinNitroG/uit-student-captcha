# Contract: OCR.space resolver (`provider: "ocrspace"`)

Source: ocr.space/ocrapi (fetched 2026-06-12). See `research.md`.

## Request

**URL mode by default** (captcha is a public PNG). Fully configurable.

| Setting | Values | Default |
|---------|--------|---------|
| `scheme` | `https` \| `http` | `https` |
| `httpMethod` | `POST` \| `GET` | `POST` |
| `inputMode` | `url` \| `base64` \| `file` | `url` |
| `ocrEngine` | 1 \| 2 \| 3 | 2 (engine 1 returns empty on the portal's small captchas) |
| `language` | e.g. `eng` | `eng` |

Endpoints (derive when `endpoint` not overridden):
- POST → `{scheme}://api.ocr.space/parse/image`
- GET  → `{scheme}://api.ocr.space/parse/imageurl` (url-only; params `apikey,url,language,isOverlayRequired`)

Auth: `apikey`. POST → in body; GET → query string (also accepted as header `apikey`).
Limits (free): 25k/month, **500/day/IP**, **1 MB**, 3 PDF pages.

```ts
// POST + url mode (default)
const fd = new FormData();
fd.append("apikey", entry.apiKey);
fd.append("url", input.imageUrl!);          // or "base64Image"/"file" per inputMode
fd.append("OCREngine", String(entry.ocrEngine));
fd.append("language", entry.language);
// optional: isOverlayRequired, detectOrientation, scale, isTable, filetype
http.request({ method: "POST", url: endpoint, timeoutMs, body: fd, responseType: "json" });
```
- `inputMode:"base64"` → `base64Image` = `data:${mime};base64,${b64}` (1 MB cap).
- `inputMode:"file"` → multipart `file` = bytes.

## Success / structured response (usually HTTP 200; errors in-body)

```ts
interface OcrSpaceParsedResult {
  ParsedText: string;
  FileParseExitCode: number;     // 1 ok; 0 not-found; -10 parse; -20 timeout; -30 validation; -99 unknown
  ErrorMessage?: string | null;
  ErrorDetails?: string | null;
  TextOverlay?: unknown;
}
interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceParsedResult[];
  OCRExitCode: number;           // 1 ok; 2 partial; 3 all failed; 4 fatal
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string | string[] | null;
  ErrorDetails?: string | null;
  ProcessingTimeInMilliseconds?: string;
  SearchablePDFURL?: string | null;
}
```
- `rawText` = `ParsedResults?.[0]?.ParsedText ?? ""`.
- `confidence` = `null` (engine 1/2 don't return per-word confidence here).

## Error mapping (in-body first, then HTTP)

| Condition | `OcrErrorCode` |
|-----------|----------------|
| `IsErroredOnProcessing === true` | inspect `ErrorMessage`: invalid key → `AUTH`; size → `PAYLOAD_TOO_LARGE`; rate/limit → `RATE_LIMIT`; else `PROVIDER_ERROR` |
| `OCRExitCode === 3` or `4` | `PROVIDER_ERROR` |
| `OCRExitCode === 2` with empty text | `EMPTY_RESULT` |
| `OCRExitCode === 1` but `ParsedText` empty after normalize | `EMPTY_RESULT` |
| HTTP 403 | `AUTH` |
| HTTP 429 | `RATE_LIMIT` |
| HTTP 5xx | `PROVIDER_ERROR` |

Construct-time: empty `apiKey` → `MISSING_CONFIG`.

## Tests (required: success / failure / missing-config)
- POST+url, `OCRExitCode:1` `ParsedText:"AB12C"` → normalized token.
- empty `apiKey` → `MISSING_CONFIG` at construct.
- `IsErroredOnProcessing:true` + invalid-key message → `AUTH`.
- `OCRExitCode:1` `ParsedText:" "` → `EMPTY_RESULT`.
