import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";
import pkg from "./package.json" with { type: "json" };

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "UIT Student Captcha",
        author: "Kevin Nitro",
        source: "https://github.com/KevinNitroG/uit-student-captcha",
        iconURL:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Logo_UIT_updated.jpg/960px-Logo_UIT_updated.jpg",
        downloadURL:
          "https://github.com/KevinNitroG/uit-student-captcha/releases/latest/download/uit-student-captcha.user.js",
        namespace: "kevinnitrog/uit-student-captcha",
        match: ["https://student.uit.edu.vn/*"],
        "run-at": "document-idle",
        version: pkg.version,
        grant: "none",
      },
    }),
  ],
});
