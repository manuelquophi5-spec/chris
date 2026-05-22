import { evaluateCourseSchedule } from "@/lib/schedule";
import { Attendance } from "@/models/Attendance";
import { Course, type ICourse } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { User } from "@/models/User";
import type {
  ActiveCourseSummary,
  CourseRow,
  CourseStatsSummary,
  StudentCourseAttendanceRow,
} from "@/types";
import mongoose from "mongoose";

export async function getEnrolledCourseIds(userId: string): Promise<string[]> {
  const rows = await Enrollment.find({ userId }).select("courseId").lean();
  return rows.map((r) => r.courseId.toString());
}

export async function getActiveCoursesForStudent(
  userId: string,
  timezoneOffsetMinutes: number,
): Promise<ActiveCourseSummary[]> {
  const enrollments = await Enrollment.find({ userId }).lean();
  if (enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => e.courseId);
  const courses = await Course.find({
    _id: { $in: courseIds },
    isActive: true,
  })
    .populate("locationId", "name")
    .lean();

  const now = new Date();
  const summaries: ActiveCourseSummary[] = [];

  for (const c of courses) {
    const window = evaluateCourseSchedule(
      c.scheduleDays,
      c.startTime,
      c.endTime,
      c.lateAfterMinutes ?? 15,
      now,
      timezoneOffsetMinutes,
    );

    const dayKey = window.active
      ? (await import("@/lib/day")).getDayKey(now, timezoneOffsetMinutes)
      : "";

    const marks = dayKey
      ? await Attendance.find({
          userId,
          courseId: c._id,
          dayKey,
        }).lean()
      : [];

    const hasCheckIn = marks.some((m) => m.type === "check_in");
    const hasCheckOut = marks.some((m) => m.type === "check_out");
    const loc = c.locationId as { name?: string } | mongoose.Types.ObjectId | null;

    summaries.push({
      id: c._id.toString(),
      title: c.title,
      description: c.description ?? "",
      lecturerId: c.lecturerId.toString(),
      locationId:
        loc && typeof loc === "object" && "_id" in loc
          ? String(loc._id)
          : c.locationId
            ? String(c.locationId)
            : null,
      locationName:
        loc && typeof loc === "object" && "name" in loc ? String(loc.name) : null,
      startTime: c.startTime,
      endTime: c.endTime,
      scheduleDays: c.scheduleDays,
      window,
      hasCheckIn,
      hasCheckOut,
      canCheckIn: window.active && !hasCheckIn,
      canCheckOut: window.active && hasCheckIn && !hasCheckOut,
      isLateNext: window.active && !hasCheckIn && window.isLate,
    });
  }

  return summaries.sort((a, b) => {
    if (a.window.active !== b.window.active) return a.window.active ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export async function studentHasCourseEnrollments(userId: string): Promise<boolean> {
  const n = await Enrollment.countDocuments({ userId });
  return n > 0;
}

export async function listCoursesForAdmin(
  lecturerFilter?: string,
): Promise<CourseRow[]> {
  const filter: Record<string, unknown> = {};
  if (lecturerFilter) {
    filter.lecturerId = new mongoose.Types.ObjectId(lecturerFilter);
  }

  const courses = await Course.find(filter)
    .sort({ title: 1 })
    .populate("lecturerId", "name email")
    .populate("locationId", "name")
    .lean();

  const counts = await Enrollment.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
    { $group: { _id: "$courseId", n: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.n]));

  const now = new Date();
  const offset = new Date().getTimezoneOffset();

  return courses.map((c) => {
    const lecturerPop = c.lecturerId as
      | { _id?: mongoose.Types.ObjectId; name?: string; email?: string }
      | mongoose.Types.ObjectId;
    const locationPop = c.locationId as { name?: string } | null;
    const lecturerId =
      typeof lecturerPop === "object" && lecturerPop && "_id" in lecturerPop
        ? String(lecturerPop._id)
        : String(c.lecturerId);
    const lecturerName =
      typeof lecturerPop === "object" && lecturerPop && "name" in lecturerPop
        ? String(lecturerPop.name)
        : "—";
    const window = evaluateCourseSchedule(
      c.scheduleDays,
      c.startTime,
      c.endTime,
      c.lateAfterMinutes ?? 15,
      now,
      offset,
    );
    return {
      id: c._id.toString(),
      title: c.title,
      description: c.description ?? "",
      lecturerId,
      lecturerName,
      locationId: c.locationId ? String(c.locationId) : null,
      locationName:
        locationPop && typeof locationPop === "object" && "name" in locationPop
          ? String(locationPop.name)
          : null,
      scheduleDays: c.scheduleDays,
      startTime: c.startTime,
      endTime: c.endTime,
      lateAfterMinutes: c.lateAfterMinutes ?? 15,
      isActive: c.isActive,
      enrolledCount: countMap.get(c._id.toString()) ?? 0,
      isActiveNow: window.active,
      scheduleReason: window.reason,
    };
  });
}

export async function getCourseStats(
  courseId: string,
  fromDayKey?: string,
  toDayKey?: string,
): Promise<CourseStatsSummary> {
  const course = await Course.findById(courseId)
    .populate("lecturerId", "name")
    .lean();
  if (!course) throw new Error("Course not found");

  const enrollments = await Enrollment.find({ courseId: course._id }).lean();
  const studentIds = enrollments.map((e) => e.userId);
  const students = await User.find({ _id: { $in: studentIds }, role: "user" })
    .select("name employeeId email")
    .lean();

  const dayFilter: Record<string, string> = {};
  if (fromDayKey) dayFilter.$gte = fromDayKey;
  if (toDayKey) dayFilter.$lte = toDayKey;

  const attendanceQuery: Record<string, unknown> = {
    courseId: course._id,
    type: "check_in",
  };
  if (Object.keys(dayFilter).length) attendanceQuery.dayKey = dayFilter;

  const checkIns = await Attendance.find(attendanceQuery).lean();
  const expectedSessions = estimateExpectedSessions(
    course.scheduleDays,
    fromDayKey,
    toDayKey,
  );

  const rows: StudentCourseAttendanceRow[] = students.map((s) => {
    const uid = s._id.toString();
    let attended = 0;
    let late = 0;
    for (const rec of checkIns) {
      if (rec.userId.toString() !== uid) continue;
      attended++;
      if (rec.isLate) late++;
    }
    const missed = Math.max(0, expectedSessions - attended);
    const pct =
      expectedSessions > 0
        ? Math.round((attended / expectedSessions) * 100)
        : attended > 0
          ? 100
          : 0;
    return {
      userId: uid,
      name: s.name,
      employeeId: s.employeeId ?? "",
      attendedSessions: attended,
      missedSessions: missed,
      lateSessions: late,
      attendancePercent: pct,
    };
  });

  const lecturer = course.lecturerId as { name?: string };
  return {
    courseId: course._id.toString(),
    title: course.title,
    lecturerName:
      lecturer && typeof lecturer === "object" && "name" in lecturer
        ? String(lecturer.name)
        : "—",
    enrolledCount: students.length,
    expectedSessions,
    students: rows.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** Rough count of scheduled class days in range (for % denominator). */
function estimateExpectedSessions(
  scheduleDays: number[],
  fromDayKey?: string,
  toDayKey?: string,
): number {
  const from = fromDayKey ?? getDefaultRangeStart();
  const to = toDayKey ?? getDefaultRangeEnd();
  let count = 0;
  const start = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (scheduleDays.includes(d.getUTCDay())) count++;
  }
  return Math.max(count, 1);
}

function getDefaultRangeEnd(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultRangeStart(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 27);
  return d.toISOString().slice(0, 10);
}

export async function canLecturerAccessCourse(
  lecturerId: string,
  courseId: string,
  isAdmin: boolean,
): Promise<boolean> {
  if (isAdmin) return true;
  const c = await Course.findById(courseId).select("lecturerId").lean();
  return Boolean(c && c.lecturerId.toString() === lecturerId);
}
