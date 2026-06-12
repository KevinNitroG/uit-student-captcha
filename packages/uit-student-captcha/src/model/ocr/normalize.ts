// Normalize raw OCR text into the single token the captcha answer field expects
// (research.md Decision 5 / FR-010): strip to [A-Za-z0-9] tokens and return the
// single longest one. An empty result signals provider failure to the caller.

export function normalizeCaptchaText(raw: string): string {
  const tokens = raw.match(/[A-Za-z0-9]+/g);
  if (!tokens) return "";
  return tokens.reduce(
    (longest, token) => (token.length > longest.length ? token : longest),
    "",
  );
}
