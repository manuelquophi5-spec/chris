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

  if (installEvent) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl sm:left-auto sm:right-6"
        role="region"
        aria-label="Install app"
      >
        <p className="text-sm font-bold text-slate-900">Install Ella on your phone</p>
        <p className="mt-1 text-xs text-slate-600">
          Add to your home screen for quick check-in — works like an app.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:left-auto sm:right-6"
        role="region"
        aria-label="Install on iPhone"
      >
        <p className="text-sm font-bold text-slate-900">Add Ella to your home screen</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-600">
          <li>Tap the Share button in Safari (square with arrow)</li>
          <li>Choose <strong>Add to Home Screen</strong></li>
          <li>Tap Add — then open Ella from your home screen</li>
        </ol>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600"
        >
          Got it
        </button>
      </div>
    );
  }

  return null;
}
