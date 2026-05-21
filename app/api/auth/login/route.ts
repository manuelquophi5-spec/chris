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
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { toSessionUser } from "@/lib/session-user";
import { findUserByEmployeeIdForAuth } from "@/lib/find-user-by-employee-id";
import { userNeedsPasswordSetup } from "@/lib/password-hash";
import { normalizeEmployeeId } from "@/lib/user-account";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const employeeId = normalizeEmployeeId(
      String(body.employeeId ?? body.email ?? ""),
    );
    const password = String(body.password ?? "");

    if (!employeeId) {
      return jsonError("Employee ID is required");
    }

    const rateKey = `login:${ip}:${employeeId}`;
    const limited = checkRateLimit(rateKey);
    if (!limited.allowed) {
      return jsonError(
        `Too many attempts. Try again in ${limited.retryAfterSec ?? 60} seconds.`,
        429,
      );
    }

    await connectDB();
    const doc = await findUserByEmployeeIdForAuth(employeeId);

    if (!doc) {
      return jsonError("Invalid employee ID or password", 401);
    }

    if (isAccountLocked(doc.lockedUntil)) {
      return jsonError(lockoutMessage(doc.lockedUntil!), 423);
    }

    if (userNeedsPasswordSetup(doc)) {
      return NextResponse.json({
        requiresPasswordSetup: true,
        employeeId: doc.employeeId ?? employeeId,
        name: doc.name,
      });
    }

    if (!password) {
      return jsonError("Password is required");
    }

    const hash = doc.passwordHash!;
    const valid = await verifyPassword(password, hash);
    if (!valid) {
      await recordFailedLogin(doc);
      if (isAccountLocked(doc.lockedUntil)) {
        return jsonError(lockoutMessage(doc.lockedUntil!), 423);
      }
      return jsonError("Invalid employee ID or password", 401);
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
    console.error("[auth/login]", err);
    const message =
      err instanceof Error && err.message.includes("JWT_SECRET")
        ? "Server misconfigured: JWT_SECRET missing or too short"
        : err instanceof Error && err.message.includes("MONGODB_URI")
          ? "Server misconfigured: database not connected"
          : "Login failed. Try again in a moment.";
    return jsonError(message, 500);
  }
}
