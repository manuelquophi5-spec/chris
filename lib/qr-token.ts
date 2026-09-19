import { SignJWT, jwtVerify } from "jose";
import { getSecretKey } from "@/lib/auth";

/**
 * Long-lived on purpose: the QR is meant to be generated once per course and
 * printed/projected for the whole term. The actual per-meeting gate is the
 * course's schedule window (checked at scan time in markCourseAttendance),
 * not this expiry — and deactivating a course invalidates its QR immediately
 * since markCourseAttendance rejects inactive courses.
 */
const QR_TOKEN_EXPIRES = "400d";

/**
 * One QR per course. Whether a scan means check-in or check-out is decided
 * server-side from the student's attendance for the day (see lib/qr-toggle.ts),
 * so the token carries only the course.
 */
export type QrTokenPayload = {
  courseId: string;
};

export async function signQrToken(payload: QrTokenPayload): Promise<string> {
  return new SignJWT({
    purpose: "qr_checkin",
    courseId: payload.courseId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(QR_TOKEN_EXPIRES)
    .sign(getSecretKey());
}

export async function verifyQrToken(
  token: string,
): Promise<QrTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.purpose !== "qr_checkin" || typeof payload.courseId !== "string") {
      return null;
    }
    // Codes printed before the single-QR change also carry a `type` claim;
    // it is ignored, so those old codes keep working as the combined QR.
    return { courseId: payload.courseId };
  } catch {
    return null;
  }
}
