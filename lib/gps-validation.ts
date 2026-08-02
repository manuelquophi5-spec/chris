import { MAX_GPS_ACCURACY_METERS } from "@/lib/constants";

export function validateGpsAccuracy(
  accuracy: unknown,
): { ok: true; accuracy: number | null } | { ok: false; message: string } {
  if (accuracy === undefined || accuracy === null || accuracy === "") {
    return { ok: true, accuracy: null };
  }
  const n = Number(accuracy);
  if (!Number.isFinite(n) || n < 0) {
    return {
      ok: false,
      message: "Invalid GPS accuracy reading. Try again outdoors.",
    };
  }
  if (n > MAX_GPS_ACCURACY_METERS) {
    return {
      ok: false,
      message: `Location is too inaccurate (~${Math.round(n)} m). Turn on precise location (GPS), move outdoors, and try again.`,
    };
  }
  return { ok: true, accuracy: n };
}
