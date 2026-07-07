// Informational banner explaining the script's solving logic: alt text extraction
// is the primary method (free, instant, no config), and OCR providers are optional
// fallbacks.

export function SolvingLogicInfo() {
  return (
    <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 space-y-2">
      <h2 className="font-medium">How captcha solving works</h2>
      <p>
        This script extracts the captcha solution directly from the image&apos;s{" "}
        <code className="rounded bg-blue-100 px-1">alt</code> attribute (formatted
        as <code className="rounded bg-blue-100 px-1">captcha:solution</code>). This
        is instant, free, and requires <strong>no configuration</strong>.
      </p>
      <p>
        <strong>OCR providers are optional.</strong> They serve as a fallback when alt
        text extraction fails (e.g., the portal changes its format). You only need to
        configure an OCR provider if the script stops working without one.
      </p>
    </section>
  );
}
