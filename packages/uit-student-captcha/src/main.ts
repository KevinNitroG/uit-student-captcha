// Userscript entry point. One bundle, two runtime modes (the script @matches both
// origins):
//   - on student.uit.edu.vn → detect the signin form and auto-fill the captcha;
//   - on the hosted config page → bridge settings between the React SPA (postMessage)
//     and the userscript's GM storage (User Story 3).
//
// The config-page origin is inlined at bundle time from VITE_CONFIG_PAGE_ORIGIN
// (research.md Decision 4); vite.config.ts injects the matching @match/@connect.

import {
  DEFAULT_CONFIG,
  STORAGE_KEY,
  validateConfig,
  type ProviderConfiguration,
} from "uit-student-captcha-config-core";
import { ConfigBridge } from "./bridge/configBridge.ts";
import { GmHttpClient } from "./model/http/HttpClient.ts";
import { getPageWindow, gmGetValue, gmOpenInTab, gmRegisterMenuCommand } from "./platform/gm.ts";
import { CaptchaViewModel } from "./viewmodel/CaptchaViewModel.ts";
import { PortalView } from "./view/PortalView.ts";

const rawOrigin = import.meta.env["VITE_CONFIG_PAGE_ORIGIN"];
const CONFIG_PAGE_ORIGIN = typeof rawOrigin === "string" ? rawOrigin : "http://localhost:3000";
const CONFIG_PAGE_URL = `${CONFIG_PAGE_ORIGIN}/configure.html`;

function loadConfig(): ProviderConfiguration {
  const stored = gmGetValue(STORAGE_KEY, "");
  if (!stored) return DEFAULT_CONFIG;
  try {
    return validateConfig(JSON.parse(stored));
  } catch {
    return DEFAULT_CONFIG;
  }
}

function runPortalMode(): void {
  // FR-020: a menu command opens the hosted config page.
  gmRegisterMenuCommand("Configure OCR providers", () => gmOpenInTab(CONFIG_PAGE_URL));

  const http = new GmHttpClient();
  const config = loadConfig();
  const viewModel = new CaptchaViewModel(config, http);
  const view = new PortalView(viewModel, {
    configUrl: CONFIG_PAGE_URL,
    lowercaseResult: config.lowercaseResult,
  });
  // Run after the page has fully loaded so the OCR request never extends the page's
  // own load (the host tab kept showing a loading spinner otherwise).
  afterPageLoad(() => void view.run());
}

/** Invoke fn once the document has finished loading (or on the next tick if already). */
function afterPageLoad(fn: () => void): void {
  if (document.readyState === "complete") {
    setTimeout(fn, 0);
  } else {
    window.addEventListener("load", () => setTimeout(fn, 0), { once: true });
  }
}

function runConfigMode(configOrigin: string): void {
  // Use the real page window (unsafeWindow) so postMessage reaches the SPA — the
  // sandbox `window` proxy is not wired to the page's message channel.
  new ConfigBridge({ allowedOrigin: configOrigin, target: getPageWindow() }).start();
}

function bootstrap(): void {
  const configOrigin = new URL(CONFIG_PAGE_ORIGIN).origin;
  if (window.location.origin === configOrigin) {
    runConfigMode(configOrigin);
    return;
  }
  runPortalMode();
}

bootstrap();
