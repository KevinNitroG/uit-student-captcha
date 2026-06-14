/// <reference types="vite/client" />
/// <reference types="vite-plugin-monkey/client" />
/// <reference types="vite-plugin-monkey/style" />

// GM APIs are imported from "$" (ESM), the approach vite-plugin-monkey recommends over
// ambient globals — bare GM_* are not in scope for dev-mode ES modules. "$" is the
// plugin's clientAlias (→ vite-plugin-monkey/dist/client); it ships no module
// declaration, so declare it here for the type checker.
declare module "$" {
  export * from "vite-plugin-monkey/dist/client";
}

declare const __SCRIPT_VERSION__: string;
