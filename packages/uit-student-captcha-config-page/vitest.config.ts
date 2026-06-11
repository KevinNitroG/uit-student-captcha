import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// jsdom on Node so React components are unit-testable without a real browser.
// See .specify/memory/constitution.md → "Testing Discipline".
export default defineConfig({
  plugins: [react()],
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
