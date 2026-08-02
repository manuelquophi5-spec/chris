import {
  internalEmailFromEmployeeId,
  normalizeEmployeeId,
} from "@/lib/user-account";
import { User, type IUser } from "@/models/User";
import type { HydratedDocument } from "mongoose";

export async function findUserByEmployeeIdForAuth(
  employeeIdRaw: string,
): Promise<HydratedDocument<IUser> | null> {
  const employeeId = normalizeEmployeeId(employeeIdRaw);
  if (!employeeId) return null;

  return User.findOne({
    $or: [
      { employeeId },
      { email: employeeId.toLowerCase() },
      { email: internalEmailFromEmployeeId(employeeId) },
    ],
  }).select("+passwordHash +setupCodeHash");
}
