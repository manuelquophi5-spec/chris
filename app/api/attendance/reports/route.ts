import { connectDB } from "@/lib/db";
import { jsonError, jsonOk, requireStaff } from "@/lib/api";
import { canLecturerAccessCourse, getCourseStats } from "@/lib/courses";
import { Attendance } from "@/models/Attendance";
import { Course } from "@/models/Course";
import { User } from "@/models/User";
import mongoose from "mongoose";

/** Staff: search/filter attendance by course and student. */
export async function GET(request: Request) {
  const auth = await requireStaff();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId")?.trim() ?? "";
  const userId = searchParams.get("userId")?.trim() ?? "";
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const from = searchParams.get("from")?.trim() || undefined;
  const to = searchParams.get("to")?.trim() || undefined;
  const format = searchParams.get("format")?.trim() ?? "json";

  await connectDB();

  if (courseId && format === "stats") {
    const allowed = await canLecturerAccessCourse(
      auth.id,
      courseId,
      auth.role === "admin",
    );
    if (!allowed) return jsonError("Forbidden", 403);
    try {
      const stats = await getCourseStats(courseId, from, to);
      return jsonOk({ stats });
    } catch {
      return jsonError("Course not found", 404);
    }
  }

  const courseFilter: Record<string, unknown> = { isActive: true };
  if (auth.role === "instructor") {
    courseFilter.lecturerId = auth.id;
  }
  const staffCourses = await Course.find(courseFilter).select("_id title").lean();
  const allowedCourseIds = staffCourses.map((c) => c._id);

  const query: Record<string, unknown> = {
    courseId: { $in: allowedCourseIds },
  };
  if (courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return jsonError("Invalid course id", 400);
    }
    const allowed = await canLecturerAccessCourse(
      auth.id,
      courseId,
      auth.role === "admin",
    );
    if (!allowed) return jsonError("Forbidden", 403);
    query.courseId = new mongoose.Types.ObjectId(courseId);
  }
  if (userId) query.userId = userId;
  if (from || to) {
    const day: Record<string, string> = {};
    if (from) day.$gte = from;
    if (to) day.$lte = to;
    query.dayKey = day;
  }

  const records = await Attendance.find(query)
    .sort({ markedAt: -1 })
    .limit(500)
    .populate("userId", "name employeeId")
    .populate("courseId", "title")
    .populate("locationId", "name")
    .lean();

  let rows = records.map((r) => {
    const u = r.userId as { name?: string; employeeId?: string };
    const c = r.courseId as { title?: string };
    const loc = r.locationId as { name?: string };
    return {
      id: r._id.toString(),
      userId: typeof u === "object" && u && "_id" in u ? String(u._id) : String(r.userId),
      studentName: typeof u === "object" && u && "name" in u ? String(u.name) : "—",
      employeeId:
        typeof u === "object" && u && "employeeId" in u ? String(u.employeeId ?? "") : "",
      courseId: String(r.courseId),
      courseTitle:
        typeof c === "object" && c && "title" in c ? String(c.title) : "—",
      type: r.type,
      dayKey: r.dayKey,
      markedAt: r.markedAt.toISOString(),
      isLate: Boolean(r.isLate),
      locationName:
        typeof loc === "object" && loc && "name" in loc ? String(loc.name) : "—",
    };
  });

  if (q) {
    rows = rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.employeeId.toLowerCase().includes(q) ||
        r.courseTitle.toLowerCase().includes(q),
    );
  }

  const courses = staffCourses.map((c) => ({
    id: c._id.toString(),
    title: c.title,
  }));

  return jsonOk({ records: rows, courses });
}
