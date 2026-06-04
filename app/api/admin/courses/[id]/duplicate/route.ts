import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { listCoursesForAdmin } from "@/lib/courses";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import mongoose from "mongoose";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid course id", 400);
  }

  let includeEnrollments = true;
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body === "object" && "includeEnrollments" in body) {
      includeEnrollments = Boolean(body.includeEnrollments);
    }
  } catch {
    /* default true */
  }

  await connectDB();
  const source = await Course.findById(id);
  if (!source) return jsonError("Course not found", 404);

  const baseCode = (source.courseCode ?? "").trim();
  const copy = await Course.create({
    title: `${source.title} (copy)`,
    courseCode: baseCode ? `${baseCode}-COPY` : "",
    description: source.description,
    lecturerId: source.lecturerId,
    locationId: source.locationId,
    scheduleDays: [...source.scheduleDays],
    startTime: source.startTime,
    endTime: source.endTime,
    lateAfterMinutes: source.lateAfterMinutes,
    isActive: true,
    createdBy: auth.id,
  });

  let enrolledCount = 0;
  if (includeEnrollments) {
    const enrollments = await Enrollment.find({ courseId: source._id }).lean();
    if (enrollments.length > 0) {
      await Enrollment.insertMany(
        enrollments.map((e) => ({
          userId: e.userId,
          courseId: copy._id,
        })),
      );
      enrolledCount = enrollments.length;
    }
  }

  await writeAudit(
    auth.id,
    "course.duplicate",
    "course",
    copy._id.toString(),
    `${copy.title}${enrolledCount ? ` (+${enrolledCount} students)` : ""}`,
  );

  const courses = await listCoursesForAdmin();
  const row = courses.find((c) => c.id === copy._id.toString());

  return jsonOk(
    {
      course: row,
      message: `Duplicated as ${copy.title}${enrolledCount ? ` with ${enrolledCount} students` : ""}`,
    },
    201,
  );
}
