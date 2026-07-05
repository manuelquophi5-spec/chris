import { connectDB } from "@/lib/db";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api";
import { AuditLog } from "@/models/AuditLog";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return jsonError("Unauthorized", 401);

    const body = await request.json();
    const reason = String(body.reason ?? "GPS not available").trim();

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
    return jsonError(
      error instanceof Error ? error.message : "Internal Server Error",
      500,
    );
  }
}
