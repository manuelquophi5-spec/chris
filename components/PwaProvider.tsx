"use client";

import { useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { APP_SHORT_TITLE } from "@/lib/brand";
import { toastInfo, toastSuccess } from "@/lib/toast";

export function PwaProvider() {
  const { standalone, ios, installing, canPromptInstall, promptInstall } =
    usePwaInstall();
  const [showHelp, setShowHelp] = useState(false);

  if (standalone) return null;

  async function handleInstall() {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toastSuccess(`${APP_SHORT_TITLE} installed. Open it from your home screen.`);
      setShowHelp(false);
      return;
    }
    if (outcome === "dismissed") return;
    setShowHelp(true);
    toastInfo(
      ios
        ? "On iPhone: Safari → Share → Add to Home Screen."
        : "Use your browser menu to install this app, or look for the install icon in the address bar.",
    );
  }

  const barClass =
    "fixed bottom-20 left-0 right-0 z-40 border-t border-[var(--ella-border)] bg-[var(--ella-surface)] px-4 py-3 shadow-[0_-4px_24px_oklch(0.25_0.02_265_/_0.08)] sm:bottom-0 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm sm:rounded-xl sm:border";

  return (
    <div className={barClass} role="region" aria-label="Install app">
      <div className="mx-auto flex max-w-lg items-center gap-3 sm:max-w-none">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--ella-fg)]">
            Install {APP_SHORT_TITLE}
          </p>
          <p className="ella-text-muted text-xs">
            {ios
              ? "Add to your home screen for quick check-in."
              : "Works like an app — faster check-in on site."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleInstall()}
          disabled={installing}
          className="ella-btn-primary shrink-0 px-5 py-2.5 text-sm"
        >
          {installing ? "…" : canPromptInstall ? "Install" : "How to"}
        </button>
      </div>

      {showHelp && (
        <div className="mx-auto mt-3 max-w-lg border-t border-[var(--ella-border)] pt-3 sm:max-w-none">
          {ios ? (
            <ol className="list-decimal space-y-1 pl-4 text-xs text-[var(--ella-fg-muted)]">
              <li>Open this page in Safari (not Chrome)</li>
              <li>Tap Share (square with arrow up)</li>
              <li>
                Tap <strong>Add to Home Screen</strong>, then Add
              </li>
            </ol>
          ) : (
            <ul className="space-y-1 text-xs text-[var(--ella-fg-muted)]">
              <li>
                <strong>Chrome / Edge:</strong> menu (⋮) → Install app, or look
                for the install icon in the address bar.
              </li>
              <li>
                <strong>Samsung Internet:</strong> menu → Add page to → Home
                screen.
              </li>
              <li>
                <strong>Already tried?</strong> Use HTTPS, stay on this site a
                moment, then tap Install again.
              </li>
            </ul>
          )}
          <button
            type="button"
            onClick={() => setShowHelp(false)}
            className="ella-btn-ghost mt-2 text-xs"
          >
            Hide steps
          </button>
        </div>
      )}
    </div>
  );
}
