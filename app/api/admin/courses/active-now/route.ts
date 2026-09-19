import { connectDB } from "@/lib/db";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { parseTimezoneOffset } from "@/lib/attendance";
import { getActiveClassesNow } from "@/lib/courses";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(request.url);
    const tzOffset = parseTimezoneOffset(searchParams.get("timezoneOffset"));

    await connectDB();
    const classes = await getActiveClassesNow(tzOffset);

    return jsonOk({ classes } as Record<string, unknown>);
  } catch (error) {
    console.error("[api/admin/courses/active-now]", error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
