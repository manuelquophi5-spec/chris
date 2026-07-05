"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import { ACADEMIC_LEVELS, ACADEMIC_PROGRAMS } from "@/lib/academic";
import { toastError, toastSuccess, toastWarning } from "@/lib/toast";
import type { AdminUserRow } from "@/types";
import {
  adminBtnGhost,
  adminBtnPrimary,
  adminBtnSecondary,
  adminInput,
  adminSelect,
  adminStack,
} from "./admin-ui";
import { AdminHelpCard } from "./AdminHelpCard";

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.findIndex((h) => h === "name" || h === "first name");
  const idIdx = headers.findIndex((h) => h === "studentid" || h === "student id" || h === "id" || h === "employeeid");
  const progIdx = headers.findIndex((h) => h === "program");
  const levelIdx = headers.findIndex((h) => h === "level");
  const roleIdx = headers.findIndex((h) => h === "role" || h === "type" || h === "job type");

  if (nameIdx === -1 || idIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    return {
      name: cols[nameIdx] ?? "",
      studentId: cols[idIdx] ?? "",
      program: progIdx >= 0 ? (cols[progIdx] ?? "") : "",
      level: levelIdx >= 0 ? (cols[levelIdx] ?? "") : "",
      role: roleIdx >= 0 ? (cols[roleIdx] ?? "") : "user",
    };
  }).filter((r) => r.name && r.studentId);
}

