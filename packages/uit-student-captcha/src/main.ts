// Userscript entry point.
//
// One bundle, two runtime modes (the script @matches both origins):
//   - on student.uit.edu.vn → detect the signin form and auto-fill the captcha
//     using the configured OCR providers;
//   - on the hosted GitHub Pages config page → bridge settings between the React
//     SPA (via postMessage) and the userscript's GM storage.
//
// Full MVVM wiring (resolver registry, view-model, view) lands in the
// implementation phase tracked under specs/001-captcha-ocr-autofill.

const CONFIG_PAGE_URL_PREFIX =
  "https://kevinnitrog.github.io/uit-student-captcha/";

function bootstrap(): void {
  if (window.location.href.startsWith(CONFIG_PAGE_URL_PREFIX)) {
    // TODO(impl): config-bridge mode — relay postMessage <-> GM_getValue/GM_setValue.
    return;
  }
  // TODO(impl): captcha mode — detect signin form, run OCR chain, fill answer field.
}

bootstrap();
