// Configuration SPA shell. The OCR-provider form and the postMessage bridge to
// the userscript's GM storage land in the implementation phase
// (specs/001-captcha-ocr-autofill). This scaffold renders the page skeleton.

export function App() {
  return (
    <main>
      <h1>UIT Student Captcha — Configuration</h1>
      <p>
        Configure your OCR providers (primary and fallback) and their API keys.
        Settings are saved to your userscript manager via the installed userscript.
      </p>
    </main>
  );
}
