import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { User } from "@/models/User";
import mongoose from "mongoose";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid course id", 400);
  }

  await connectDB();
  const enrollments = await Enrollment.find({ courseId: id }).lean();
  const userIds = enrollments.map((e) => e.userId);
  const students = await User.find({ _id: { $in: userIds }, role: "user" })
    .select("name employeeId email")
    .sort({ name: 1 })
    .lean();

  return jsonOk({
    students: students.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      employeeId: s.employeeId ?? "",
      email: s.email,
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { id: courseId } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return jsonError("Invalid course id", 400);
  }

  try {
    const body = await request.json();
    const userIds = Array.isArray(body.userIds)
      ? body.userIds.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];

    if (userIds.length === 0) {
      return jsonError("Select at least one student");
    }

    await connectDB();
    const course = await Course.findById(courseId);
    if (!course) return jsonError("Course not found", 404);

    const students = await User.find({
      _id: { $in: userIds },
      role: "user",
    }).select("_id");

    let added = 0;
    for (const s of students) {
      try {
        await Enrollment.create({ courseId: course._id, userId: s._id });
        added++;
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          err.code !== 11000
        ) {
          throw err;
        }
      }
    }

    await writeAudit(
      auth.id,
      "course.enroll",
      "course",
      courseId,
      `+${added} students`,
    );

    return jsonOk({
      added,
      message: `Added ${added} student(s) to ${course.title}`,
    });
  } catch (err) {
    console.error("[enrollments POST]", err);
    return jsonError("Could not enroll students", 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { id: courseId } = await context.params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim() ?? "";

  if (!mongoose.Types.ObjectId.isValid(courseId) || !userId) {
    return jsonError("courseId and userId required", 400);
  }

  await connectDB();
  await Enrollment.deleteOne({ courseId, userId });
  await writeAudit(auth.id, "course.unenroll", "course", courseId, userId);

  return jsonOk({ ok: true, message: "Student removed from class" });
}
