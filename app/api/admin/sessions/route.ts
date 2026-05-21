import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { jsonError, jsonOk, requireStaff } from "@/lib/api";
import { AttendanceSession } from "@/models/AttendanceSession";
import { Location } from "@/models/Location";
import mongoose from "mongoose";

export async function GET() {
  const auth = await requireStaff();
  if (auth instanceof Response) return auth;

  await connectDB();
  const now = new Date();
  const sessions = await AttendanceSession.find()
    .sort({ startAt: -1 })
    .limit(100)
    .populate("locationId", "name")
    .lean();

  return jsonOk({
    sessions: sessions.map((s) => {
      const loc = s.locationId as { name?: string } | mongoose.Types.ObjectId;
      return {
        id: s._id.toString(),
        title: s.title,
        courseCode: s.courseCode,
        locationId:
          typeof loc === "object" && loc && "_id" in loc
            ? String(loc._id)
            : String(loc),
        locationName:
          typeof loc === "object" && loc && "name" in loc
            ? String(loc.name)
            : "",
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
        isActive: now >= s.startAt && now <= s.endAt,
        createdAt: s.createdAt.toISOString(),
      };
    }),
  });
}

export async function POST(request: Request) {
  const auth = await requireStaff();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const courseCode = String(body.courseCode ?? "").trim() || undefined;
    const locationId = String(body.locationId ?? "").trim();
    const startAt = new Date(String(body.startAt ?? ""));
    const endAt = new Date(String(body.endAt ?? ""));

    if (!title) return jsonError("Session title is required");
    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return jsonError("Valid location is required");
    }
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return jsonError("Valid start and end times are required");
    }
    if (endAt <= startAt) {
      return jsonError("End time must be after start time");
    }

    await connectDB();
    const location = await Location.findOne({
      _id: locationId,
      isActive: true,
    });
    if (!location) return jsonError("Location not found or inactive", 404);

    const session = await AttendanceSession.create({
      title,
      courseCode,
      locationId: location._id,
      startAt,
      endAt,
      createdBy: auth.id,
    });

    await writeAudit(
      auth.id,
      "session.create",
      "session",
      session._id.toString(),
      title,
    );

    return jsonOk(
      {
        session: {
          id: session._id.toString(),
          title: session.title,
          courseCode: session.courseCode,
          locationId: location._id.toString(),
          startAt: session.startAt.toISOString(),
          endAt: session.endAt.toISOString(),
        },
      },
      201,
    );
  } catch (err) {
    console.error("[admin/sessions POST]", err);
    return jsonError("Could not create session", 500);
  }
}
