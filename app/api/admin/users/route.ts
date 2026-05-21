import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { toSessionUser } from "@/lib/session-user";
import {
  internalEmailFromEmployeeId,
  isValidEmployeeId,
  normalizeEmployeeId,
} from "@/lib/user-account";
import { User } from "@/models/User";
import type { AdminUserRow, UserRole } from "@/types";

function parseRole(value: unknown): UserRole {
  const r = String(value ?? "user");
  if (r === "admin" || r === "instructor" || r === "user") return r;
  return "user";
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  await connectDB();
  const docs = await User.find({ role: { $ne: "admin" } })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const users: AdminUserRow[] = docs.map((d) => ({
    id: d._id.toString(),
    employeeId: d.employeeId ?? "",
    name: d.name,
    role: d.role,
    passwordMustChange: Boolean(d.passwordMustChange),
    lockedUntil: d.lockedUntil?.toISOString() ?? null,
    failedLoginAttempts: d.failedLoginAttempts ?? 0,
    createdAt: d.createdAt.toISOString(),
  }));

  return jsonOk({ users });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const firstName = String(body.firstName ?? body.name ?? "").trim();
    const employeeId = normalizeEmployeeId(String(body.employeeId ?? ""));
    const role = parseRole(body.role);

    if (!firstName || firstName.length < 2) {
      return jsonError("First name is required");
    }
    if (!isValidEmployeeId(employeeId)) {
      return jsonError(
        "Employee ID must be 3–32 characters (letters, numbers, dash, underscore)",
      );
    }
    if (role === "admin") {
      return jsonError("Create staff or users only — not another admin here.");
    }

    await connectDB();
    const existing = await User.findOne({ employeeId });
    if (existing) {
      return jsonError("Employee ID already exists", 409);
    }

    const email = internalEmailFromEmployeeId(employeeId);
    const doc = await User.create({
      employeeId,
      email,
      name: firstName,
      role,
      passwordMustChange: true,
      // No password yet — staff sets it via /set-password
    });

    await writeAudit(
      auth.id,
      "user.create",
      "user",
      doc._id.toString(),
      `${role}:${employeeId}`,
    );

    return jsonOk(
      {
        user: {
          ...toSessionUser(doc),
          passwordMustChange: true,
        },
        message: `Account created. ${firstName} can set a password with ID ${employeeId}.`,
      },
      201,
    );
  } catch (err) {
    console.error("[admin/users POST]", err);
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      err.name === "ValidationError" &&
      "errors" in err
    ) {
      const first = Object.values(
        err.errors as Record<string, { message?: string }>,
      )[0];
      return jsonError(first?.message ?? "Invalid user data", 400);
    }
    return jsonError("Could not add this person. Restart the dev server and try again.", 500);
  }
}
