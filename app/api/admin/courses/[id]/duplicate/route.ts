import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { parseTimezoneOffset } from "@/lib/attendance";
import { listCoursesForAdmin } from "@/lib/courses";
import { Course } from "@/models/Course";
import mongoose from "mongoose";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid course id", 400);
  }

  const { searchParams } = new URL(request.url);
  const timezoneOffset = parseTimezoneOffset(searchParams.get("timezoneOffset"));

  await connectDB();
  const source = await Course.findById(id);
  if (!source) return jsonError("Course not found", 404);

  const baseCode = (source.courseCode ?? "").trim();
  const copy = await Course.create({
    title: `${source.title} (copy)`,
    courseCode: baseCode ? `${baseCode}-COPY` : "",
    program: source.program,
    level: source.level,
    description: source.description,
    locationId: source.locationId,
    scheduleDays: [...source.scheduleDays],
    startTime: source.startTime,
    endTime: source.endTime,
    lateAfterMinutes: source.lateAfterMinutes,
    isActive: true,
    createdBy: auth.id,
  });

  await writeAudit(
    auth.id,
    "course.duplicate",
    "course",
    copy._id.toString(),
    copy.title,
  );

  const courses = await listCoursesForAdmin(timezoneOffset);
  const row = courses.find((c) => c.id === copy._id.toString());

  return jsonOk(
    {
      course: row,
      message: `Duplicated as ${copy.title}. Students with matching program and level will see it automatically.`,
    },
    201,
  );
}
