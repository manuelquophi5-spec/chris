import { getDayKey } from "@/lib/day";

/** Minutes since midnight from "HH:mm" or "H:mm". */
export function parseTimeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function formatMinutesAsTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Local calendar parts using browser-style timezone offset. */
export function getLocalTimeParts(
  date: Date,
  timezoneOffsetMinutes: number,
): { dayOfWeek: number; minutes: number; dayKey: string } {
  const localMs = date.getTime() - timezoneOffsetMinutes * 60 * 1000;
  const d = new Date(localMs);
  return {
    dayOfWeek: d.getUTCDay(),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
    dayKey: getDayKey(date, timezoneOffsetMinutes),
  };
}

export type ScheduleWindow = {
  active: boolean;
  isLate: boolean;
  reason?: string;
  startsInMinutes?: number;
  endsInMinutes?: number;
};

export function evaluateCourseSchedule(
  scheduleDays: number[],
  startTime: string,
  endTime: string,
  lateAfterMinutes: number,
  now: Date,
  timezoneOffsetMinutes: number,
): ScheduleWindow {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  if (startMin === null || endMin === null) {
    return { active: false, isLate: false, reason: "Invalid class schedule" };
  }
  if (endMin <= startMin) {
    return { active: false, isLate: false, reason: "End time must be after start time" };
  }

  const { dayOfWeek, minutes } = getLocalTimeParts(now, timezoneOffsetMinutes);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (!scheduleDays.includes(dayOfWeek)) {
    return {
      active: false,
      isLate: false,
      reason: `Class is not scheduled today (${dayNames[dayOfWeek]}).`,
    };
  }

  if (minutes < startMin) {
    return {
      active: false,
      isLate: false,
      reason: `Class starts at ${startTime}.`,
      startsInMinutes: startMin - minutes,
    };
  }

  if (minutes > endMin) {
    return {
      active: false,
      isLate: false,
      reason: `Class ended at ${endTime}.`,
      endsInMinutes: minutes - endMin,
    };
  }

  const lateThreshold = startMin + Math.max(0, lateAfterMinutes);
  return {
    active: true,
    isLate: minutes > lateThreshold,
  };
}

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
] as const;
