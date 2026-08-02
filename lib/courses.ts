import { getDayKey } from "@/lib/day";
import {
  evaluateCourseSchedule,
  formatScheduleDaysLabel,
  getNextClassStartMessage,
} from "@/lib/schedule";
import {
  type AcademicProgramId,
  levelLabel,
  parseLevel,
  parseProgram,
  programLabel,
} from "@/lib/academic";
import { Attendance } from "@/models/Attendance";
import { Course, type ICourse } from "@/models/Course";
import { User } from "@/models/User";
import type {
  ActiveCourseSummary,
  CourseRow,
  CourseStatsSummary,
  StudentCourseAttendanceRow,
} from "@/types";
import mongoose from "mongoose";

type StudentProfile = {
  program: string;
  level: number;
};

export async function getStudentProgramLevel(
  userId: string,
): Promise<StudentProfile | null> {
  const user = await User.findById(userId).select("role program level").lean();
  if (!user || user.role !== "user") return null;
  const program = parseProgram(user.program);
  const level = parseLevel(user.level);
  if (!program || level === null) return null;
  return { program, level };
}

/** Students automatically assigned to this course by program + level. */
export async function getEligibleStudentsForCourse(course: {
  program?: string;
  level?: number;
}) {
  const program = parseProgram(course.program);
  const level = parseLevel(course.level);
  if (!program || level === null) return [];

  return User.find({ role: "user", program, level })
    .select("name employeeId email program level")
    .sort({ name: 1 })
    .lean();
}

export async function studentCanAccessCourse(
  userId: string,
  course: Pick<ICourse, "program" | "level" | "isActive">,
): Promise<boolean> {
  if (!course.isActive) return false;
  const profile = await getStudentProgramLevel(userId);
  if (!profile) return false;
  const program = parseProgram(course.program);
  const level = parseLevel(course.level);
  return (
    program === profile.program &&
    level === profile.level
  );
}

export async function getCourseIdsForStudent(userId: string): Promise<string[]> {
  const profile = await getStudentProgramLevel(userId);
  if (!profile) return [];

  const courses = await Course.find({
    isActive: true,
    program: profile.program,
    level: profile.level,
  })
    .select("_id")
    .lean();

  return courses.map((c) => c._id.toString());
}

export async function getActiveCoursesForStudent(
  userId: string,
  timezoneOffsetMinutes: number,
): Promise<ActiveCourseSummary[]> {
  const profile = await getStudentProgramLevel(userId);
  if (!profile) return [];

  const courses = await Course.find({
    isActive: true,
    program: profile.program,
    level: profile.level,
  })
    .populate("locationId", "name")
    .lean();

  const now = new Date();
  const dayKey = getDayKey(now, timezoneOffsetMinutes);

  const allMarks = await Attendance.find({
    userId,
    courseId: { $in: courses.map((c) => c._id) },
    dayKey,
  }).lean();
  const marksByCourse = new Map<string, typeof allMarks>();
  for (const m of allMarks) {
    const cid = String(m.courseId);
    const list = marksByCourse.get(cid);
    if (list) list.push(m);
    else marksByCourse.set(cid, [m]);
  }

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

    const marks = marksByCourse.get(c._id.toString()) ?? [];

    const hasCheckIn = marks.some((m) => m.type === "check_in");
    const hasCheckOut = marks.some((m) => m.type === "check_out");
    const loc = c.locationId as { name?: string } | mongoose.Types.ObjectId | null;

    const scheduleLabel = `${formatScheduleDaysLabel(c.scheduleDays)} · ${c.startTime}–${c.endTime}`;

    summaries.push({
      id: c._id.toString(),
      title: c.title,
      courseCode: (c.courseCode ?? "").trim(),
      description: c.description ?? "",
      scheduleLabel,
      nextClassHint: window.active
        ? null
        : getNextClassStartMessage(
            c.scheduleDays,
            c.startTime,
            now,
            timezoneOffsetMinutes,
          ),
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
      canCheckOut: hasCheckIn && !hasCheckOut,
      isLateNext: window.active && !hasCheckIn && window.isLate,
    });
  }

  return summaries.sort((a, b) => {
    if (a.window.active !== b.window.active) return a.window.active ? -1 : 1;
    if (a.canCheckOut !== b.canCheckOut) return a.canCheckOut ? -1 : 1;
    if (a.canCheckIn !== b.canCheckIn) return a.canCheckIn ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

/** True when student has program + level set (automatic course access). */
export async function studentHasCourseAccess(userId: string): Promise<boolean> {
  const profile = await getStudentProgramLevel(userId);
  return profile !== null;
}

/** Batches enrolled-count lookups into one aggregation instead of one query per course. */
async function countEligibleStudentsByProgramLevel(
  courses: Array<{ program?: string; level?: number }>,
): Promise<Map<string, number>> {
  const pairList: Array<{ program: AcademicProgramId; level: number }> = [];
  const seen = new Set<string>();
  for (const c of courses) {
    const program = parseProgram(c.program);
    const level = parseLevel(c.level);
    if (!program || level === null) continue;
    const key = `${program}:${level}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairList.push({ program, level });
  }
  if (pairList.length === 0) return new Map();

  const results = await User.aggregate<{
    _id: { program: string; level: number };
    count: number;
  }>([
    {
      $match: {
        role: "user",
        $or: pairList.map((p) => ({ program: p.program, level: p.level })),
      },
    },
    {
      $group: {
        _id: { program: "$program", level: "$level" },
        count: { $sum: 1 },
      },
    },
  ]);

  const map = new Map<string, number>();
  for (const r of results) {
    map.set(`${r._id.program}:${r._id.level}`, r.count);
  }
  return map;
}

export async function listCoursesForAdmin(
  lecturerFilter?: string,
  timezoneOffsetMinutes = 0,
): Promise<CourseRow[]> {
  const filter: Record<string, unknown> = {};
  if (lecturerFilter) {
    filter.lecturerId = new mongoose.Types.ObjectId(lecturerFilter);
  }

  const courses = await Course.find(filter)
    .sort({ program: 1, level: 1, title: 1 })
    .populate("lecturerId", "name email")
    .populate("locationId", "name")
    .lean();

  const now = new Date();
  const enrolledCounts = await countEligibleStudentsByProgramLevel(courses);

  const rows: CourseRow[] = [];
  for (const c of courses) {
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
      timezoneOffsetMinutes,
    );
    const program = parseProgram(c.program);
    const level = parseLevel(c.level);
    const enrolledCount =
      program && level !== null
        ? enrolledCounts.get(`${program}:${level}`) ?? 0
        : 0;
    rows.push({
      id: c._id.toString(),
      title: c.title,
      courseCode: (c.courseCode ?? "").trim(),
      program: c.program ?? "",
      programLabel: programLabel(c.program),
      level: c.level ?? 0,
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
      enrolledCount,
      isActiveNow: window.active,
      scheduleReason: window.reason,
    });
  }

  return rows;
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

  const students = await getEligibleStudentsForCourse(course);

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
      studentId: s.employeeId ?? "",
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
    programLabel: programLabel(course.program),
    levelLabel: levelLabel(course.level),
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
