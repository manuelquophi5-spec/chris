import { RATE_LIMIT_MAX_AUTH, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

function prune() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function checkRateLimit(
  key: string,
  max = RATE_LIMIT_MAX_AUTH,
  windowMs = RATE_LIMIT_WINDOW_MS,
): { allowed: boolean; retryAfterSec?: number } {
  prune();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}
