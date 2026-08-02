import { getDayKey } from "@/lib/day";
import { programLabel } from "@/lib/academic";
import {
  getActiveCoursesForStudent,
  getStudentProgramLevel,
} from "@/lib/courses";
import { getActiveSessionsForUser } from "@/lib/sessions";
import { Attendance } from "@/models/Attendance";
import type {
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
type PopulatedCourse = { title?: string };

export function toAttendanceSummary(
  doc: {
    _id: mongoose.Types.ObjectId;
    type: AttendanceType;
    markedAt: Date;
    distanceMeters: number;
    locationId?: PopulatedLocation | mongoose.Types.ObjectId | null;
    sessionId?: PopulatedSession | mongoose.Types.ObjectId | null;
    courseId?: PopulatedCourse | mongoose.Types.ObjectId | null;
    isLate?: boolean;
  },
  locationName?: string,
  sessionTitle?: string,
  courseTitle?: string,
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

  const courseObj = doc.courseId;
  const courseTitleResolved =
    courseTitle ??
    (courseObj && typeof courseObj === "object" && "title" in courseObj
      ? String(courseObj.title)
      : undefined);
  const courseId =
    courseObj && typeof courseObj === "object" && "_id" in courseObj
      ? String(courseObj._id)
      : courseObj
        ? String(courseObj)
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
    courseId,
    courseTitle: courseTitleResolved,
    isLate: doc.isLate,
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
    $and: [
      { $or: [{ sessionId: null }, { sessionId: { $exists: false } }] },
      { $or: [{ courseId: null }, { courseId: { $exists: false } }] },
    ],
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
  const profile = await getStudentProgramLevel(userId);
  const hasEnrollments = profile !== null;
  const activeCourses = hasEnrollments
    ? await getActiveCoursesForStudent(userId, timezoneOffsetMinutes)
    : [];
  const useCourseMode = hasEnrollments;

  const activeSessions = await getActiveSessionsForUser(userId);
  const hasActiveSessions = activeSessions.length > 0;
  const useSessionMode = !hasEnrollments && hasActiveSessions;

  let canCheckIn = !checkIn;
  let canCheckOut = Boolean(checkIn && !checkOut);

  if (useCourseMode) {
    canCheckIn = activeCourses.some((c) => c.canCheckIn);
    canCheckOut = activeCourses.some((c) => c.canCheckOut);
  } else if (useSessionMode) {
    const open = activeSessions.filter((s) => !s.hasCheckOut);
    canCheckIn = open.some((s) => !s.hasCheckIn);
    canCheckOut = open.some((s) => s.hasCheckIn && !s.hasCheckOut);
  }

  const isComplete = useCourseMode
    ? !activeCourses.some(
        (c) =>
          (c.window.active && !c.hasCheckIn) ||
          (c.hasCheckIn && !c.hasCheckOut),
      )
    : useSessionMode
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
    hasActiveSessions,
    activeCourses,
    useCourseMode,
    hasEnrollments,
    studentProgramLabel: profile ? programLabel(profile.program) : null,
    studentLevel: profile?.level ?? null,
  };
}
