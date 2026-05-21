/** Normalize employee ID for storage and login (trim, uppercase). */
export function normalizeEmployeeId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Internal email so legacy unique index on `email` stays satisfied. */
export function internalEmailFromEmployeeId(employeeId: string): string {
  const safe = normalizeEmployeeId(employeeId).toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return `${safe || "user"}@internal.ella`;
}

export function isValidEmployeeId(employeeId: string): boolean {
  const n = normalizeEmployeeId(employeeId);
  return n.length >= 3 && n.length <= 32 && /^[A-Z0-9][A-Z0-9_-]*$/.test(n);
}
