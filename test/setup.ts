// Global test setup, runs before each test file (jsdom environment).
// Reset DOM and mocks between tests so cases stay isolated and deterministic.
import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});
