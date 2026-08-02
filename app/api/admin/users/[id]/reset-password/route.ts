import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { clearLoginFailures } from "@/lib/account-lock";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import {
  generateSetupCode,
  hashSetupCode,
  setupCodeExpiry,
} from "@/lib/setup-code";
import { User } from "@/models/User";

type RouteContext = { params: Promise<{ id: string }> };

/** Clears password so the employee can use Set password again, with a fresh setup code. */
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

  const setupCode = generateSetupCode();
  await User.updateOne(
    { _id: doc._id },
    {
      $unset: { passwordHash: "" },
      $set: {
        passwordMustChange: true,
        setupCodeHash: await hashSetupCode(setupCode),
        setupCodeExpiresAt: setupCodeExpiry(),
      },
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
    setupCode,
    message: `Give ${doc.name} their Student ID (${doc.employeeId ?? "see students list"}) and this new setup code to create a password.`,
  });
}
