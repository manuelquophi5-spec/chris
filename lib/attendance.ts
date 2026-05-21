import { getDayKey } from "@/lib/day";
import { getActiveSessionsForUser } from "@/lib/sessions";
import { Attendance } from "@/models/Attendance";
import type {
  ActiveSessionSummary,
  AttendanceRecordSummary,
  AttendanceType,
  TodayAttendanceStatus,
} from "@/types";
import mongoose from "mongoose";

export function parseAttendanceType(value: unknown): AttendanceType | null {
  if (value === "check_in" || value === "check_out") return value;
  return null;
}

export function parseTimezoneOffset(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

type PopulatedLocation = { name?: string };
type PopulatedSession = { title?: string };

export function toAttendanceSummary(
  doc: {
    _id: mongoose.Types.ObjectId;
    type: AttendanceType;
    markedAt: Date;
    distanceMeters: number;
    locationId?: PopulatedLocation | mongoose.Types.ObjectId | null;
    sessionId?: PopulatedSession | mongoose.Types.ObjectId | null;
  },
  locationName?: string,
  sessionTitle?: string,
): AttendanceRecordSummary {
  const locObj = doc.locationId;
  const name =
    locationName ??
    (locObj && typeof locObj === "object" && "name" in locObj
      ? String(locObj.name)
      : "Site");
  const locId =
    locObj && typeof locObj === "object" && "_id" in locObj
      ? String(locObj._id)
      : locObj
        ? String(locObj)
        : "";

  const sessObj = doc.sessionId;
  const title =
    sessionTitle ??
    (sessObj && typeof sessObj === "object" && "title" in sessObj
      ? String(sessObj.title)
      : undefined);
  const sessId =
    sessObj && typeof sessObj === "object" && "_id" in sessObj
      ? String(sessObj._id)
      : sessObj
        ? String(sessObj)
        : undefined;

  return {
    id: doc._id.toString(),
    type: doc.type,
    markedAt: doc.markedAt.toISOString(),
    locationId: locId,
    locationName: name,
    distanceMeters: doc.distanceMeters,
    sessionId: sessId,
    sessionTitle: title,
  };
}

export async function getTodayRecordsForUser(
  userId: string,
  timezoneOffsetMinutes: number,
) {
  const dayKey = getDayKey(new Date(), timezoneOffsetMinutes);
  const records = await Attendance.find({
    userId,
    dayKey,
    $or: [{ sessionId: null }, { sessionId: { $exists: false } }],
  })
    .sort({ markedAt: 1 })
    .populate("locationId", "name")
    .lean();

  const checkIn = records.find((r) => r.type === "check_in");
  const checkOut = records.find((r) => r.type === "check_out");

  return {
    dayKey,
    checkIn: checkIn
      ? toAttendanceSummary({
          ...checkIn,
          type: "check_in",
          locationId: checkIn.locationId as PopulatedLocation,
        })
      : null,
    checkOut: checkOut
      ? toAttendanceSummary({
          ...checkOut,
          type: "check_out",
          locationId: checkOut.locationId as PopulatedLocation,
        })
      : null,
  };
}

export async function buildTodayStatus(
  userId: string,
  timezoneOffsetMinutes: number,
): Promise<TodayAttendanceStatus> {
  const { dayKey, checkIn, checkOut } = await getTodayRecordsForUser(
    userId,
    timezoneOffsetMinutes,
  );
  const activeSessions = await getActiveSessionsForUser(userId);
  const useSessionMode = activeSessions.length > 0;

  let canCheckIn = !checkIn;
  let canCheckOut = Boolean(checkIn && !checkOut);

  if (useSessionMode) {
    const open = activeSessions.filter((s) => !s.hasCheckOut);
    canCheckIn = open.some((s) => !s.hasCheckIn);
    canCheckOut = open.some((s) => s.hasCheckIn && !s.hasCheckOut);
  }

  const isComplete = useSessionMode
    ? activeSessions.length > 0 &&
      activeSessions.every((s) => s.hasCheckIn && s.hasCheckOut)
    : Boolean(checkIn && checkOut);

  return {
    dayKey,
    checkIn,
    checkOut,
    canCheckIn,
    canCheckOut,
    isComplete,
    activeSessions,
    useSessionMode,
  };
}