export function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [role, setRole] = useState<"user" | "instructor">("user");
  const [program, setProgram] = useState("");
  const [level, setLevel] = useState<number | "">("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ created: number; skipped: number; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authFetch("/api/admin/users");
    const data = await parseJsonResponse<{ users?: AdminUserRow[]; error?: string }>(
      res,
    );
    if (res.ok) setUsers(data.users ?? []);
    else toastError(data.error ?? "Could not load student list");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          studentId: studentId.trim(),
          role,
          program: role === "user" ? program : undefined,
          level: role === "user" && level !== "" ? level : undefined,
        }),
      });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(res);
      if (!res.ok) {
        toastError(data.error ?? "Could not add this person");
        return;
      }
      toastSuccess(
        data.message ??
          `Added ${firstName}. Tell them to open datalink_attend and tap “Set password” with ID ${studentId.toUpperCase()}.`,
      );
      setFirstName("");
      setStudentId("");
      setProgram("");
      setLevel("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function unlockUser(id: string) {
    const res = await authFetch(`/api/admin/users/${id}/unlock`, {
      method: "POST",
    });
    const data = await parseJsonResponse<{ error?: string; message?: string }>(res);
    if (!res.ok) {
      toastError(data.error ?? "Could not unlock account");
      return;
    }
    toastSuccess(data.message ?? "Account unlocked. They can try signing in again.");
    await load();
  }

  async function resetPassword(id: string) {
    const res = await authFetch(`/api/admin/users/${id}/reset-password`, {
      method: "POST",
    });
    const data = await parseJsonResponse<{ error?: string; message?: string }>(res);
    if (!res.ok) {
      toastError(data.error ?? "Could not reset password");
      return;
    }
    toastSuccess(
      data.message ??
        "Password cleared. Tell them to open Set password and choose a new one.",
    );
    await load();
  }

  function copyInstructions(id: string, name: string) {
    const text = `Hi ${name}, set up Data Link attendance:\n1. Open datalink_attend\n2. Tap "Set password"\n3. Student ID: ${id}\n4. Choose a password, then sign in for class check-in.`;
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toastSuccess("Instructions copied to clipboard.");
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function handleCsvUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toastWarning("Select a CSV file first.");
      return;
    }
    setCsvImporting(true);
    setCsvResult(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toastError("CSV must have 'Name' and 'Student ID' columns.");
        return;
      }
      const res = await authFetch("/api/admin/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await parseJsonResponse<{
        error?: string;
        created?: number;
        skipped?: number;
        message?: string;
      }>(res);
      if (!res.ok) {
        toastError(data.error ?? "Import failed");
        return;
      }
      setCsvResult({
        created: data.created ?? 0,
        skipped: data.skipped ?? 0,
        message: data.message ?? "",
      });
      toastSuccess(data.message ?? "Import complete");
      await load();
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      toastError("Could not read the CSV file. Make sure it's a valid CSV.");
    } finally {
      setCsvImporting(false);
    }
  }

  return (
    <div className={adminStack}>
      <div>
        <h1 className="ella-heading-page">Students & staff</h1>
        <p className="ella-text-muted mt-2">
          Add students with program and level — they automatically see matching
          courses. Lecturers are assigned to classes by admin.
        </p>
      </div>

      <AdminHelpCard title="Tell new students (copy & send)">
        <p>After you add someone, send them:</p>
        <p className="ella-quote">
          “Open datalink_attend → Set password → enter your Student ID → pick a password →
          check in during class.”
        </p>
      </AdminHelpCard>

      <form onSubmit={handleCreate} className="ella-card-padded">
        <h2 className="ella-heading-section text-lg">Add a new person</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="ella-label font-semibold">First name</span>
            <input
              type="text"
              required
              minLength={2}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={`${adminInput} text-base py-3`}
              placeholder="e.g. Ama"
            />
          </label>
          <label className="block">
            <span className="ella-label font-semibold">
              Student ID (they will type this)
            </span>
            <input
              type="text"
              required
              minLength={3}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              className={`${adminInput} font-mono text-base uppercase py-3`}
              placeholder="e.g. E10234"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="ella-label font-semibold">Job type</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "instructor")}
              className={`${adminSelect} text-base py-3`}
            >
              <option value="user">Student — checks in on phone during class</option>
              <option value="instructor">
                Lecturer — teaches classes & views attendance
              </option>
            </select>
          </label>
          {role === "user" && (
            <>
              <label className="block">
                <span className="ella-label font-semibold">Program</span>
                <select
                  required
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className={`${adminSelect} text-base py-3`}
                >
                  <option value="">Select program</option>
                  {ACADEMIC_PROGRAMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="ella-label font-semibold">Level</span>
                <select
                  required
                  value={level}
                  onChange={(e) =>
                    setLevel(e.target.value ? Number(e.target.value) : "")
                  }
                  className={`${adminSelect} text-base py-3`}
                >
                  <option value="">Select level</option>
                  {ACADEMIC_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      Level {l}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={
            saving ||
            (role === "user" && (!program || level === ""))
          }
          className={`${adminBtnPrimary} mt-5 w-full py-3.5 text-base font-bold sm:w-auto sm:px-8`}
        >
          {saving ? "Adding…" : "Add student or lecturer"}
        </button>
      </form>

      <div className="ella-card-padded">
        <h2 className="ella-heading-section text-lg">Import from CSV</h2>
        <p className="ella-text-muted mt-1 text-sm">
          Upload a spreadsheet exported from your student records system. CSV must have columns: <strong>Name</strong>, <strong>Student ID</strong>, <strong>Program</strong>, <strong>Level</strong>, <strong>Role</strong> (optional — defaults to "user"). Use "instructor" or "lecturer" for lecturers.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv,text/csv"
            ref={fileRef}
            className="rounded-lg border border-[var(--ella-border)] bg-[var(--ella-surface)] px-4 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleCsvUpload()}
            disabled={csvImporting}
            className={adminBtnSecondary}
          >
            {csvImporting ? "Importing…" : "Import CSV"}
          </button>
        </div>
        {csvResult && (
          <div className="mt-3 rounded-lg bg-[var(--ella-surface-muted)] px-4 py-3 text-sm">
            <p className="font-semibold text-[var(--ella-fg)]">{csvResult.message}</p>
            <p className="mt-1 text-[var(--ella-fg-muted)]">
              Created: {csvResult.created} · Skipped: {csvResult.skipped}
            </p>
          </div>
        )}
      </div>

      <div className="ella-table-wrap">
        <div className="ella-table-wrap-header">
          <h2 className="ella-heading-section text-lg">All students & staff</h2>
        </div>
        <table className="ella-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Student ID</th>
              <th>Program / level</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-[var(--ella-fg-subtle)]">
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-[var(--ella-fg-subtle)]">
                  No one added yet. Use the form above.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="ella-table-primary">
                    {u.name}
                    {u.role === "instructor" && (
                      <span className="ml-2 text-xs text-[var(--ella-fg-subtle)]">
                        Lecturer
                      </span>
                    )}
                  </td>
                  <td className="font-mono text-base text-[var(--ella-fg)]">
                    {u.studentId}
                  </td>
                  <td className="text-sm text-[var(--ella-fg-muted)]">
                    {u.role === "user"
                      ? u.program && u.level
                        ? `${ACADEMIC_PROGRAMS.find((p) => p.id === u.program)?.label ?? u.program} · L${u.level}`
                        : "—"
                      : "—"}
                  </td>
                  <td>
                    {u.lockedUntil ? (
                      <span className="ella-chip-danger">
                        Locked (too many wrong passwords)
                      </span>
                    ) : u.passwordMustChange ? (
                      <span className="ella-chip-warning">Needs to set password</span>
                    ) : (
                      <span className="ella-chip-success">Ready to check in</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyInstructions(u.studentId, u.name)}
                        className={adminBtnGhost}
                      >
                        {copiedId === u.studentId ? "Copied!" : "Copy instructions"}
                      </button>
                      {u.lockedUntil ? (
                        <button
                          type="button"
                          onClick={() => void unlockUser(u.id)}
                          className={`${adminBtnPrimary} px-2.5 py-1.5 text-xs`}
                        >
                          Unlock
                        </button>
                      ) : null}
                      {!u.passwordMustChange ? (
                        <button
                          type="button"
                          onClick={() => void resetPassword(u.id)}
                          className="rounded-lg border border-[var(--ella-warning)]/35 bg-[var(--ella-warning-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ella-warning)] hover:opacity-90"
                        >
                          Reset password
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
