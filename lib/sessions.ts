import { Attendance } from "@/models/Attendance";
import { AttendanceSession } from "@/models/AttendanceSession";
import type { ActiveSessionSummary } from "@/types";
import mongoose from "mongoose";

type PopulatedLocation = { name?: string };

export function isSessionActive(
  startAt: Date,
  endAt: Date,
  now = new Date(),
): boolean {
  return now >= startAt && now <= endAt;
}

export async function getActiveSessions(now = new Date()) {
  return AttendanceSession.find({
    startAt: { $lte: now },
    endAt: { $gte: now },
  })
    .sort({ startAt: 1 })
    .populate("locationId", "name")
    .lean();
}

export async function getActiveSessionsForUser(
  userId: string,
  now = new Date(),
): Promise<ActiveSessionSummary[]> {
  const sessions = await getActiveSessions(now);
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s._id);
  const marks = await Attendance.find({
    userId,
    sessionId: { $in: sessionIds },
  }).lean();

  const bySession = new Map<string, { in: boolean; out: boolean }>();
  for (const m of marks) {
    const sid = String(m.sessionId);
    const cur = bySession.get(sid) ?? { in: false, out: false };
    if (m.type === "check_in") cur.in = true;
    if (m.type === "check_out") cur.out = true;
    bySession.set(sid, cur);
  }

  return sessions.map((s) => {
    const loc = s.locationId as PopulatedLocation | mongoose.Types.ObjectId;
    const locName =
      loc && typeof loc === "object" && "name" in loc
        ? String(loc.name)
        : "Site";
    const locId =
      loc && typeof loc === "object" && "_id" in loc
        ? String(loc._id)
        : String(loc);

    const status = bySession.get(String(s._id)) ?? { in: false, out: false };
    return {
      id: s._id.toString(),
      title: s.title,
      courseCode: s.courseCode,
      locationId: locId,
      locationName: locName,
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      hasCheckIn: status.in,
      hasCheckOut: status.out,
    };
  });
}

export async function findSessionById(sessionId: string) {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) return null;
  const session = await AttendanceSession.findById(sessionId)
    .populate("locationId", "name latitude longitude radiusMeters isActive")
    .lean();
  if (!session) return null;
  if (!isSessionActive(session.startAt, session.endAt)) return null;
  return session;
}
