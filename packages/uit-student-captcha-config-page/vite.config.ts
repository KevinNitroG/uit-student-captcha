import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// React SPA deployed to GitHub Pages at https://kevinnitrog.github.io/uit-student-captcha/.
// `base` must match the Pages sub-path so emitted asset URLs resolve. The entry
// document is named configure.html (the URL the userscript's menu command opens).
//
// Config code runs in Node, so `import.meta.env` is NOT available here — env is read
// with Vite's loadEnv(). Source code (App/bridge) reads `import.meta.env.*`, which
// Vite inlines at bundle time. Default origin is localhost:3000 for dev; CI sets the
// deployed origin. The Pages base path is only applied when serving from the Pages host.
// https://vitejs.dev/config/
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
    server: { port: 3000 },
    preview: { port: 3000 },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: { configure: "configure.html" },
      },
    },
  };
});
