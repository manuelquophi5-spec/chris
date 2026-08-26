"use client";

import { useEffect } from "react";
import { flushQueue } from "@/lib/offline-queue";
import { toastError, toastSuccess } from "@/lib/toast";

/** Retries queued check-ins on mount and whenever the browser comes back online. */
export function OfflineQueueProvider() {
  useEffect(() => {
    async function flush() {
      const results = await flushQueue();
      for (const result of results) {
        if (result.ok) {
          toastSuccess(result.message ?? `Synced: ${result.item.label}`);
        } else {
          toastError(`${result.item.label}: ${result.error}`);
        }
      }
    }

    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);

  return null;
}
