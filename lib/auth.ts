import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import {
  ADMIN_JWT_EXPIRES,
  USER_JWT_EXPIRES,
} from "@/lib/constants";
import type { SessionUser, UserRole } from "@/types";

const COOKIE_NAME = "ella_session";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? USER_JWT_EXPIRES;

export { COOKIE_NAME };

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be set and at least 32 characters in .env.local",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function jwtExpiresForRole(role: UserRole): string {
  if (role === "admin" || role === "instructor") return ADMIN_JWT_EXPIRES;
  return JWT_EXPIRES_IN;
}

export function cookieMaxAgeForRole(role: UserRole): number {
  const hours = role === "admin" || role === "instructor" ? 24 : 24 * 7;
  return hours * 60 * 60;
}

export async function signAccessToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    employeeId: user.employeeId,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(jwtExpiresForRole(user.role))
    .sign(getSecretKey());
}

export async function verifyAccessToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      payload.role !== "admin" &&
      payload.role !== "instructor" &&
      payload.role !== "user"
    ) {
      return null;
    }
    const employeeId =
      typeof payload.employeeId === "string"
        ? payload.employeeId
        : payload.email.split("@")[0]?.toUpperCase() ?? "";
    return {
      id: payload.sub,
      employeeId,
      email: payload.email,
      name: payload.name,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export function getCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  // Only require Secure cookies on HTTPS deployments (Vercel). LAN http://IP dev must stay non-secure.
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    (process.env.NODE_ENV === "production" &&
      process.env.VERCEL === "1");
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
