import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// React SPA deployed to GitHub Pages at https://kevinnitrog.github.io/uit-student-captcha/.
// `base` must match the Pages sub-path so emitted asset URLs resolve. The entry
// document is named configure.html (the URL the userscript's menu command opens).
// https://vitejs.dev/config/
export default defineConfig({
  base: "/uit-student-captcha/",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: { configure: "configure.html" },
    },
  },
});
