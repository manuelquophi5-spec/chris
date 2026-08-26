import { connectDB } from "@/lib/db";
import { getAuthUser, jsonError, jsonOk, parseCoordinates } from "@/lib/api";
import { parseTimezoneOffset } from "@/lib/attendance";
import { validateGpsAccuracy } from "@/lib/gps-validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyQrToken } from "@/lib/qr-token";
import { markCourseAttendance } from "@/lib/course-mark";
import { writeAudit } from "@/lib/audit";

const SCAN_RATE_LIMIT_MAX = 20;
const SCAN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Mark check-in/check-out from a scanned class QR code.
 * POST { token, latitude, longitude, accuracy?, timezoneOffset? }
 *
 * The token only carries "which class" — one QR covers both check-in and
 * check-out, with direction auto-detected from the student's existing
 * records for the day (see markCourseAttendance). Location proof always
 * comes fresh from the scanning device's own GPS, verified by the same
 * geofence + anti-spoofing pipeline as manual check-in. Scanning the code
 * alone never checks anyone in.
 */
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return jsonError("Unauthorized", 401);

  try {
    const body = await request.json();
    const token = String(body.token ?? "").trim();
    const coords = parseCoordinates(body.latitude, body.longitude);
    const timezoneOffset = parseTimezoneOffset(body.timezoneOffset);

    if (!token) return jsonError("Missing QR code");
    if (!coords) {
      return jsonError("Valid latitude and longitude are required");
    }

    const gps = validateGpsAccuracy(body.accuracy);
    if (!gps.ok) return jsonError(gps.message, 400);

    const ip = getClientIp(request);
    const rate = await checkRateLimit(
      `qr-scan:${user.id}:${ip}`,
      SCAN_RATE_LIMIT_MAX,
      SCAN_RATE_LIMIT_WINDOW_MS,
    );
    if (!rate.allowed) {
      return jsonError(
        `Too many scan attempts. Try again in ${rate.retryAfterSec}s.`,
        429,
      );
    }

    await connectDB();

    const decoded = await verifyQrToken(token);
    if (!decoded) {
      return jsonError(
        "This QR code is invalid or expired. Ask your admin for a fresh one.",
        400,
      );
    }

    const result = await markCourseAttendance({
      userId: user.id,
      courseId: decoded.courseId,
      coords,
      timezoneOffset,
      gpsAccuracy: gps.accuracy,
      checkInMethod: "qr",
    });

    if ("error" in result) {
      if (result.status === 403) {
        await writeAudit(
          user.id,
          "attendance.qr_scan_rejected",
          "course",
          decoded.courseId,
          result.error,
        );
      }
      return jsonError(result.error ?? "Could not check in", result.status ?? 400);
    }

    return jsonOk({
      attendance: {
        ...result.summary,
        locationId: result.summary.locationId,
        withinGeofence: true,
      },
      message: result.message,
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
    console.error("[attendance/scan]", err);
    return jsonError("Failed to check in", 500);
  }
}
