import { connectDB } from "@/lib/db";
import { getDayKey } from "@/lib/day";
import { parseAttendanceType, parseTimezoneOffset } from "@/lib/attendance";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { Attendance } from "@/models/Attendance";
import { User } from "@/models/User";
import { Location } from "@/models/Location";
import mongoose from "mongoose";

/**
 * Admin override: manually mark check-in/out for a specific student.
 * POST { userId, locationId, type, timezoneOffset? }
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const userId = String(body.userId ?? "").trim();
    const locationId = String(body.locationId ?? "").trim();
    const type = parseAttendanceType(body.type);
    const timezoneOffset = parseTimezoneOffset(body.timezoneOffset);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return jsonError("Invalid user ID");
    }
    if (!type) {
      return jsonError("type must be check_in or check_out");
    }
    if (!locationId || !mongoose.Types.ObjectId.isValid(locationId)) {
      return jsonError("A valid campus is required");
    }

    await connectDB();

    const student = await User.findOne({ _id: userId, role: "user" });
    if (!student) {
      return jsonError("Student not found", 404);
    }

    const location = await Location.findOne({ _id: locationId, isActive: true });
    if (!location) {
      return jsonError("Campus not found or inactive", 404);
    }

    const dayKey = getDayKey(new Date(), timezoneOffset);

    if (type === "check_in") {
      const existing = await Attendance.findOne({
        userId,
        dayKey,
        type: "check_in",
        $or: [{ sessionId: null }, { sessionId: { $exists: false } }],
      });
      if (existing) {
        return jsonError("Student already checked in today.", 409);
      }
    } else {
      const existingCheckIn = await Attendance.findOne({
        userId,
        dayKey,
        type: "check_in",
        $or: [{ sessionId: null }, { sessionId: { $exists: false } }],
      });
      if (!existingCheckIn) {
        return jsonError("Student must check in first.", 400);
      }
      const existingCheckOut = await Attendance.findOne({
        userId,
        dayKey,
        type: "check_out",
        $or: [{ sessionId: null }, { sessionId: { $exists: false } }],
      });
      if (existingCheckOut) {
        return jsonError("Student already checked out today.", 409);
      }
    }

    const record = await Attendance.create({
      userId: student._id,
      locationId: location._id,
      type,
      dayKey,
      latitude: location.latitude,
      longitude: location.longitude,
      distanceMeters: 0,
      gpsAccuracy: null,
      withinGeofence: true,
      isLate: false,
      markedAt: new Date(),
      // Flag to indicate manual override
      isManual: true,
    });

    return jsonOk({
      message: `Manually marked ${type === "check_in" ? "check-in" : "check-out"} for ${student.name} at ${location.name}.`,
      record: {
        id: record._id.toString(),
        type: record.type,
        dayKey: record.dayKey,
        markedAt: record.markedAt.toISOString(),
      },
    } as Record<string, unknown>);
  } catch (error) {
    console.error("[api/attendance/manual]", error);
    return jsonError(
      error instanceof Error ? error.message : "Internal Server Error",
      500,
    );
  }
}
