/**
 * Calendar day key (YYYY-MM-DD) in the user's local timezone.
 * @param timezoneOffsetMinutes Same as `Date.getTimezoneOffset()` from the browser.
 */
export function getDayKey(
  date: Date = new Date(),
  timezoneOffsetMinutes = 0,
): string {
  const localMs = date.getTime() - timezoneOffsetMinutes * 60 * 1000;
  return new Date(localMs).toISOString().slice(0, 10);
}

export function startOfLocalDay(
  dayKey: string,
  timezoneOffsetMinutes = 0,
): Date {
  const utcMidnight = new Date(`${dayKey}T00:00:00.000Z`);
  return new Date(utcMidnight.getTime() + timezoneOffsetMinutes * 60 * 1000);
}

export function endOfLocalDay(dayKey: string, timezoneOffsetMinutes = 0): Date {
  const start = startOfLocalDay(dayKey, timezoneOffsetMinutes);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}
