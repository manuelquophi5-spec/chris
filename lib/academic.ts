export const ACADEMIC_PROGRAMS = [
  { id: "computer-science", label: "BSc Computer Science" },
  { id: "information-technology", label: "BSc Information Technology" },
  { id: "business-administration", label: "BSc Business Administration" },
] as const;

export const ACADEMIC_LEVELS = [100, 200, 300, 400] as const;

export type AcademicProgramId = (typeof ACADEMIC_PROGRAMS)[number]["id"];
export type AcademicLevel = (typeof ACADEMIC_LEVELS)[number];

const PROGRAM_IDS = new Set<string>(ACADEMIC_PROGRAMS.map((p) => p.id));
const LEVEL_SET = new Set<number>(ACADEMIC_LEVELS);

export function parseProgram(value: unknown): AcademicProgramId | null {
  const id = String(value ?? "").trim().toLowerCase();
  if (!id || !PROGRAM_IDS.has(id)) return null;
  return id as AcademicProgramId;
}

export function parseLevel(value: unknown): AcademicLevel | null {
  const n = Number(value);
  if (!LEVEL_SET.has(n as AcademicLevel)) return null;
  return n as AcademicLevel;
}

export function programLabel(id: string | undefined | null): string {
  const p = ACADEMIC_PROGRAMS.find((x) => x.id === id);
  return p?.label ?? id ?? "—";
}

export function levelLabel(level: number | undefined | null): string {
  if (level == null || !LEVEL_SET.has(level as AcademicLevel)) return "—";
  return `Level ${level}`;
}
