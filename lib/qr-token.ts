import { SignJWT, jwtVerify } from "jose";
import { getSecretKey } from "@/lib/auth";
import type { AttendanceType } from "@/types";

/**
 * Long-lived on purpose: the QR is meant to be generated once per course and
 * printed/projected for the whole term. The actual per-meeting gate is the
 * course's schedule window (checked at scan time in markCourseAttendance),
 * not this expiry — and deactivating a course invalidates its QR immediately
 * since markCourseAttendance rejects inactive courses.
 */
const QR_TOKEN_EXPIRES = "400d";

export type QrTokenPayload = {
  courseId: string;
  type: AttendanceType;
};

export async function signQrToken(payload: QrTokenPayload): Promise<string> {
  return new SignJWT({
    purpose: "qr_checkin",
    courseId: payload.courseId,
    type: payload.type,
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
    if (
      payload.purpose !== "qr_checkin" ||
      typeof payload.courseId !== "string" ||
      (payload.type !== "check_in" && payload.type !== "check_out")
    ) {
      return null;
    }
    return { courseId: payload.courseId, type: payload.type };
  } catch {
    return null;
  }
}
