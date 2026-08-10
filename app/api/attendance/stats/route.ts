import { connectDB } from "@/lib/db";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api";
import { getUserAttendanceStats } from "@/lib/attendance";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return jsonError("Unauthorized", 401);

    await connectDB();
    const stats = await getUserAttendanceStats(user.id);

    return jsonOk({ stats } as Record<string, unknown>);
  } catch (error) {
    console.error("[api/attendance/stats]", error);
    return jsonError(
      error instanceof Error ? error.message : "Internal Server Error",
      500,
    );
  }
}
