import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import pkg from "../../package.json" with { type: "json" };

// React SPA deployed to GitHub Pages at https://kevinnitrog.github.io/uit-student-captcha/.
// `base` must match the Pages sub-path so emitted asset URLs resolve. The entry
// document is named configure.html (the URL the userscript's menu command opens).
//
// Config code runs in Node, so `import.meta.env` is NOT available here — env is read
// with Vite's loadEnv(). Source code (App/bridge) reads `import.meta.env.*`, which
// Vite inlines at bundle time. Default origin is localhost:3000 for dev; CI sets the
// deployed origin. The Pages base path is only applied when serving from the Pages host.
// https://vitejs.dev/config/
const pageVersion = (pkg as { version?: string }).version ?? "0.0.0";
const UPDATE_URL =
  "https://github.com/KevinNitroG/uit-student-captcha/releases/latest/download/uit-student-captcha.user.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const origin = env["VITE_CONFIG_PAGE_ORIGIN"] ?? "http://localhost:3000";
  const base = origin.includes("github.io") ? "/uit-student-captcha/" : "/";

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    define: {
      __PAGE_VERSION__: JSON.stringify(pageVersion),
      __UPDATE_URL__: JSON.stringify(UPDATE_URL),
    },
    server: { port: 3000 },
    preview: { port: 3000 },
    build: {
      // Emit to the workspace-root dist ({workspaceRoot}/dist/{projectName}) so all
      // built artifacts collect under one tree — convenient for CI deploy/upload.
      outDir: "../../dist/uit-student-captcha-config-page",
      emptyOutDir: true,
      rollupOptions: {
        input: { configure: "configure.html" },
      },
    },
  };
});
