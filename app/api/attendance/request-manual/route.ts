import { connectDB } from "@/lib/db";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { AuditLog } from "@/models/AuditLog";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return jsonError("Unauthorized", 401);

    const limited = await checkRateLimit(`request-manual:${user.id}`, 5, 60 * 60 * 1000);
    if (!limited.allowed) {
      return jsonError(
        "You've sent several requests already. An administrator will get to them — try again later.",
        429,
      );
    }

    const body = await request.json();
    const reason = String(body.reason ?? "GPS not available").trim().slice(0, 300);

    await connectDB();

    await AuditLog.create({
      actorId: user.id,
      action: "manual_checkin_request",
      targetType: "attendance",
      targetId: user.id,
      detail: `Student ${user.name} (${user.studentId}) requested manual check-in. Reason: ${reason || "GPS failure"}`,
    });

    return jsonOk({
      message: "Your request has been sent. An administrator will review it and may mark your attendance manually.",
    } as Record<string, unknown>);
  } catch (error) {
    console.error("[api/attendance/request-manual]", error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
