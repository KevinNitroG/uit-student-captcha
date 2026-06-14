// Mockable transport seam (contracts/ocr-resolver.contract.md). Resolvers receive an
// HttpClient and never touch GM_* directly. The production GmHttpClient wraps
// GM_xmlhttpRequest (the privileged cross-origin transport, research.md Decision 2);
// a timeout maps to OcrError(TIMEOUT), a transport failure to OcrError(NETWORK).

import { gmXmlHttpRequest, type GmHttpResponse, type GmRequestDetails } from "../../platform/gm.ts";
import { OcrError } from "../ocr/errors.ts";

export interface HttpRequest {
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer;
  timeoutMs: number;
  responseType?: "text" | "json" | "blob";
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly text: string;
  json(): unknown;
  readonly blob?: Blob;
}

export interface HttpClient {
  request(req: HttpRequest): Promise<HttpResponse>;
}

function parseHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      out[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    }
  }
  return out;
}

function toHttpResponse(res: GmHttpResponse, wantBlob: boolean): HttpResponse {
  const text = res.responseText ?? "";
  const blob = wantBlob && res.response instanceof Blob ? res.response : undefined;
  return {
    status: res.status,
    headers: parseHeaders(res.responseHeaders ?? ""),
    text,
    json: () => JSON.parse(text) as unknown,
    ...(blob ? { blob } : {}),
  };
}

export class GmHttpClient implements HttpClient {
  request(req: HttpRequest): Promise<HttpResponse> {
    const wantBlob = req.responseType === "blob";
    const details: GmRequestDetails = {
      method: req.method,
      url: req.url,
      timeout: req.timeoutMs,
    };
    if (req.headers) details.headers = req.headers;
    if (req.body !== undefined) details.data = req.body;
    if (wantBlob) details.responseType = "blob";

    return new Promise<HttpResponse>((resolve, reject) => {
      gmXmlHttpRequest(details, {
        onload: (res) => resolve(toHttpResponse(res, wantBlob)),
        onerror: () =>
          reject(new OcrError("NETWORK", "Network/transport failure", { provider: "transport" })),
        ontimeout: () =>
          reject(new OcrError("TIMEOUT", `Request exceeded ${req.timeoutMs}ms`, { provider: "transport" })),
      });
    });
  }
}
