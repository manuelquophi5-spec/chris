import { connectDB } from "@/lib/db";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { Course } from "@/models/Course";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { getDayKey } from "@/lib/day";
import { evaluateCourseSchedule } from "@/lib/schedule";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof Response) return auth;

    await connectDB();

    const now = new Date();
    const tzOffset = new Date().getTimezoneOffset();

    const allCourses = await Course.find({ isActive: true }).lean();

    const active: Array<{
      id: string;
      title: string;
      courseCode: string;
      checkedIn: number;
      enrolled: number;
    }> = [];

    for (const c of allCourses) {
      const window = evaluateCourseSchedule(
        c.scheduleDays,
        c.startTime,
        c.endTime,
        c.lateAfterMinutes ?? 15,
        now,
        tzOffset,
      );

      if (!window.active) continue;

      const dayKey = getDayKey(now, tzOffset);
      const marks = await Attendance.find({
        courseId: c._id,
        dayKey,
        type: "check_in",
      }).lean();

      let enrolled = 0;
      if (c.program && c.level != null) {
        enrolled = await User.countDocuments({
          role: "user",
          program: c.program,
          level: c.level,
        });
      }

      active.push({
        id: c._id.toString(),
        title: c.title,
        courseCode: (c.courseCode ?? "").trim(),
        checkedIn: marks.length,
        enrolled,
      });
    }

    return jsonOk({ classes: active } as Record<string, unknown>);
  } catch (error) {
    console.error("[api/admin/courses/active-now]", error);
    return jsonError(
      error instanceof Error ? error.message : "Internal Server Error",
      500,
    );
  }
}
