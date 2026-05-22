"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS legacy
    window.navigator.standalone === true
  );
}

export function PwaProvider() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[pwa] SW register failed", err));
    }

    if (isIos()) {
      setShowIosHint(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setDismissed(true);
  }

  if (isStandalone() || dismissed) return null;

  const bannerClass =
    "fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md ella-card p-4 sm:bottom-6 sm:left-auto sm:right-6 md:bottom-6";

  if (installEvent) {
    return (
      <div className={bannerClass} role="region" aria-label="Install app">
        <p className="text-sm font-bold text-[var(--ella-fg)]">
          Install Ella on your phone
        </p>
        <p className="ella-text-muted mt-1 text-xs">
          Add to your home screen for quick check-in.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="ella-btn-primary flex-1 py-2.5 text-sm"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="ella-btn-secondary px-4 py-2.5 text-sm"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div className={bannerClass} role="region" aria-label="Install on iPhone">
        <p className="text-sm font-bold text-[var(--ella-fg)]">
          Add Ella to your home screen
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-[var(--ella-fg-muted)]">
          <li>Tap Share in Safari (square with arrow)</li>
          <li>
            Choose <strong>Add to Home Screen</strong>
          </li>
          <li>Tap Add, then open Ella from your home screen</li>
        </ol>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ella-btn-secondary mt-3 w-full py-2 text-sm"
        >
          Got it
        </button>
      </div>
    );
  }

  return null;
}
