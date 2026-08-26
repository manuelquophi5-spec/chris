"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import { geolocationErrorMessage, getDevicePosition } from "@/lib/geolocation";
import { enqueue } from "@/lib/offline-queue";

type Status = "working" | "success" | "error" | "queued";

type ScanState = {
  status: Status;
  message: string;
};

function ScanContent() {
  const searchParams = useSearchParams();
  const { standalone } = usePwaInstall();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<ScanState>({
    status: "working",
    message: "Checking your location…",
  });

  const runScan = useCallback(async () => {
    if (!token) {
      setState({
        status: "error",
        message: "Missing QR code. Scan a class QR code to check in.",
      });
      return;
    }

    setState({ status: "working", message: "Checking your location…" });

    let position;
    try {
      position = await getDevicePosition();
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err.code as Parameters<typeof geolocationErrorMessage>[0])
          : "unknown";
      setState({
        status: "error",
        message: geolocationErrorMessage(code, standalone),
      });
      return;
    }

    setState({ status: "working", message: "Marking your attendance…" });

    const payload = {
      token,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      timezoneOffset: new Date().getTimezoneOffset(),
    };

    try {
      const res = await authFetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(
        res,
      );
      if (!res.ok) {
        setState({
          status: "error",
          message: data.error ?? "Could not check in. Try again.",
        });
        return;
      }
      setState({
        status: "success",
        message: data.message ?? "Checked in.",
      });
    } catch {
      enqueue("/api/attendance/scan", payload, "Class check-in");
      setState({
        status: "queued",
        message:
          "You're offline. Saved — we'll submit this once you're back online.",
      });
    }
  }, [token, standalone]);

  useEffect(() => {
    void runScan();
  }, [runScan]);

  return (
    <AuthPageShell title="Class check-in" subtitle="Scanned from a class QR code">
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        {state.status === "working" && (
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--ella-border)] border-t-[var(--ella-accent)]"
            aria-hidden
          />
        )}
        {state.status === "success" && (
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ella-accent-subtle)] text-3xl text-[var(--ella-accent-hover)]"
            aria-hidden
          >
            ✓
          </div>
        )}
        {state.status === "error" && (
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ella-danger-subtle)] text-3xl text-[var(--ella-danger)]"
            aria-hidden
          >
            !
          </div>
        )}
        {state.status === "queued" && (
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ella-warning-subtle)] text-2xl text-[var(--ella-warning)]"
            aria-hidden
          >
            ⏳
          </div>
        )}

        <p
          className="text-base font-medium text-[var(--ella-fg)]"
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>

        {state.status === "error" && (
          <button
            type="button"
            onClick={() => void runScan()}
            className="ella-btn-primary mt-2 w-full"
          >
            Try again
          </button>
        )}

        {state.status !== "working" && (
          <Link href="/dashboard" className="ella-link mt-2 text-sm">
            Go to dashboard
          </Link>
        )}
      </div>
    </AuthPageShell>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <p className="text-center text-sm text-[var(--ella-fg-muted)]">Loading…</p>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
