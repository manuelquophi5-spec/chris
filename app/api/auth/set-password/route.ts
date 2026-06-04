import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  COOKIE_NAME,
  cookieMaxAgeForRole,
  getCookieOptions,
  hashPassword,
  signAccessToken,
} from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { validatePassword } from "@/lib/password-policy";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { toSessionUser } from "@/lib/session-user";
import { findUserByEmployeeIdForAuth } from "@/lib/find-user-by-employee-id";
import { userNeedsPasswordSetup } from "@/lib/password-hash";
import { isValidEmployeeId, normalizeEmployeeId } from "@/lib/user-account";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const employeeId = normalizeEmployeeId(
      String(body.studentId ?? body.employeeId ?? ""),
    );
    const password = String(body.password ?? "");

    if (!isValidEmployeeId(employeeId)) {
      return jsonError("Enter a valid student ID");
    }

    const limited = checkRateLimit(`set-password:${ip}:${employeeId}`);
    if (!limited.allowed) {
      return jsonError(
        `Too many attempts. Try again in ${limited.retryAfterSec ?? 60} seconds.`,
        429,
      );
    }

    const policyError = validatePassword(password);
    if (policyError) return jsonError(policyError);

    await connectDB();
    const doc = await findUserByEmployeeIdForAuth(employeeId);
    if (!doc) {
      return jsonError("Student ID not found", 404);
    }

    if (!userNeedsPasswordSetup(doc)) {
      return jsonError(
        "Password already set. Sign in with your student ID and password.",
        409,
      );
    }

    doc.passwordHash = await hashPassword(password);
    doc.passwordMustChange = false;
    doc.failedLoginAttempts = 0;
    doc.lockedUntil = null;
    await doc.save();

    const sessionUser = toSessionUser(doc);
    const token = await signAccessToken(sessionUser);
    const response = NextResponse.json({
      user: sessionUser,
      message: "Password created. You are signed in.",
    });
    response.cookies.set(
      COOKIE_NAME,
      token,
      getCookieOptions(cookieMaxAgeForRole(sessionUser.role)),
    );
    return response;
  } catch (err) {
    console.error("[auth/set-password]", err);
    return jsonError("Could not set password. Try again.", 500);
  }
}
