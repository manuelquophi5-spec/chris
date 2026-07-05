import { connectDB } from "@/lib/db";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api";
import { Attendance } from "@/models/Attendance";
import { Course } from "@/models/Course";
import { getStudentProgramLevel } from "@/lib/courses";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return jsonError("Unauthorized", 401);

    await connectDB();

    const profile = await getStudentProgramLevel(user.id);
    if (!profile) return jsonOk({ stats: null } as Record<string, unknown>);

    const courses = await Course.find({
      isActive: true,
      program: profile.program,
      level: profile.level,
    }).lean();

    const courseIds = courses.map((c) => c._id);

    // All attendance records for this student across all courses
    const allRecords = await Attendance.find({
      userId: user.id,
      courseId: { $in: courseIds },
    }).lean();

    // Overall stats
    const totalCheckIns = allRecords.filter((r) => r.type === "check_in").length;
    const totalLate = allRecords.filter((r) => r.isLate).length;
    const uniqueDays = new Set(allRecords.map((r) => r.dayKey)).size;

    // Per-course stats
    const perCourse = courses.map((c) => {
      const cid = c._id.toString();
      const courseRecords = allRecords.filter(
        (r) => String(r.courseId) === cid,
      );
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

    // Recent streak (consecutive weekdays with check-ins)
    const sortedDays = [...new Set(allRecords
      .filter((r) => r.type === "check_in")
      .map((r) => r.dayKey))]
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

      // Skip weekends
      const dow = new Date(`${key}T12:00:00`).getDay();
      if (dow === 0 || dow === 6) continue;

      if (sortedDays.includes(key)) {
        streak++;
      } else if (key !== localToday) {
        break;
      }
    }

    return jsonOk({
      stats: {
        totalCheckIns,
        totalLate,
        uniqueDays,
        streak,
        perCourse,
      },
    } as Record<string, unknown>);
  } catch (error) {
    console.error("[api/attendance/stats]", error);
    return jsonError(
      error instanceof Error ? error.message : "Internal Server Error",
      500,
    );
  }
}
