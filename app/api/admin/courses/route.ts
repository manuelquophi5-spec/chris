import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { parseLevel, parseProgram } from "@/lib/academic";
import { listCoursesForAdmin } from "@/lib/courses";
import { parseTimezoneOffset } from "@/lib/attendance";
import { parseTimeToMinutes } from "@/lib/schedule";
import { Course } from "@/models/Course";
import { User } from "@/models/User";
import { Location } from "@/models/Location";
import mongoose from "mongoose";

function parseScheduleDays(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const days = value.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6);
  if (days.length === 0) return null;
  return [...new Set(days)];
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const timezoneOffset = parseTimezoneOffset(searchParams.get("timezoneOffset"));

  await connectDB();
  const courses = await listCoursesForAdmin(undefined, timezoneOffset);
  return jsonOk({ courses });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const courseCode = String(body.courseCode ?? "").trim().toUpperCase();
    const description = String(body.description ?? "").trim();
    const lecturerId = String(body.lecturerId ?? "").trim();
    const locationId = String(body.locationId ?? "").trim() || null;
    const startTime = String(body.startTime ?? "").trim();
    const endTime = String(body.endTime ?? "").trim();
    const scheduleDays = parseScheduleDays(body.scheduleDays);
    const lateAfterMinutes = Math.min(
      120,
      Math.max(0, Number(body.lateAfterMinutes ?? 15)),
    );
    const timezoneOffset = parseTimezoneOffset(body.timezoneOffset);

    const program = parseProgram(body.program);
    const level = parseLevel(body.level);

    if (!title) return jsonError("Course title is required");
    if (!program) return jsonError("Select a program for this class");
    if (level === null) return jsonError("Select an academic level (100–400)");
    if (!mongoose.Types.ObjectId.isValid(lecturerId)) {
      return jsonError("Select a lecturer");
    }
    if (!scheduleDays) return jsonError("Select at least one class day");
    if (parseTimeToMinutes(startTime) === null) {
      return jsonError("Start time must be HH:mm (e.g. 15:00)");
    }
    if (parseTimeToMinutes(endTime) === null) {
      return jsonError("End time must be HH:mm (e.g. 17:00)");
    }
    if (parseTimeToMinutes(endTime)! <= parseTimeToMinutes(startTime)!) {
      return jsonError("End time must be after start time");
    }

    await connectDB();
    const lecturer = await User.findOne({
      _id: lecturerId,
      role: { $in: ["instructor", "admin"] },
    });
    if (!lecturer) return jsonError("Lecturer not found", 404);

    if (locationId) {
      const loc = await Location.findOne({ _id: locationId, isActive: true });
      if (!loc) return jsonError("Location not found or inactive", 404);
    }

    const course = await Course.create({
      title,
      courseCode,
      program,
      level,
      description,
      lecturerId: lecturer._id,
      locationId: locationId ? new mongoose.Types.ObjectId(locationId) : null,
      scheduleDays,
      startTime,
      endTime,
      lateAfterMinutes,
      isActive: true,
      createdBy: auth.id,
    });

    await writeAudit(auth.id, "course.create", "course", course._id.toString(), title);

    const courses = await listCoursesForAdmin(undefined, timezoneOffset);
    const row = courses.find((c) => c.id === course._id.toString());

    return jsonOk({ course: row, message: `Created ${title}` }, 201);
  } catch (err) {
    console.error("[admin/courses POST]", err);
    return jsonError("Could not create class", 500);
  }
}
