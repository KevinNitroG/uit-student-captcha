// Test shim for vite-plugin-monkey's "$" module (aliased here in vitest.config.ts).
// The real client reads a plugin-injected window and throws under vitest, so this
// delegates each GM_* call to the fake installed on globalThis by installFakeGm /
// installFakeXhr at call time (so per-test fakes are honored).

type AnyFn = (...args: unknown[]) => unknown;

function gmFn(name: string): AnyFn {
  const fn = (globalThis as Record<string, unknown>)[name];
  if (typeof fn !== "function") {
    throw new ReferenceError(`${name} is not defined — install a GM fake in the test`);
  }
  return fn as AnyFn;
}

export const GM_getValue = (...args: unknown[]): unknown => gmFn("GM_getValue")(...args);
export const GM_setValue = (...args: unknown[]): unknown => gmFn("GM_setValue")(...args);
export const GM_registerMenuCommand = (...args: unknown[]): unknown =>
  gmFn("GM_registerMenuCommand")(...args);
export const GM_openInTab = (...args: unknown[]): unknown => gmFn("GM_openInTab")(...args);
export const GM_xmlhttpRequest = (...args: unknown[]): unknown =>
  gmFn("GM_xmlhttpRequest")(...args);

// In jsdom there is no sandbox; getPageWindow() falls back to `window`.
export const unsafeWindow: Window | undefined = undefined;
