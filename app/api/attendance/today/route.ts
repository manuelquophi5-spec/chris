import { connectDB } from "@/lib/db";
import { buildTodayStatus, parseTimezoneOffset } from "@/lib/attendance";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api";

/** Today's check-in / check-out status for the signed-in user. */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const timezoneOffset = parseTimezoneOffset(
      searchParams.get("timezoneOffset") ?? 0,
    );

    await connectDB();
    const status = await buildTodayStatus(user.id, timezoneOffset);

    return jsonOk(status);
  } catch (error) {
    console.error("[api/attendance/today] GET error:", error);
    return jsonError(
      error instanceof Error ? error.message : "Internal Server Error",
      500,
    );
  }
}
