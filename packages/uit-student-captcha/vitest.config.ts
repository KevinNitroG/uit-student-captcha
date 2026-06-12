import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest runs on Node and simulates the browser via jsdom so the View/ViewModel
// (DOM-bound code) can be unit tested without a real browser or the live portal.
// See .specify/memory/constitution.md → "Testing Discipline".
export default defineConfig({
  // The "$" alias (vite-plugin-monkey's GM module) resolves to a test shim that
  // delegates to the GM_* fakes installed on globalThis (see test/helpers/monkey.ts).
  resolve: {
    alias: {
      $: fileURLToPath(new URL("./test/helpers/monkey.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["test/**/*.spec.ts", "src/**/*.spec.ts"],
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/vite-env.d.ts"],
    },
  },
});
