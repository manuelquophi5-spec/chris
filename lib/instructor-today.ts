import { getDayKey } from "@/lib/day";
import { evaluateCourseSchedule } from "@/lib/schedule";
import { parseLevel, parseProgram } from "@/lib/academic";
import { Attendance, type IAttendance } from "@/models/Attendance";
import { Course } from "@/models/Course";
import { User } from "@/models/User";
import type { CourseTodayRoster } from "@/types";
import mongoose from "mongoose";

type EligibleStudent = {
  _id: mongoose.Types.ObjectId;
  name: string;
  employeeId?: string;
  email: string;
  program?: string;
  level?: number;
};

export async function getTodayRosterForLecturer(
  lecturerId: string,
  isAdmin: boolean,
  timezoneOffsetMinutes: number,
  courseIdFilter?: string,
): Promise<CourseTodayRoster[]> {
  const filter: Record<string, unknown> = { isActive: true };
  if (!isAdmin) {
    filter.lecturerId = lecturerId;
  }
  if (courseIdFilter) {
    filter._id = courseIdFilter;
  }

  const courses = await Course.find(filter).sort({ title: 1 }).lean();
  if (courses.length === 0) return [];

  const now = new Date();
  const dayKey = getDayKey(now, timezoneOffsetMinutes);

  // Batch eligible students by unique (program, level) pair instead of one query per course.
  const pairs = new Map<string, { program: string; level: number }>();
  for (const c of courses) {
    const program = parseProgram(c.program);
    const level = parseLevel(c.level);
    if (!program || level === null) continue;
    pairs.set(`${program}:${level}`, { program, level });
  }

  const studentsByPair = new Map<string, EligibleStudent[]>();
  for (const key of pairs.keys()) studentsByPair.set(key, []);
  if (pairs.size > 0) {
    const allStudents: EligibleStudent[] = await User.find({
      role: "user",
      $or: [...pairs.values()],
    })
      .select("name employeeId email program level")
      .sort({ name: 1 })
      .lean();
    for (const s of allStudents) {
      studentsByPair.get(`${s.program}:${s.level}`)?.push(s);
    }
  }

  // Batch today's marks for all rostered courses in one query instead of one per course.
  const allMarks: IAttendance[] = await Attendance.find({
    courseId: { $in: courses.map((c) => c._id) },
    dayKey,
  }).lean();
  const marksByCourse = new Map<string, IAttendance[]>();
  for (const m of allMarks) {
    const cid = String(m.courseId);
    const list = marksByCourse.get(cid);
    if (list) list.push(m);
    else marksByCourse.set(cid, [m]);
  }

  const rosters: CourseTodayRoster[] = [];

  for (const course of courses) {
    const program = parseProgram(course.program);
    const level = parseLevel(course.level);
    const students =
      program && level !== null
        ? studentsByPair.get(`${program}:${level}`) ?? []
        : [];

    const marks = marksByCourse.get(course._id.toString()) ?? [];

    const window = evaluateCourseSchedule(
      course.scheduleDays,
      course.startTime,
      course.endTime,
      course.lateAfterMinutes ?? 15,
      now,
      timezoneOffsetMinutes,
    );

    rosters.push({
      courseId: course._id.toString(),
      title: course.title,
      courseCode: (course.courseCode ?? "").trim(),
      isActiveNow: window.active,
      students: students
        .map((s) => {
          const uid = s._id.toString();
          const userMarks = marks.filter((m) => m.userId.toString() === uid);
          const checkIn = userMarks.find((m) => m.type === "check_in");
          const checkOut = userMarks.find((m) => m.type === "check_out");
          return {
            userId: uid,
            name: s.name,
            studentId: s.employeeId ?? "",
            checkedIn: Boolean(checkIn),
            checkedOut: Boolean(checkOut),
            checkInAt: checkIn?.markedAt.toISOString() ?? null,
            checkOutAt: checkOut?.markedAt.toISOString() ?? null,
            isLate: Boolean(checkIn?.isLate),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  return rosters;
}
