import { getDayKey } from "@/lib/day";
import { evaluateCourseSchedule } from "@/lib/schedule";
import { getEligibleStudentsForCourse } from "@/lib/courses";
import { Attendance } from "@/models/Attendance";
import { Course } from "@/models/Course";
import type { CourseTodayRoster } from "@/types";

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
  const now = new Date();
  const dayKey = getDayKey(now, timezoneOffsetMinutes);
  const rosters: CourseTodayRoster[] = [];

  for (const course of courses) {
    const students = await getEligibleStudentsForCourse(course);
    const studentIds = students.map((s) => s._id);

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
