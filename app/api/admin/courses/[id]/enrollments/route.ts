import { connectDB } from "@/lib/db";
import { jsonError, jsonOk, requireStaff } from "@/lib/api";
import { getEligibleStudentsForCourse } from "@/lib/courses";
import { levelLabel, programLabel } from "@/lib/academic";
import { Course } from "@/models/Course";
import mongoose from "mongoose";

type RouteContext = { params: Promise<{ id: string }> };

/** Students automatically assigned by program + level (no manual enrollment). */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireStaff();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid course id", 400);
  }

  await connectDB();
  const course = await Course.findById(id).lean();
  if (!course) return jsonError("Course not found", 404);

  if (auth.role === "instructor" && course.lecturerId.toString() !== auth.id) {
    return jsonError("Forbidden", 403);
  }

  const students = await getEligibleStudentsForCourse(course);

  return jsonOk({
    autoAssigned: true,
    program: course.program,
    programLabel: programLabel(course.program),
    level: course.level,
    levelLabel: levelLabel(course.level),
    students: students.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      studentId: s.employeeId ?? "",
      email: s.email,
      program: s.program,
      level: s.level,
    })),
  });
}

export async function POST() {
  return jsonError(
    "Manual enrollment is disabled. Students are assigned automatically by program and level.",
    410,
  );
}

export async function DELETE() {
  return jsonError(
    "Manual unenrollment is disabled. Change a student's program or level instead.",
    410,
  );
}
