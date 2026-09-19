/**
 * The class schedule window, the "late" flag and the one-check-in-per-day key
 * all depend on "what time is it on campus". That must come from the server,
 * never from the browser: a student who can edit the request could otherwise
 * send a forged timezone offset to make a finished class look open, or dodge
 * the late flag.
 *
 * Same sign convention as JavaScript's Date.getTimezoneOffset(): minutes
 * UTC is *ahead of* local time. Ghana (Africa/Accra) is UTC+0 all year with no
 * daylight saving, so the default is 0. Override with CAMPUS_TZ_OFFSET_MINUTES
 * only if the deployment is elsewhere.
 */
export function campusTimezoneOffsetMinutes(
  raw: string | undefined = process.env.CAMPUS_TZ_OFFSET_MINUTES,
): number {
  if (raw === undefined || raw.trim() === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  // Real-world offsets are within ±14h.
  return Math.max(-14 * 60, Math.min(14 * 60, Math.round(n)));
}
