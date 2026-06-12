/// <reference types="vite/client" />
/// <reference types="vite-plugin-monkey/client" />
/// <reference types="vite-plugin-monkey/global" />
/// <reference types="vite-plugin-monkey/style" />

// vite-plugin-monkey aliases "$" to its client at build/dev time (clientAlias default
// "$"); it ships no module declaration, so declare it here for the type checker.
declare module "$" {
  export * from "vite-plugin-monkey/dist/client";
}
