import { campusTimezoneOffsetMinutes } from "@/lib/campus-time";
import { getDayKey } from "@/lib/day";
import { programLabel } from "@/lib/academic";
import {
  getActiveCoursesForStudent,
  getStudentProgramLevel,
} from "@/lib/courses";
import { getActiveSessionsForUser } from "@/lib/sessions";
import { Attendance } from "@/models/Attendance";
import { Course } from "@/models/Course";
import type {
  AttendanceRecordSummary,
  AttendanceType,
  TodayAttendanceStatus,
  UserAttendanceStats,
} from "@/types";
import mongoose from "mongoose";

export function parseAttendanceType(value: unknown): AttendanceType | null {
  if (value === "check_in" || value === "check_out") return value;
  return null;
}

/**
 * Kept with its old signature so callers don't change, but the client-supplied
 * value is deliberately ignored: campus time is decided by the server
 * (see lib/campus-time.ts), so a forged timezone can't move a class window.
 */
export function parseTimezoneOffset(_clientValue?: unknown): number {
  return campusTimezoneOffsetMinutes();
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

/** Day-scoped count, not capped by a records fetch — accurate past 100 marks/day. */
export async function getTodayMarksCount(
  timezoneOffsetMinutes: number,
): Promise<number> {
  const dayKey = getDayKey(new Date(), timezoneOffsetMinutes);
  return Attendance.countDocuments({ dayKey });
}

export async function getUserAttendanceStats(
  userId: string,
): Promise<UserAttendanceStats | null> {
  const profile = await getStudentProgramLevel(userId);
  if (!profile) return null;

  const courses = await Course.find({
    isActive: true,
    program: profile.program,
    level: profile.level,
  }).lean();

  const courseIds = courses.map((c) => c._id);

  const allRecords = await Attendance.find({
    userId,
    courseId: { $in: courseIds },
  }).lean();

  const totalCheckIns = allRecords.filter((r) => r.type === "check_in").length;
  const totalLate = allRecords.filter((r) => r.isLate).length;
  const uniqueDays = new Set(allRecords.map((r) => r.dayKey)).size;

  const perCourse = courses.map((c) => {
    const cid = c._id.toString();
    const courseRecords = allRecords.filter((r) => String(r.courseId) === cid);
    const checkIns = courseRecords.filter((r) => r.type === "check_in").length;
    const lates = courseRecords.filter((r) => r.isLate).length;
    const days = new Set(courseRecords.map((r) => r.dayKey)).size;

    return {
      id: cid,
      title: c.title,
      courseCode: (c.courseCode ?? "").trim(),
      checkIns,
      lates,
      days,
      attendanceRate:
        days > 0 ? Math.round(((days - lates) / Math.max(days, 1)) * 100) : 0,
    };
  });

  const sortedDays = [
    ...new Set(
      allRecords.filter((r) => r.type === "check_in").map((r) => r.dayKey),
    ),
  ]
    .sort()
    .reverse();

  let streak = 0;
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = new Date(d.getTime() - offset * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const dow = new Date(`${key}T12:00:00`).getDay();
    if (dow === 0 || dow === 6) continue;

    if (sortedDays.includes(key)) {
      streak++;
    } else if (key !== localToday) {
      break;
    }
  }

  return { totalCheckIns, totalLate, uniqueDays, streak, perCourse };
}
