import { connectDB } from "@/lib/db";
import { jsonError, jsonOk, requireStaff } from "@/lib/api";
import { getTodayRosterForLecturer } from "@/lib/instructor-today";
import { parseTimezoneOffset } from "@/lib/attendance";
import { getDayKey } from "@/lib/day";

export async function GET(request: Request) {
  const auth = await requireStaff();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const timezoneOffset = parseTimezoneOffset(
    searchParams.get("timezoneOffset"),
  );

  await connectDB();

  try {
    const rosters = await getTodayRosterForLecturer(
      auth.id,
      auth.role === "admin",
      timezoneOffset,
    );
    return jsonOk({
      rosters,
      dayKey: getDayKey(new Date(), timezoneOffset),
    });
  } catch (err) {
    console.error("[instructor/today GET]", err);
    return jsonError("Could not load today's roster", 500);
  }
}
