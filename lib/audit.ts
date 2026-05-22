import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";

export type AuditAction =
  | "user.create"
  | "user.unlock"
  | "user.reset_password"
  | "location.create"
  | "location.update"
  | "location.deactivate"
  | "session.create"
  | "session.update"
  | "course.create"
  | "course.update"
  | "course.deactivate"
  | "course.enroll"
  | "course.unenroll";

export async function writeAudit(
  actorId: string,
  action: AuditAction,
  targetType: string,
  targetId: string,
  detail?: string,
) {
  try {
    await connectDB();
    await AuditLog.create({
      actorId,
      action,
      targetType,
      targetId,
      detail: detail?.slice(0, 500),
    });
  } catch (err) {
    console.error("[audit]", action, err);
  }
}
