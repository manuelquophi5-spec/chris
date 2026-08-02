import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { jsonError, jsonOk, requireStaff } from "@/lib/api";
import { AttendanceSession } from "@/models/AttendanceSession";
import { Location } from "@/models/Location";
import mongoose from "mongoose";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaff();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid session id", 400);
  }

  try {
    const body = await request.json();
    await connectDB();
    const session = await AttendanceSession.findById(id);
    if (!session) return jsonError("Session not found", 404);

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return jsonError("Title cannot be empty");
      session.title = title;
    }
    if (body.courseCode !== undefined) {
      session.courseCode = String(body.courseCode).trim() || undefined;
    }
    if (body.locationId !== undefined) {
      const locId = String(body.locationId).trim();
      if (!mongoose.Types.ObjectId.isValid(locId)) {
        return jsonError("Valid location is required");
      }
      const location = await Location.findOne({ _id: locId, isActive: true });
      if (!location) return jsonError("Location not found or inactive", 404);
      session.locationId = location._id;
    }
    if (body.startAt !== undefined) {
      const d = new Date(String(body.startAt));
      if (Number.isNaN(d.getTime())) return jsonError("Invalid start time");
      session.startAt = d;
    }
    if (body.endAt !== undefined) {
      const d = new Date(String(body.endAt));
      if (Number.isNaN(d.getTime())) return jsonError("Invalid end time");
      session.endAt = d;
    }
    if (session.endAt <= session.startAt) {
      return jsonError("End time must be after start time");
    }

    await session.save();
    await writeAudit(auth.id, "session.update", "session", id, session.title);

    return jsonOk({
      session: {
        id: session._id.toString(),
        title: session.title,
        courseCode: session.courseCode,
        locationId: session.locationId.toString(),
        startAt: session.startAt.toISOString(),
        endAt: session.endAt.toISOString(),
      },
      message: "Session updated",
    });
  } catch (err) {
    console.error("[admin/sessions PATCH]", err);
    return jsonError("Could not update session", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireStaff();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid session id", 400);
  }

  await connectDB();
  const session = await AttendanceSession.findByIdAndDelete(id);
  if (!session) return jsonError("Session not found", 404);

  await writeAudit(auth.id, "session.cancel", "session", id, session.title);

  return jsonOk({ ok: true, message: `Cancelled ${session.title}` });
}
