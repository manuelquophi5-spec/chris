import { haversineDistanceMeters } from "@/lib/haversine";
import { MAX_GPS_SPEED_MPS } from "@/lib/constants";
import { Attendance } from "@/models/Attendance";

/**
 * Compares this mark's position against the user's most recent mark (any
 * location/type). An implied speed above MAX_GPS_SPEED_MPS means the two
 * fixes are too far apart for the elapsed time — spoofed or badly wrong GPS.
 */
export async function checkImplausibleMovement(
  userId: string,
  latitude: number,
  longitude: number,
  now: Date,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const last = await Attendance.findOne({ userId })
    .sort({ markedAt: -1 })
    .select("latitude longitude markedAt")
    .lean();

  if (!last) return { ok: true };

  const elapsedSeconds = (now.getTime() - last.markedAt.getTime()) / 1000;
  if (elapsedSeconds <= 0) return { ok: true };

  const distanceMeters = haversineDistanceMeters(
    last.latitude,
    last.longitude,
    latitude,
    longitude,
  );
  const speedMps = distanceMeters / elapsedSeconds;

  if (speedMps > MAX_GPS_SPEED_MPS) {
    return {
      ok: false,
      message:
        "Your location doesn't match your last check-in — GPS looks off. Move outdoors, wait a moment, and try again.",
    };
  }
  return { ok: true };
}
