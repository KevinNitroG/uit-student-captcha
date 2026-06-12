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
import { GmHttpClient } from "./model/http/HttpClient.ts";
import { gmGetValue } from "./platform/gm.ts";
import { CaptchaViewModel } from "./viewmodel/CaptchaViewModel.ts";
import { PortalView } from "./view/PortalView.ts";

const rawOrigin = import.meta.env["VITE_CONFIG_PAGE_ORIGIN"];
const CONFIG_PAGE_ORIGIN = typeof rawOrigin === "string" ? rawOrigin : "http://localhost:3000";

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
  const http = new GmHttpClient();
  const viewModel = new CaptchaViewModel(loadConfig(), http);
  const view = new PortalView(viewModel, {
    configUrl: `${CONFIG_PAGE_ORIGIN}/configure.html`,
  });
  void view.run();
}

function bootstrap(): void {
  const configOrigin = new URL(CONFIG_PAGE_ORIGIN).origin;
  if (window.location.origin === configOrigin) {
    // TODO(US3 / T039): config-bridge mode — relay postMessage <-> GM storage.
    return;
  }
  runPortalMode();
}

bootstrap();
