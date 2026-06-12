import { defineConfig } from "vitest/config";

// Pure config logic — Node environment, no jsdom needed.
// See .specify/memory/constitution.md → "Testing Discipline".
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/index.ts"],
    },
  },
});
