"use client";

import { useCallback, useEffect, useState } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS legacy
    window.navigator.standalone === true
  );
}

export function usePwaInstall() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [installing, setInstalling] = useState(false);

  const refreshStandalone = useCallback(() => {
    setStandalone(isStandalone());
  }, []);

  useEffect(() => {
    setStandalone(isStandalone());
    setIos(isIos());

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[pwa] SW register failed", err));
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstallEvent(null);
      refreshStandalone();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window
      .matchMedia("(display-mode: standalone)")
      .addEventListener("change", refreshStandalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window
        .matchMedia("(display-mode: standalone)")
        .removeEventListener("change", refreshStandalone);
    };
  }, [refreshStandalone]);

  const canPromptInstall = Boolean(installEvent) && !standalone;

  async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (standalone) return "unavailable";
    if (!installEvent) return "unavailable";

    setInstalling(true);
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") {
        setInstallEvent(null);
        refreshStandalone();
      }
      return outcome;
    } catch (err) {
      console.warn("[pwa] install prompt failed", err);
      return "unavailable";
    } finally {
      setInstalling(false);
    }
  }

  return {
    installEvent,
    standalone,
    ios,
    installing,
    canPromptInstall,
    promptInstall,
  };
}
