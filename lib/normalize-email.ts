/** Normalize email for lookup and storage. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const n = normalizeEmail(email);
  return n.length >= 5 && n.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n);
}
