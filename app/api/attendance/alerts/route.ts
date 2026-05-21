import { connectDB } from "@/lib/db";
import { getDayKey } from "@/lib/day";
import { requireAdmin } from "@/lib/api";
import { Attendance } from "@/models/Attendance";
import { User } from "@/models/User";
import type { AttendanceAlert } from "@/types";

/** Users missing check-in or check-out for today (workday alerts). */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const tz = Number(searchParams.get("timezoneOffset") ?? 0);
  const dayKey =
    searchParams.get("dayKey") ?? getDayKey(new Date(), tz);

  await connectDB();

  const users = await User.find({ role: "user" }).lean();
  const marks = await Attendance.find({
    dayKey,
    $or: [{ sessionId: null }, { sessionId: { $exists: false } }],
  })
    .populate("userId", "name employeeId")
    .lean();

  const byUser = new Map<
    string,
    { checkIn?: (typeof marks)[0]; checkOut?: (typeof marks)[0] }
  >();

  for (const m of marks) {
    const uid = String(m.userId);
    const cur = byUser.get(uid) ?? {};
    if (m.type === "check_in") cur.checkIn = m;
    if (m.type === "check_out") cur.checkOut = m;
    byUser.set(uid, cur);
  }

  const alerts: AttendanceAlert[] = [];

  for (const u of users) {
    const uid = u._id.toString();
    const status = byUser.get(uid);
    if (!status?.checkIn) {
      alerts.push({
        userId: uid,
        employeeId: u.employeeId ?? "",
        name: u.name,
        type: "missing_checkin",
        dayKey,
      });
    } else if (!status.checkOut) {
      alerts.push({
        userId: uid,
        employeeId: u.employeeId ?? "",
        name: u.name,
        type: "missing_checkout",
        dayKey,
        checkInAt: status.checkIn.markedAt.toISOString(),
      });
    }
  }

  return Response.json({ dayKey, alerts });
}
