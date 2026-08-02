import crypto from "node:crypto";
import bcrypt from "bcryptjs";

// Excludes 0/O and 1/I/L — easy to misread when handed out on paper or read aloud.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const SETUP_CODE_TTL_DAYS = 14;

/** Random one-time code an admin (or the account owner via self-reset) hands out before Set password. */
export function generateSetupCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}

export async function hashSetupCode(code: string): Promise<string> {
  return bcrypt.hash(code.trim().toUpperCase(), 10);
}

export async function verifySetupCode(
  code: string,
  hash: string | undefined | null,
): Promise<boolean> {
  if (!hash || !code) return false;
  return bcrypt.compare(code.trim().toUpperCase(), hash);
}

export function setupCodeExpiry(): Date {
  return new Date(Date.now() + SETUP_CODE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function isSetupCodeExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() <= Date.now();
}
