import { useState } from "react";

export interface VersionWarningProps {
  scriptVersion: string;
  pageVersion: string;
  updateUrl: string;
}

export function VersionWarning({ scriptVersion, pageVersion, updateUrl }: VersionWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p>
        <strong>Userscript outdated</strong> — you are running v{scriptVersion}, but this config
        page requires v{pageVersion}.{" "}
        <a
          href={updateUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-amber-700"
        >
          Update now
        </a>
        .
      </p>
      <button
        type="button"
        aria-label="Dismiss version warning"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-600 hover:text-amber-800"
      >
        ✕
      </button>
    </div>
  );
}
