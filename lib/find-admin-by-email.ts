import { normalizeEmail } from "@/lib/normalize-email";
import { User, type IUser } from "@/models/User";
import type { HydratedDocument } from "mongoose";

export async function findAdminByEmail(
  emailRaw: string,
): Promise<HydratedDocument<IUser> | null> {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;

  return User.findOne({ email, role: "admin" }).select("+passwordHash");
}
