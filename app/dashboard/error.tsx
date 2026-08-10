"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] render error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="ella-heading-page">Something went wrong</h1>
      <p className="ella-text-muted">
        This page couldn&apos;t load. Try again, or sign out and back in if it
        keeps happening.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-[var(--ella-fg-subtle)]">
          Reference: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={reset} className={"ella-btn-primary px-5"}>
          Try again
        </button>
        <a href="/login" className="ella-btn-secondary px-5">
          Sign out
        </a>
      </div>
    </div>
  );
}
