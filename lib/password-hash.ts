/** True when the stored value looks like a bcrypt hash we can verify. */
export function isUsablePasswordHash(
  hash: string | undefined | null,
): boolean {
  if (!hash || typeof hash !== "string") return false;
  return /^\$2[aby]\$\d{2}\$/.test(hash);
}

/** User should use Set password (or login with empty password to redirect). */
export function userNeedsPasswordSetup(doc: {
  passwordHash?: string | null;
  passwordMustChange?: boolean;
}): boolean {
  return Boolean(doc.passwordMustChange) || !isUsablePasswordHash(doc.passwordHash);
}
