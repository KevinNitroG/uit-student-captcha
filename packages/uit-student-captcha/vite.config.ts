import { defineConfig, loadEnv } from "vite";
import monkey from "vite-plugin-monkey";
import pkg from "./package.json" with { type: "json" };

// Versioning is driven by release-please (Conventional Commits). It commits the
// resolved version into this package.json (mirrored from the root via the config's
// `extra-files`), so the released userscript header is baked from disk here. The
// `?? "0.0.0"` is a defensive fallback only — the field is normally present.
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
    // Emit to the workspace-root dist so all built artifacts collect under one tree
    // ({workspaceRoot}/dist/{projectName}) — convenient for CI release uploads.
    build: {
      outDir: "../../dist/uit-student-captcha",
      emptyOutDir: true,
    },
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
          updateURL:
            "https://github.com/KevinNitroG/uit-student-captcha/releases/latest/download/uit-student-captcha.user.js",
          namespace: "kevinnitrog/uit-student-captcha",
          match: [
            "https://student.uit.edu.vn/*",
            "https://daa.uit.edu.vn/*",
            `${configOrigin}/*`,
          ],
          connect: [
            "api.easyocr.org",
            "console.easyocr.org",
            "api.ocr.space",
            configHost,
          ],
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
    define: {
      __SCRIPT_VERSION__: JSON.stringify(version),
    },
  };
});
