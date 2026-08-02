import { connectDB } from "@/lib/db";
import { jsonError, jsonOk, requireStaff } from "@/lib/api";
import { parseTimezoneOffset } from "@/lib/attendance";
import { getCourseStats, listCoursesForAdmin } from "@/lib/courses";

export async function GET(request: Request) {
  const auth = await requireStaff();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const timezoneOffset = parseTimezoneOffset(searchParams.get("timezoneOffset"));

  await connectDB();

  const all = await listCoursesForAdmin(
    auth.role === "instructor" ? auth.id : undefined,
    timezoneOffset,
  );

  const courses = auth.role === "admin" ? all : all.filter((c) => c.lecturerId === auth.id);

  const summaries = await Promise.all(
    courses.slice(0, 20).map(async (c) => {
      try {
        const stats = await getCourseStats(c.id);
        return {
          course: c,
          enrolledCount: stats.enrolledCount,
          averageAttendance:
            stats.students.length > 0
              ? Math.round(
                  stats.students.reduce((s, r) => s + r.attendancePercent, 0) /
                    stats.students.length,
                )
              : 0,
        };
      } catch {
        return { course: c, enrolledCount: c.enrolledCount, averageAttendance: 0 };
      }
    }),
  );

  return jsonOk({
    lecturerName: auth.name,
    courses: summaries,
  });
}
