import type { AttendanceType } from "@/types";

/**
 * A single class QR both checks in and checks out. To stop an accidental
 * double-scan at the door from instantly checking the student back out (and
 * then locking them out of a second check-out), a check-out via QR is only
 * accepted this long after the check-in.
 */
export const QR_MIN_MINUTES_BEFORE_CHECKOUT = 5;

export type QrActionInput = {
  hasIn: boolean;
  hasOut: boolean;
  /** When today's check-in was recorded (required when hasIn is true). */
  checkInAt: Date | null;
  now: Date;
};

export type QrActionResult =
  | { ok: true; type: AttendanceType }
  | { ok: false; error: string; status: 409 };

/**
 * Decide what scanning the class QR means for this student right now:
 * no check-in yet → check in; checked in → check out; both done → nothing left.
 */
export function resolveQrAction(input: QrActionInput): QrActionResult {
  const { hasIn, hasOut, checkInAt, now } = input;

  if (!hasIn) return { ok: true, type: "check_in" };

  if (hasOut) {
    return {
      ok: false,
      error: "You've already checked in and out of this class today.",
      status: 409,
    };
  }

  if (checkInAt) {
    const waitMs =
      QR_MIN_MINUTES_BEFORE_CHECKOUT * 60_000 - (now.getTime() - checkInAt.getTime());
    if (waitMs > 0) {
      const mins = Math.ceil(waitMs / 60_000);
      return {
        ok: false,
        error: `You checked in a moment ago. Scan again in ${mins} minute${mins === 1 ? "" : "s"} to check out.`,
        status: 409,
      };
    }
  }

  return { ok: true, type: "check_out" };
}
