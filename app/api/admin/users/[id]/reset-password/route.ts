import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { clearLoginFailures } from "@/lib/account-lock";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { User } from "@/models/User";

type RouteContext = { params: Promise<{ id: string }> };

/** Clears password so the employee can use Set password again. */
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
  if (doc.role === "admin") {
    return jsonError("Cannot reset an admin password here.", 400);
  }

  await User.updateOne(
    { _id: doc._id },
    {
      $unset: { passwordHash: "" },
      $set: { passwordMustChange: true },
    },
  );
  await clearLoginFailures(doc);

  await writeAudit(
    auth.id,
    "user.reset_password",
    "user",
    id,
    doc.employeeId ?? doc.email,
  );

  return jsonOk({
    ok: true,
    message: `${doc.name} must open Set password and choose a new password (ID: ${doc.employeeId ?? "see students list"}).`,
  });
}
