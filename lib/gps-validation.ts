import {
  MAX_GPS_ACCURACY_METERS,
  MAX_PHOTO_CHARS,
} from "@/lib/constants";

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

export function validatePhotoData(
  photoData: unknown,
): { ok: true; photo: string | null } | { ok: false; message: string } {
  if (photoData === undefined || photoData === null || photoData === "") {
    return { ok: true, photo: null };
  }
  const raw = String(photoData);
  if (!raw.startsWith("data:image/")) {
    return { ok: false, message: "Photo must be a JPEG or PNG image" };
  }
  if (raw.length > MAX_PHOTO_CHARS) {
    return { ok: false, message: "Photo is too large. Use a smaller image." };
  }
  return { ok: true, photo: raw };
}
