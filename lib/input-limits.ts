/** Admin-entered values are trusted less than they look: bound them so one slip can't break the geofence or the database. */

/** A "campus" geofence bigger than this is almost certainly a typo, and would let people check in from far off-site. */
export const MIN_LOCATION_RADIUS_METERS = 10;
export const MAX_LOCATION_RADIUS_METERS = 5000;

export const MAX_NAME_LENGTH = 120;
export const MAX_COURSE_CODE_LENGTH = 20;
export const MAX_DESCRIPTION_LENGTH = 1000;

export const MAX_LATE_AFTER_MINUTES = 120;
export const DEFAULT_LATE_AFTER_MINUTES = 15;

/** Whole minutes 0–120; anything non-numeric falls back to the default instead of becoming NaN. */
export function parseLateAfterMinutes(
  raw: unknown,
  fallback = DEFAULT_LATE_AFTER_MINUTES,
): number {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_LATE_AFTER_MINUTES, Math.max(0, Math.round(n)));
}

/** Validates a campus radius; returns an error message, or null when acceptable. */
export function validateRadiusMeters(radius: number): string | null {
  if (!Number.isFinite(radius) || radius < MIN_LOCATION_RADIUS_METERS) {
    return `Radius must be at least ${MIN_LOCATION_RADIUS_METERS} metres`;
  }
  if (radius > MAX_LOCATION_RADIUS_METERS) {
    return `Radius can be at most ${MAX_LOCATION_RADIUS_METERS} metres — a larger area would let people check in from far off-site`;
  }
  return null;
}
