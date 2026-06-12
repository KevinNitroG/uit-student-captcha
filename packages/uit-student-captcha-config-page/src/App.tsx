// Configuration SPA shell. The OCR-provider form and the postMessage bridge to
// the userscript's GM storage land in the implementation phase
// (specs/001-captcha-ocr-autofill). This scaffold renders the page skeleton with
// the Tailwind + shadcn/ui stack wired up (see contracts/config-ui.contract.md).

import { Button } from "@/components/ui/button";

export function App() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        UIT Student Captcha — Configuration
      </h1>
      <p className="text-muted-foreground">
        Configure your OCR providers (primary and fallback) and their API keys.
        Settings are saved to your userscript manager via the installed userscript.
      </p>
      <Button disabled>Save (coming soon)</Button>
    </main>
  );
}
