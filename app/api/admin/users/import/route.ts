import { connectDB } from "@/lib/db";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { User } from "@/models/User";
import { ACADEMIC_PROGRAMS, ACADEMIC_LEVELS } from "@/lib/academic";

function employeeIdFromNameAndId(name: string, id: string): string {
  const local = id.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
  return local.length >= 3 ? local : name.toUpperCase().replace(/\s+/g, "").slice(0, 12);
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof Response) return auth;

    const body = await request.json();
    const rows = body.rows as Array<{
      name?: string;
      studentId?: string;
      program?: string;
      level?: string | number;
      role?: string;
    }>;

    if (!rows || rows.length === 0) {
      return jsonError("No rows to import");
    }

    await connectDB();

    const programIds = new Set(ACADEMIC_PROGRAMS.map((p) => p.id));
    const levelValues = new Set(ACADEMIC_LEVELS);

    const results: Array<{ studentId: string; name: string; status: string }> = [];
    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      const name = (row.name ?? "").trim();
      const rawId = (row.studentId ?? "").trim();
      const role = row.role === "instructor" || row.role === "lecturer" ? "instructor" : "user";
      const program = (row.program ?? "").trim().toLowerCase();
      const levelNum = Number(row.level);

      if (!name || !rawId) {
        results.push({ studentId: rawId || "—", name: name || "—", status: "Skipped — missing name or ID" });
        skipped++;
        continue;
      }

      const studentId = rawId.toUpperCase();
      const exists = await User.findOne({ employeeId: studentId });

      if (exists) {
        results.push({ studentId, name, status: "Skipped — duplicate ID" });
        skipped++;
        continue;
      }

      const validProgram = programIds.has(program) ? program : null;
      const validLevel = levelValues.has(levelNum as typeof ACADEMIC_LEVELS[number]) ? levelNum : null;

      if (role === "user" && (!validProgram || validLevel === null)) {
        results.push({ studentId, name, status: "Skipped — invalid program/level" });
        skipped++;
        continue;
      }

      await User.create({
        employeeId: studentId,
        name,
        role,
        program: validProgram ?? "",
        level: validLevel ?? undefined,
        passwordMustChange: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      results.push({ studentId, name, status: "Created" });
      created++;
    }

    return jsonOk({
      message: `Imported ${created} users, skipped ${skipped}.`,
      created,
      skipped,
      results,
    } as Record<string, unknown>);
  } catch (error) {
    console.error("[api/admin/users/import]", error);
    return jsonError(
      error instanceof Error ? error.message : "Internal Server Error",
      500,
    );
  }
}
