import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  isAccountLocked,
  lockoutMessage,
  recordFailedLogin,
  clearLoginFailures,
} from "@/lib/account-lock";
import {
  COOKIE_NAME,
  cookieMaxAgeForRole,
  getCookieOptions,
  signAccessToken,
  verifyPassword,
} from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { findAdminByEmail } from "@/lib/find-admin-by-email";
import { isValidEmail, normalizeEmail } from "@/lib/normalize-email";
import { userNeedsPasswordSetup } from "@/lib/password-hash";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { toSessionUser } from "@/lib/session-user";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");

    if (!isValidEmail(email)) {
      return jsonError("Enter a valid email address");
    }
    if (!password) {
      return jsonError("Password is required");
    }

    const rateKey = `admin-login:${ip}:${email}`;
    const limited = await checkRateLimit(rateKey);
    if (!limited.allowed) {
      return jsonError(
        `Too many attempts. Try again in ${limited.retryAfterSec ?? 60} seconds.`,
        429,
      );
    }

    await connectDB();
    const doc = await findAdminByEmail(email);

    if (!doc) {
      return jsonError("Invalid email or password", 401);
    }

    if (isAccountLocked(doc.lockedUntil)) {
      return jsonError(lockoutMessage(doc.lockedUntil!), 423);
    }

    if (userNeedsPasswordSetup(doc)) {
      return jsonError(
        "Admin password is not set up. Run npm run create-admin or reset the account in the database.",
        403,
      );
    }

    const valid = await verifyPassword(password, doc.passwordHash!);
    if (!valid) {
      await recordFailedLogin(doc);
      if (isAccountLocked(doc.lockedUntil)) {
        return jsonError(lockoutMessage(doc.lockedUntil!), 423);
      }
      return jsonError("Invalid email or password", 401);
    }

    await clearLoginFailures(doc);
    const sessionUser = toSessionUser(doc);
    const token = await signAccessToken(sessionUser);
    const response = NextResponse.json({ user: sessionUser });
    response.cookies.set(
      COOKIE_NAME,
      token,
      getCookieOptions(cookieMaxAgeForRole(sessionUser.role)),
    );
    return response;
  } catch (err) {
    console.error("[auth/admin/login]", err);
    const message =
      err instanceof Error && err.message.includes("JWT_SECRET")
        ? "Server misconfigured: set JWT_SECRET (32+ characters) in Vercel environment variables, then redeploy"
        : err instanceof Error && err.message.includes("MONGODB_URI")
          ? "Server misconfigured: database not connected"
          : "Admin sign-in failed. Try again in a moment.";
    return jsonError(message, 500);
  }
}
