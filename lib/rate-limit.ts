import { RATE_LIMIT_MAX_AUTH, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { connectDB } from "@/lib/db";
import { RateLimit } from "@/models/RateLimit";

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Sliding-window counter stored in MongoDB so the limit is shared across
 * serverless instances (an in-memory Map would give each Vercel lambda its
 * own counter, making the real limit effectively unbounded).
 */
export async function checkRateLimit(
  key: string,
  max = RATE_LIMIT_MAX_AUTH,
  windowMs = RATE_LIMIT_WINDOW_MS,
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  await connectDB();

  const now = new Date();
  const windowResetAt = new Date(now.getTime() + windowMs);

  // Roll over any window that has already expired before counting this hit.
  await RateLimit.updateOne(
    { key, resetAt: { $lte: now } },
    { $set: { count: 0, resetAt: windowResetAt } },
  );

  const updated = await RateLimit.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { resetAt: windowResetAt },
    },
    { upsert: true, new: true },
  );

  if (updated.count > max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((updated.resetAt.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  return { allowed: true };
}
