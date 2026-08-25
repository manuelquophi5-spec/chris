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
import { ConfirmButton } from "./ConfirmButton";

type IssuedCode = { name: string; studentId: string; code: string };

const SESSION_CODES_KEY = "dla_setup_codes";
const MAX_SESSION_CODES = 20;

/** Recently-issued one-time setup codes survive a refresh within the tab
 * session — a page reload or adding a second person must not silently
 * discard an earlier code the admin hasn't handed off yet. */
function loadSessionCodes(): IssuedCode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_CODES_KEY);
    return raw ? (JSON.parse(raw) as IssuedCode[]) : [];
  } catch {
    return [];
  }
}

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

const PAGE_SIZE = 50;

export function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [program, setProgram] = useState("");
  const [level, setLevel] = useState<number | "">("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{
    created: number;
    skipped: number;
    message: string;
    results: Array<{ studentId: string; name: string; status: string; setupCode?: string }>;
  } | null>(null);
  const [sessionCodes, setSessionCodes] = useState<IssuedCode[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSessionCodes(loadSessionCodes());
  }, []);

  function addSessionCode(entry: IssuedCode) {
    setSessionCodes((prev) => {
      const next = [entry, ...prev.filter((c) => c.studentId !== entry.studentId)].slice(
        0,
        MAX_SESSION_CODES,
      );
      try {
        window.sessionStorage.setItem(SESSION_CODES_KEY, JSON.stringify(next));
      } catch {
        /* sessionStorage unavailable (private mode, quota) — codes still show for this render */
      }
      return next;
    });
  }

  function dismissSessionCode(studentId: string) {
    setSessionCodes((prev) => {
      const next = prev.filter((c) => c.studentId !== studentId);
      try {
        window.sessionStorage.setItem(SESSION_CODES_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const fetchPage = useCallback(async (q: string, pageNum: number) => {
    const params = new URLSearchParams({
      page: String(pageNum),
      limit: String(PAGE_SIZE),
    });
    if (q) params.set("q", q);
    const res = await authFetch(`/api/admin/users?${params.toString()}`);
    const data = await parseJsonResponse<{
      users?: AdminUserRow[];
      total?: number;
      error?: string;
    }>(res);
    if (!res.ok) {
      toastError(data.error ?? "Could not load student list");
      return null;
    }
    return { users: data.users ?? [], total: data.total ?? 0 };
  }, []);

  const load = useCallback(
    async (q: string) => {
      setLoading(true);
      const result = await fetchPage(q, 1);
      if (result) {
        setUsers(result.users);
        setTotal(result.total);
        setPage(1);
      }
      setLoading(false);
    },
    [fetchPage],
  );

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    const result = await fetchPage(search, nextPage);
    if (result) {
      setUsers((prev) => [...prev, ...result.users]);
      setTotal(result.total);
      setPage(nextPage);
    }
    setLoadingMore(false);
  }

  useEffect(() => {
    const id = setTimeout(() => void load(search), search ? 300 : 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
          program,
          level: level !== "" ? level : undefined,
        }),
      });
      const data = await parseJsonResponse<{
        error?: string;
        message?: string;
        setupCode?: string;
      }>(res);
      if (!res.ok) {
        toastError(data.error ?? "Could not add this person");
        return;
      }
      toastSuccess(data.message ?? `Added ${firstName}.`);
      addSessionCode({
        name: firstName,
        studentId: studentId.trim().toUpperCase(),
        code: data.setupCode ?? "",
      });
      setFirstName("");
      setStudentId("");
      setProgram("");
      setLevel("");
      await load(search);
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
    await load(search);
  }

  async function resetPassword(id: string, name: string, studentIdValue: string) {
    const res = await authFetch(`/api/admin/users/${id}/reset-password`, {
      method: "POST",
    });
    const data = await parseJsonResponse<{
      error?: string;
      message?: string;
      setupCode?: string;
    }>(res);
    if (!res.ok) {
      toastError(data.error ?? "Could not reset password");
      return;
    }
    toastSuccess(data.message ?? `Password cleared for ${name}.`);
    addSessionCode({
      name,
      studentId: studentIdValue,
      code: data.setupCode ?? "",
    });
    await load(search);
  }

  function copyInstructions(id: string, name: string, code?: string) {
    const codeLine = code ? `\n3. Setup code: ${code}` : "";
    const text = `Hi ${name}, set up Data Link attendance:\n1. Open datalink_attend\n2. Tap "Set password"${codeLine}\n${code ? "4" : "3"}. Student ID: ${id}\n${code ? "5" : "4"}. Choose a password, then sign in for class check-in.`;
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
        results?: Array<{ studentId: string; name: string; status: string; setupCode?: string }>;
      }>(res);
      if (!res.ok) {
        toastError(data.error ?? "Import failed");
        return;
      }
      setCsvResult({
        created: data.created ?? 0,
        skipped: data.skipped ?? 0,
        message: data.message ?? "",
        results: data.results ?? [],
      });
      toastSuccess(data.message ?? "Import complete");
      await load(search);
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
          courses.
        </p>
      </div>

      <AdminHelpCard title="Tell new students (copy & send)">
        <p>
          After you add someone, give them their Student ID and one-time
          setup code (shown below), then send:
        </p>
        <p className="ella-quote">
          “Open datalink_attend → Set password → enter your Student ID and
          setup code → pick a password → check in during class.”
        </p>
      </AdminHelpCard>

      {sessionCodes.length > 0 && (
        <div className="ella-card-padded border-2 border-[var(--ella-accent)] space-y-4" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="ella-heading-section text-lg">
                {sessionCodes.length > 1
                  ? `${sessionCodes.length} setup codes issued this session`
                  : `Setup code for ${sessionCodes[0].name}`}
              </h2>
              <p className="ella-text-muted mt-1 text-sm">
                Give these to each person now — they only show once. Valid for 14 days.
              </p>
            </div>
            {sessionCodes.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setSessionCodes([]);
                  try {
                    window.sessionStorage.removeItem(SESSION_CODES_KEY);
                  } catch {
                    /* ignore */
                  }
                }}
                className="text-xs font-semibold text-[var(--ella-fg-subtle)] hover:text-[var(--ella-fg)]"
              >
                Clear all
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {sessionCodes.map((entry) => (
              <li
                key={entry.studentId}
                className="ella-panel-muted flex flex-wrap items-center gap-3 px-3 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ella-fg)]">
                  {entry.name}
                </span>
                <span className="rounded-lg bg-[var(--ella-surface-muted)] px-3 py-1.5 font-mono text-base font-bold tracking-widest text-[var(--ella-fg)]">
                  {entry.code}
                </span>
                <span className="font-mono text-sm text-[var(--ella-fg-muted)]">
                  ID: {entry.studentId}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyInstructions(entry.studentId, entry.name, entry.code)
                  }
                  className={adminBtnGhost}
                >
                  Copy instructions
                </button>
                <button
                  type="button"
                  onClick={() => dismissSessionCode(entry.studentId)}
                  className="text-xs font-semibold text-[var(--ella-fg-subtle)] hover:text-[var(--ella-fg)]"
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
        </div>
        <button
          type="submit"
          disabled={saving || !program || level === ""}
          className={`${adminBtnPrimary} mt-5 w-full py-3.5 text-base font-bold sm:w-auto sm:px-8`}
        >
          {saving ? "Adding…" : "Add student"}
        </button>
      </form>

      <div className="ella-card-padded">
        <h2 className="ella-heading-section text-lg">Import from CSV</h2>
        <p className="ella-text-muted mt-1 text-sm">
          Upload a spreadsheet exported from your student records system. CSV must have columns: <strong>Name</strong>, <strong>Student ID</strong>, <strong>Program</strong>, <strong>Level</strong>.
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
            {csvResult.results.length > 0 && (
              <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-[var(--ella-border)]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[var(--ella-surface)]">
                    <tr>
                      <th scope="col" className="px-3 py-2">Student ID</th>
                      <th scope="col" className="px-3 py-2">Name</th>
                      <th scope="col" className="px-3 py-2">Status</th>
                      <th scope="col" className="px-3 py-2">Setup code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvResult.results.map((r, i) => (
                      <tr key={`${r.studentId}-${i}`} className="border-t border-[var(--ella-border)]">
                        <td className="px-3 py-2 font-mono">{r.studentId}</td>
                        <td className="px-3 py-2">{r.name}</td>
                        <td className="px-3 py-2">
                          {r.status === "Created" ? (
                            <span className="ella-chip-success">Created</span>
                          ) : (
                            <span className="text-[var(--ella-fg-subtle)]">{r.status}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold">
                          {r.setupCode ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ella-table-wrap">
        <div className="ella-table-wrap-header flex flex-wrap items-center justify-between gap-3">
          <h2 className="ella-heading-section text-lg">
            All students & staff{total > 0 ? ` (${total})` : ""}
          </h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or student ID…"
            className={`${adminInput} max-w-xs`}
          />
        </div>
        <table className="ella-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Student ID</th>
              <th scope="col">Program / level</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
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
                  {search
                    ? `No matches for "${search}".`
                    : "No one added yet. Use the form above."}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="ella-table-primary">{u.name}</td>
                  <td className="font-mono text-base text-[var(--ella-fg)]">
                    {u.studentId}
                  </td>
                  <td className="text-sm text-[var(--ella-fg-muted)]">
                    {u.program && u.level
                      ? `${ACADEMIC_PROGRAMS.find((p) => p.id === u.program)?.label ?? u.program} · L${u.level}`
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
                        onClick={() =>
                          copyInstructions(
                            u.studentId,
                            u.name,
                            sessionCodes.find((c) => c.studentId === u.studentId)
                              ?.code,
                          )
                        }
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
                        <ConfirmButton
                          label="Reset password"
                          confirmLabel="Yes, reset"
                          message={`Reset ${u.name}'s password?`}
                          onConfirm={() => resetPassword(u.id, u.name, u.studentId)}
                          className="rounded-lg border border-[var(--ella-warning)]/35 bg-[var(--ella-warning-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ella-warning)] hover:opacity-90"
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && users.length < total && (
          <div className="flex justify-center border-t border-[var(--ella-border)] p-3">
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className={adminBtnGhost}
            >
              {loadingMore ? "Loading…" : `Load more (${users.length} of ${total})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
