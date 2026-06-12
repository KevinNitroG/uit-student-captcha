// Typed, narrow wrappers over the granted Greasemonkey APIs. The loose GM typing is
// contained in this module and narrowed at the boundary (Constitution III). Source
// outside platform/ never touches a GM_* global directly.

/** Read a string from GM storage, falling back when absent or not a string. */
export function gmGetValue(key: string, fallback: string): string {
  const value: unknown = GM_getValue(key, fallback);
  return typeof value === "string" ? value : fallback;
}

/** Persist a string to GM storage. */
export function gmSetValue(key: string, value: string): void {
  GM_setValue(key, value);
}

/** Register a userscript-manager menu command. */
export function gmRegisterMenuCommand(caption: string, onClick: () => void): void {
  GM_registerMenuCommand(caption, onClick);
}

/** Open a URL in a new tab (GM_openInTab when granted, else window.open). */
export function gmOpenInTab(url: string): void {
  const fn = (globalThis as Record<string, unknown>)["GM_openInTab"];
  if (typeof fn === "function") {
    (fn as (u: string, options?: unknown) => void)(url, { active: true });
  } else {
    window.open(url, "_blank");
  }
}

// --- GM_xmlhttpRequest shim --------------------------------------------------
// The privileged cross-origin transport. The HttpClient seam (model/http) builds on
// this; tests replace the global GM_xmlhttpRequest with a fake.

export interface GmRequestDetails {
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string>;
  data?: string | FormData | Blob;
  timeout: number;
  responseType?: "blob";
}

export interface GmHttpResponse {
  readonly status: number;
  readonly responseText: string;
  readonly response: unknown;
  readonly responseHeaders: string;
}

export interface GmRequestHandlers {
  onload: (response: GmHttpResponse) => void;
  onerror: () => void;
  ontimeout: () => void;
}

type GmXhr = (details: GmRequestDetails & GmRequestHandlers) => void;

export function gmXmlHttpRequest(
  details: GmRequestDetails,
  handlers: GmRequestHandlers,
): void {
  const xhr = GM_xmlhttpRequest as unknown as GmXhr;
  xhr({ ...details, ...handlers });
}
