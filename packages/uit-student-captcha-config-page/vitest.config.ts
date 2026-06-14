import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// jsdom on Node so React components are unit-testable without a real browser.
// See .specify/memory/constitution.md → "Testing Discipline".
export default defineConfig({
  plugins: [react()],
  define: {
    __PAGE_VERSION__: '"1.2.0"',
    __UPDATE_URL__: '"https://example.com/update"',
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.spec.{ts,tsx}", "test/**/*.spec.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.spec.{ts,tsx}", "src/main.tsx", "src/vite-env.d.ts"],
    },
  },
});
