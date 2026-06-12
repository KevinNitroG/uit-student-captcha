import { defineConfig, loadEnv } from "vite";
import monkey from "vite-plugin-monkey";
import pkg from "./package.json" with { type: "json" };

// Versions live in git tags (Nx Release). `nx release` writes the resolved version
// into package.json right before the build, so the released userscript header is
// correct; in local dev the field is absent, so fall back to 0.0.0.
const version = (pkg as { version?: string }).version ?? "0.0.0";

// The config-page origin is resolved at bundle time (research.md Decision 4). This
// file runs in Node, so it CANNOT read import.meta.env — it uses loadEnv(). Source
// code reads import.meta.env.VITE_CONFIG_PAGE_ORIGIN, which Vite inlines. Default is
// localhost:3000 for dev; production builds pass the deployed Pages origin.
const DEFAULT_CONFIG_ORIGIN = "http://localhost:3000";

// Userscript bundle. The header (match/grant/connect/version) lives here per the
// project constitution — not scattered across source.
//
// The script @matches TWO origins:
//   - the student portal, where it auto-fills the captcha;
//   - the hosted configuration page, where it bridges saved settings into GM
//     storage (the SPA and the userscript share a window via postMessage).
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const configOrigin = env["VITE_CONFIG_PAGE_ORIGIN"] ?? DEFAULT_CONFIG_ORIGIN;
  const configHost = new URL(configOrigin).hostname;

  return {
    plugins: [
      monkey({
        entry: "src/main.ts",
        userscript: {
          name: "UIT Student Captcha",
          author: "Kevin Nitro",
          source: "https://github.com/KevinNitroG/uit-student-captcha",
          homepage: `${configOrigin}/configure.html`,
          iconURL:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Logo_UIT_updated.jpg/960px-Logo_UIT_updated.jpg",
          downloadURL:
            "https://github.com/KevinNitroG/uit-student-captcha/releases/latest/download/uit-student-captcha.user.js",
          namespace: "kevinnitrog/uit-student-captcha",
          match: ["https://student.uit.edu.vn/*", `${configOrigin}/*`],
          connect: ["api.easyocr.org", "console.easyocr.org", "api.ocr.space", configHost],
          "run-at": "document-idle",
          version,
          grant: [
            "GM_getValue",
            "GM_setValue",
            "GM_registerMenuCommand",
            "GM_openInTab",
            "GM_xmlhttpRequest",
          ],
        },
      }),
    ],
  };
});
