import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { toSessionUser } from "@/lib/session-user";
import {
  internalEmailFromEmployeeId,
  isValidEmployeeId,
  normalizeEmployeeId,
} from "@/lib/user-account";
import { parseLevel, parseProgram } from "@/lib/academic";
import {
  generateSetupCode,
  hashSetupCode,
  setupCodeExpiry,
} from "@/lib/setup-code";
import { User } from "@/models/User";
import type { AdminUserRow, UserRole } from "@/types";

function parseRole(value: unknown): UserRole {
  const r = String(value ?? "user");
  if (r === "admin" || r === "user") return r;
  return "user";
}

const PAGE_SIZE_DEFAULT = 100;
const PAGE_SIZE_MAX = 200;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const role = searchParams.get("role")?.trim() ?? "";
  const passwordMustChange = searchParams.get("passwordMustChange");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number(searchParams.get("limit") ?? PAGE_SIZE_DEFAULT) || PAGE_SIZE_DEFAULT),
  );

  await connectDB();

  const filter: Record<string, unknown> =
    role === "user" ? { role } : { role: { $ne: "admin" } };
  if (passwordMustChange === "1") filter.passwordMustChange = true;
  if (passwordMustChange === "0") filter.passwordMustChange = false;
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");
    filter.$or = [{ name: pattern }, { employeeId: pattern }];
  }

  const [docs, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    User.countDocuments(filter),
  ]);

  const users: AdminUserRow[] = docs.map((d) => ({
    id: d._id.toString(),
    studentId: d.employeeId ?? "",
    name: d.name,
    role: d.role,
    program: d.program ? String(d.program) : null,
    level: d.level ?? null,
    passwordMustChange: Boolean(d.passwordMustChange),
    lockedUntil: d.lockedUntil?.toISOString() ?? null,
    failedLoginAttempts: d.failedLoginAttempts ?? 0,
    createdAt: d.createdAt.toISOString(),
  }));

  return jsonOk({ users, total, page, pageSize } as Record<string, unknown>);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const firstName = String(body.firstName ?? body.name ?? "").trim();
    const employeeId = normalizeEmployeeId(
      String(body.studentId ?? body.employeeId ?? ""),
    );
    const role = parseRole(body.role);

    if (!firstName || firstName.length < 2) {
      return jsonError("First name is required");
    }
    if (!isValidEmployeeId(employeeId)) {
      return jsonError(
        "Student ID must be 3–32 characters (letters, numbers, dash, underscore)",
      );
    }
    if (role === "admin") {
      return jsonError("Create staff or users only — not another admin here.");
    }

    let program: string | undefined;
    let level: number | undefined;
    if (role === "user") {
      const parsedProgram = parseProgram(body.program);
      const parsedLevel = parseLevel(body.level);
      if (!parsedProgram) {
        return jsonError("Select a program for the student");
      }
      if (parsedLevel === null) {
        return jsonError("Select an academic level (100–400)");
      }
      program = parsedProgram;
      level = parsedLevel;
    }

    await connectDB();
    const existing = await User.findOne({ employeeId });
    if (existing) {
      return jsonError("Student ID already exists", 409);
    }

    const email = internalEmailFromEmployeeId(employeeId);
    const setupCode = generateSetupCode();
    const doc = await User.create({
      employeeId,
      email,
      name: firstName,
      role,
      program: program ?? "",
      ...(level !== undefined ? { level } : {}),
      passwordMustChange: true,
      setupCodeHash: await hashSetupCode(setupCode),
      setupCodeExpiresAt: setupCodeExpiry(),
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
        setupCode,
        message: `Account created. Give ${firstName} their Student ID (${employeeId}) and this one-time setup code to create a password.`,
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
