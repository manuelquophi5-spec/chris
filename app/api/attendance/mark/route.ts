import { connectDB } from "@/lib/db";
import { getDayKey } from "@/lib/day";
import {
  geofenceOutOfRangeMessage,
} from "@/lib/geofence-messages";
import { validateGpsAccuracy } from "@/lib/gps-validation";
import { checkImplausibleMovement } from "@/lib/gps-spoofing";
import { isWithinGeofence } from "@/lib/haversine";
import {
  getTodayRecordsForUser,
  parseAttendanceType,
  parseTimezoneOffset,
  toAttendanceSummary,
} from "@/lib/attendance";
import { markCourseAttendance } from "@/lib/course-mark";
import { findSessionById } from "@/lib/sessions";
import { pickAutoSite, rankSitesByDistance } from "@/lib/site-picker";
import {
  getAuthUser,
  jsonError,
  jsonOk,
  parseCoordinates,
} from "@/lib/api";
import { Attendance } from "@/models/Attendance";
import { Location } from "@/models/Location";
/**
 * Mark check-in or check-out (daily or per active session).
 * POST { latitude, longitude, locationId?, type, timezoneOffset?, sessionId?, accuracy? }
 */
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await request.json();
    const coords = parseCoordinates(body.latitude, body.longitude);
    let locationId = String(body.locationId ?? "").trim();
    const courseIdRaw = String(body.courseId ?? "").trim();
    const sessionIdRaw = String(body.sessionId ?? "").trim();
    const type = parseAttendanceType(body.type);
    const timezoneOffset = parseTimezoneOffset(body.timezoneOffset);

    if (!coords) {
      return jsonError("Valid latitude and longitude are required");
    }
    if (!type) {
      return jsonError("type must be check_in or check_out");
    }

    const gps = validateGpsAccuracy(body.accuracy);
    if (!gps.ok) return jsonError(gps.message, 400);

    await connectDB();

    if (courseIdRaw) {
      const result = await markCourseAttendance({
        userId: user.id,
        courseId: courseIdRaw,
        type,
        coords,
        timezoneOffset,
        gpsAccuracy: gps.accuracy,
        locationIdOverride: locationId || undefined,
      });
      if ("error" in result) {
        return jsonError(
          result.error ?? "Failed to mark attendance",
          result.status ?? 400,
        );
      }
      return jsonOk({
        attendance: {
          ...result.summary,
          locationId: result.summary.locationId,
          withinGeofence: true,
        },
        message: result.message,
      });
    }

    const sessionDoc = sessionIdRaw
      ? await findSessionById(sessionIdRaw)
      : null;
    if (sessionIdRaw && !sessionDoc) {
      return jsonError("Session not found or not active right now", 404);
    }

    const useSession = Boolean(sessionDoc);
    const dayKey = getDayKey(new Date(), timezoneOffset);

    if (useSession && sessionDoc) {
      const sessionLocId = String(sessionDoc.locationId);
      const location = await Location.findOne({
        _id: sessionLocId,
        isActive: true,
      });
      if (!location) {
        return jsonError("Session campus not found or inactive", 404);
      }
      locationId = location._id.toString();

      const existing = await Attendance.find({
        userId: user.id,
        sessionId: sessionDoc._id,
      }).lean();

      const hasIn = existing.some((r) => r.type === "check_in");
      const hasOut = existing.some((r) => r.type === "check_out");

      if (type === "check_in") {
        if (hasIn) {
          return jsonError("You already checked in for this session.", 409);
        }
      } else {
        if (!hasIn) {
          return jsonError("Check in to this session first.", 400);
        }
        if (hasOut) {
          return jsonError("You already checked out of this session.", 409);
        }
      }

      const { within, distanceMeters } = isWithinGeofence(
        coords.latitude,
        coords.longitude,
        location.latitude,
        location.longitude,
        location.radiusMeters,
      );

      if (!within) {
        return jsonError(
          geofenceOutOfRangeMessage(
            distanceMeters,
            location.radiusMeters,
            location.name,
          ),
          403,
        );
      }

      const sessionMarkedAt = new Date();
      const sessionMovement = await checkImplausibleMovement(
        user.id,
        coords.latitude,
        coords.longitude,
        sessionMarkedAt,
      );
      if (!sessionMovement.ok) {
        return jsonError(sessionMovement.message, 403);
      }

      const record = await Attendance.create({
        userId: user.id,
        locationId: location._id,
        sessionId: sessionDoc._id,
        type,
        dayKey,
        latitude: coords.latitude,
        longitude: coords.longitude,
        distanceMeters,
        gpsAccuracy: gps.accuracy,
        withinGeofence: true,
        markedAt: sessionMarkedAt,
      });

      const summary = toAttendanceSummary(
        record,
        location.name,
        sessionDoc.title,
      );

      return jsonOk({
        attendance: {
          ...summary,
          locationId: location._id.toString(),
          withinGeofence: true,
        },
        message:
          type === "check_in"
            ? `Checked in: ${sessionDoc.title}`
            : `Checked out: ${sessionDoc.title}`,
      });
    }

    // Daily mode
    if (!locationId) {
      const sites = await Location.find({ isActive: true }).lean();
      const ranked = rankSitesByDistance(
        sites.map((s) => ({
          id: s._id.toString(),
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          radiusMeters: s.radiusMeters,
        })),
        coords.latitude,
        coords.longitude,
      );
      const auto = pickAutoSite(ranked);
      if (auto) locationId = auto.id;
      else {
        return jsonError("Select a campus — none was detected automatically.");
      }
    }

    const today = await getTodayRecordsForUser(user.id, timezoneOffset);

    if (type === "check_in") {
      if (today.checkIn) {
        return jsonError(
          "You already checked in today. Only one check-in per day is allowed.",
          409,
        );
      }
    } else {
      if (!today.checkIn) {
        return jsonError("Check in first before checking out.", 400);
      }
      if (today.checkOut) {
        return jsonError(
          "You already checked out today. Only one check-out per day is allowed.",
          409,
        );
      }
      if (locationId !== today.checkIn.locationId) {
        return jsonError(
          "Check out must be at the same campus you checked in to.",
          400,
        );
      }
    }

    const location = await Location.findOne({
      _id: locationId,
      isActive: true,
    });

    if (!location) {
      return jsonError("Campus not found or inactive", 404);
    }

    const { within, distanceMeters } = isWithinGeofence(
      coords.latitude,
      coords.longitude,
      location.latitude,
      location.longitude,
      location.radiusMeters,
    );

    if (!within) {
      return jsonError(
        geofenceOutOfRangeMessage(
          distanceMeters,
          location.radiusMeters,
          location.name,
        ),
        403,
      );
    }

    const dailyMarkedAt = new Date();
    const dailyMovement = await checkImplausibleMovement(
      user.id,
      coords.latitude,
      coords.longitude,
      dailyMarkedAt,
    );
    if (!dailyMovement.ok) {
      return jsonError(dailyMovement.message, 403);
    }

    const record = await Attendance.create({
      userId: user.id,
      locationId: location._id,
      type,
      dayKey,
      latitude: coords.latitude,
      longitude: coords.longitude,
      distanceMeters,
      gpsAccuracy: gps.accuracy,
      withinGeofence: true,
      markedAt: dailyMarkedAt,
    });

    const summary = toAttendanceSummary(record, location.name);

    return jsonOk({
      attendance: {
        ...summary,
        locationId: location._id.toString(),
        withinGeofence: true,
      },
      message:
        type === "check_in"
          ? `Checked in at ${location.name}`
          : `Checked out from ${location.name}`,
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === 11000
    ) {
      return jsonError("Attendance already recorded.", 409);
    }
    console.error("[attendance/mark]", err);
    return jsonError("Failed to mark attendance", 500);
  }
}
