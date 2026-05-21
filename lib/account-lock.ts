import { LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS } from "@/lib/constants";
import type { IUser } from "@/models/User";
import type { HydratedDocument } from "mongoose";

type UserDoc = HydratedDocument<IUser>;

export function isAccountLocked(lockedUntil?: Date | null): boolean {
  if (!lockedUntil) return false;
  return lockedUntil.getTime() > Date.now();
}

export function lockoutMessage(lockedUntil: Date): string {
  const mins = Math.max(
    1,
    Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000),
  );
  return `Account locked after too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or ask an admin to unlock.`;
}

export async function recordFailedLogin(doc: UserDoc): Promise<void> {
  doc.failedLoginAttempts = (doc.failedLoginAttempts ?? 0) + 1;
  if (doc.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
    doc.lockedUntil = new Date(
      Date.now() + LOCKOUT_MINUTES * 60 * 1000,
    );
  }
  await doc.save();
}

export async function clearLoginFailures(doc: UserDoc): Promise<void> {
  doc.failedLoginAttempts = 0;
  doc.lockedUntil = null;
  await doc.save();
}
