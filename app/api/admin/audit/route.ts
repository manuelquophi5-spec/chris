import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/api";
import { AuditLog } from "@/models/AuditLog";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  await connectDB();
  const logs = await AuditLog.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("actorId", "name employeeId")
    .lean();

  return Response.json({
    logs: logs.map((l) => {
      const actor = l.actorId as {
        name?: string;
        employeeId?: string;
      } | null;
      return {
        id: l._id.toString(),
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        detail: l.detail,
        actorName: actor?.name ?? "Unknown",
        actorEmployeeId: actor?.employeeId ?? "",
        createdAt: l.createdAt.toISOString(),
      };
    }),
  });
}
