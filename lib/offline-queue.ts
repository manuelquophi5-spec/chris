"use client";

import { authFetch, parseJsonResponse } from "@/lib/auth-client";

const STORAGE_KEY = "dla_offline_queue";

export type QueuedEndpoint = "/api/attendance/mark" | "/api/attendance/scan";

export type QueuedRequest = {
  id: string;
  endpoint: QueuedEndpoint;
  body: Record<string, unknown>;
  queuedAt: number;
  label: string;
};

export type FlushResult =
  | { item: QueuedRequest; ok: true; message?: string }
  | { item: QueuedRequest; ok: false; error: string };

function readQueue(): QueuedRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedRequest[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* storage unavailable (private mode, quota) — queue is best-effort */
  }
  notifyListeners();
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Saves a failed check-in/scan locally to retry once back online. */
export function enqueue(
  endpoint: QueuedEndpoint,
  body: Record<string, unknown>,
  label: string,
): QueuedRequest {
  const item: QueuedRequest = {
    id: generateId(),
    endpoint,
    body,
    queuedAt: Date.now(),
    label,
  };
  writeQueue([...readQueue(), item]);
  return item;
}

export function getQueue(): QueuedRequest[] {
  return readQueue();
}

export function queueCount(): number {
  return readQueue().length;
}

/**
 * Retries every queued item. A network failure keeps an item queued; a real
 * server rejection (4xx — geofence, schedule window, already checked in,
 * invalid token) removes it since retrying can't change that answer; a
 * transient server error (5xx) keeps it queued for the next attempt.
 */
export async function flushQueue(): Promise<FlushResult[]> {
  const queue = readQueue();
  if (queue.length === 0) return [];

  const results: FlushResult[] = [];
  const remaining: QueuedRequest[] = [];

  for (const item of queue) {
    try {
      const res = await authFetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(
        res,
      );
      if (res.ok) {
        results.push({ item, ok: true, message: data.message });
      } else if (res.status >= 500) {
        remaining.push(item);
      } else {
        results.push({
          item,
          ok: false,
          error: data.error ?? "Could not sync this check-in",
        });
      }
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return results;
}

// Minimal pub-sub so a pending-count indicator could subscribe later without
// needing a global state library now.
type Listener = () => void;
const listeners = new Set<Listener>();
function notifyListeners() {
  listeners.forEach((l) => l());
}
export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
