import { connectDB } from "@/lib/db";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { getTodayMarksCount, parseTimezoneOffset } from "@/lib/attendance";

/** Day-scoped mark count for the signed-in admin's browser timezone. */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const tzOffset = parseTimezoneOffset(searchParams.get("timezoneOffset"));

    await connectDB();
    const todayMarks = await getTodayMarksCount(tzOffset);

    return jsonOk({ todayMarks } as Record<string, unknown>);
  } catch (error) {
    console.error("[api/admin/attendance/today-count]", error);
    return jsonError(
      error instanceof Error ? error.message : "Internal Server Error",
      500,
    );
  }
}
