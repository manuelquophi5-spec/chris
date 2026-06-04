import type { IUser } from "@/models/User";
import type { SessionUser } from "@/types";
import { normalizeEmployeeId } from "@/lib/user-account";

export function toSessionUser(doc: IUser): SessionUser {
  const studentId =
    doc.employeeId ||
    normalizeEmployeeId(doc.email.split("@")[0] ?? "USER");
  return {
    id: doc._id.toString(),
    studentId,
    email: doc.email,
    name: doc.name,
    role: doc.role,
  };
}
