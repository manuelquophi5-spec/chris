import { connectDB } from "@/lib/db";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  generateSetupCode,
  hashSetupCode,
  setupCodeExpiry,
} from "@/lib/setup-code";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return jsonError("Unauthorized", 401);

    const ip = getClientIp(request);
    const limited = await checkRateLimit(`request-reset:${ip}:${user.id}`, 3);
    if (!limited.allowed) {
      return jsonError(
        `Too many requests. Try again in ${limited.retryAfterSec ?? 60} seconds.`,
        429,
      );
    }

    await connectDB();

    const doc = await User.findById(user.id);
    if (!doc) return jsonError("User not found", 404);

    // Clear the password so the account owner can use Set Password again.
    const setupCode = generateSetupCode();
    doc.passwordHash = undefined;
    doc.passwordMustChange = true;
    doc.failedLoginAttempts = 0;
    doc.lockedUntil = null;
    doc.setupCodeHash = await hashSetupCode(setupCode);
    doc.setupCodeExpiresAt = setupCodeExpiry();
    await doc.save();

    return jsonOk({
      setupCode,
      message: "Password cleared. Use this one-time setup code on the Set Password page to create a new one.",
    } as Record<string, unknown>);
  } catch (error) {
    console.error("[api/auth/request-reset]", error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
