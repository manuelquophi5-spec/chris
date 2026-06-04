import { getDayKey } from "@/lib/day";
import { evaluateCourseSchedule } from "@/lib/schedule";
import { Attendance } from "@/models/Attendance";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { User } from "@/models/User";
import type { CourseTodayRoster } from "@/types";

export async function getTodayRosterForLecturer(
  lecturerId: string,
  isAdmin: boolean,
  timezoneOffsetMinutes: number,
): Promise<CourseTodayRoster[]> {
  const filter: Record<string, unknown> = { isActive: true };
  if (!isAdmin) {
    filter.lecturerId = lecturerId;
  }

  const courses = await Course.find(filter).sort({ title: 1 }).lean();
  const now = new Date();
  const dayKey = getDayKey(now, timezoneOffsetMinutes);
  const rosters: CourseTodayRoster[] = [];

  for (const course of courses) {
    const enrollments = await Enrollment.find({ courseId: course._id }).lean();
    const studentIds = enrollments.map((e) => e.userId);
    const students = await User.find({
      _id: { $in: studentIds },
      role: "user",
    })
      .select("name employeeId")
      .lean();

    const marks = await Attendance.find({
      courseId: course._id,
      dayKey,
      userId: { $in: studentIds },
    }).lean();

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
