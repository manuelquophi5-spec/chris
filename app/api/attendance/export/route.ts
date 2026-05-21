import { connectDB } from "@/lib/db";
import { getDayKey } from "@/lib/day";
import { requireAdmin } from "@/lib/api";
import { Attendance } from "@/models/Attendance";

function csvEscape(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** CSV export for payroll / admin review. */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const tz = Number(searchParams.get("timezoneOffset") ?? 0);

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (from && to) {
    filter.dayKey = { $gte: from, $lte: to };
  } else {
    const dayKey = getDayKey(new Date(), tz);
    filter.dayKey = dayKey;
  }

  const rows = await Attendance.find(filter)
    .sort({ dayKey: -1, markedAt: -1 })
    .populate("userId", "name employeeId")
    .populate("locationId", "name")
    .populate("sessionId", "title courseCode")
    .limit(5000)
    .lean();

  const header = [
    "day",
    "employee_id",
    "name",
    "type",
    "time",
    "site",
    "session",
    "distance_m",
    "gps_accuracy_m",
    "within_geofence",
  ].join(",");

  const lines = rows.map((r) => {
    const u = r.userId as { name?: string; employeeId?: string } | null;
    const loc = r.locationId as { name?: string } | null;
    const sess = r.sessionId as { title?: string; courseCode?: string } | null;
    const sessionLabel = sess
      ? `${sess.title ?? ""}${sess.courseCode ? ` (${sess.courseCode})` : ""}`
      : "";
    return [
      r.dayKey,
      u?.employeeId ?? "",
      u?.name ?? "",
      r.type,
      r.markedAt.toISOString(),
      loc?.name ?? "",
      sessionLabel,
      Math.round(r.distanceMeters),
      r.gpsAccuracy != null ? Math.round(r.gpsAccuracy) : "",
      r.withinGeofence ? "yes" : "no",
    ]
      .map(csvEscape)
      .join(",");
  });

  const csv = [header, ...lines].join("\n");
  const filename = `ella-attendance-${from ?? "today"}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
