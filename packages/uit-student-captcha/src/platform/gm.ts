// Typed, narrow wrappers over the granted Greasemonkey APIs. The GM_* functions and
// unsafeWindow are imported from vite-plugin-monkey's "$" module (NOT referenced as
// bare globals): in dev the userscript code runs as separately-loaded ES modules where
// Tampermonkey's GM_* are not in scope, and "$" resolves them correctly in both dev
// and build. The loose typing is contained in this module (Constitution III).

import {
  GM_getValue,
  GM_openInTab,
  GM_registerMenuCommand,
  GM_setValue,
  GM_xmlhttpRequest,
  unsafeWindow,
} from "$";

/** The real page window for postMessage bridging. Under a userscript sandbox the
 *  global `window` is a proxy that is NOT wired to the page's message channel, so a
 *  page↔userscript bridge must use unsafeWindow. Falls back to `window` when running
 *  unsandboxed (e.g. jsdom tests, where unsafeWindow is undefined). */
export function getPageWindow(): Window {
  return unsafeWindow ?? window;
}

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
  if (typeof GM_openInTab === "function") {
    GM_openInTab(url, { active: true });
  } else {
    window.open(url, "_blank");
  }
}

// --- GM_xmlhttpRequest shim --------------------------------------------------
// The privileged cross-origin transport. The HttpClient seam (model/http) builds on
// this; tests replace the GM_xmlhttpRequest fake on globalThis.

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
