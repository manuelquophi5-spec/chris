import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { clearLoginFailures } from "@/lib/account-lock";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { User } from "@/models/User";
import mongoose from "mongoose";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid user id", 400);
  }

  await connectDB();
  const doc = await User.findById(id);
  if (!doc) return jsonError("User not found", 404);

  await clearLoginFailures(doc);
  await writeAudit(auth.id, "user.unlock", "user", id, doc.employeeId);

  return jsonOk({ ok: true, message: `Unlocked ${doc.name}` });
}
