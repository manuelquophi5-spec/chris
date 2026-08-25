import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { parseLevel, parseProgram } from "@/lib/academic";
import { parseTimeToMinutes } from "@/lib/schedule";
import { Course } from "@/models/Course";
import { Location } from "@/models/Location";
import mongoose from "mongoose";

type RouteContext = { params: Promise<{ id: string }> };

function parseScheduleDays(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const days = value.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6);
  if (days.length === 0) return null;
  return [...new Set(days)];
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid course id", 400);
  }

  try {
    const body = await request.json();
    await connectDB();
    const course = await Course.findById(id);
    if (!course) return jsonError("Course not found", 404);

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return jsonError("Title cannot be empty");
      course.title = title;
    }
    if (body.description !== undefined) {
      course.description = String(body.description).trim();
    }
    if (body.courseCode !== undefined) {
      course.courseCode = String(body.courseCode).trim().toUpperCase();
    }
    if (body.program !== undefined) {
      const program = parseProgram(body.program);
      if (!program) return jsonError("Select a valid program");
      course.program = program;
    }
    if (body.level !== undefined) {
      const level = parseLevel(body.level);
      if (level === null) return jsonError("Select a valid level (100–400)");
      course.level = level;
    }
    if (body.locationId !== undefined) {
      const locId = String(body.locationId).trim();
      if (!locId) {
        course.locationId = null;
      } else {
        const loc = await Location.findOne({ _id: locId, isActive: true });
        if (!loc) return jsonError("Location not found", 404);
        course.locationId = loc._id;
      }
    }
    if (body.scheduleDays !== undefined) {
      const days = parseScheduleDays(body.scheduleDays);
      if (!days) return jsonError("Select at least one class day");
      course.scheduleDays = days;
    }
    if (body.startTime !== undefined) {
      const t = String(body.startTime).trim();
      if (parseTimeToMinutes(t) === null) return jsonError("Invalid start time");
      course.startTime = t;
    }
    if (body.endTime !== undefined) {
      const t = String(body.endTime).trim();
      if (parseTimeToMinutes(t) === null) return jsonError("Invalid end time");
      course.endTime = t;
    }
    if (body.lateAfterMinutes !== undefined) {
      course.lateAfterMinutes = Math.min(
        120,
        Math.max(0, Number(body.lateAfterMinutes)),
      );
    }
    if (body.isActive !== undefined) {
      course.isActive = Boolean(body.isActive);
    }

    if (
      parseTimeToMinutes(course.endTime)! <= parseTimeToMinutes(course.startTime)!
    ) {
      return jsonError("End time must be after start time");
    }

    await course.save();
    await writeAudit(auth.id, "course.update", "course", id, course.title);

    return jsonOk({ ok: true, message: "Class updated" });
  } catch (err) {
    console.error("[admin/courses PATCH]", err);
    return jsonError("Could not update class", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid course id", 400);
  }

  await connectDB();
  const course = await Course.findById(id);
  if (!course) return jsonError("Course not found", 404);

  course.isActive = false;
  await course.save();
  await writeAudit(auth.id, "course.deactivate", "course", id, course.title);

  return jsonOk({ ok: true, message: "Class archived (hidden from students)" });
}
