"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
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

export function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [role, setRole] = useState<"user" | "instructor">("user");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authFetch("/api/admin/users");
    const data = await parseJsonResponse<{ users?: AdminUserRow[]; error?: string }>(
      res,
    );
    if (res.ok) setUsers(data.users ?? []);
    else setError(data.error ?? "Could not load student list");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          studentId: studentId.trim(),
          role,
        }),
      });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(res);
      if (!res.ok) {
        setError(data.error ?? "Could not add this person");
        return;
      }
      setMessage(
        data.message ??
          `Added ${firstName}. Tell them to open datalink_attend and tap “Set password” with ID ${studentId.toUpperCase()}.`,
      );
      setFirstName("");
      setStudentId("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function unlockUser(id: string) {
    setError(null);
    const res = await authFetch(`/api/admin/users/${id}/unlock`, {
      method: "POST",
    });
    const data = await parseJsonResponse<{ error?: string; message?: string }>(res);
    if (!res.ok) {
      setError(data.error ?? "Could not unlock account");
      return;
    }
    setMessage(data.message ?? "Account unlocked — they can try signing in again.");
    await load();
  }

  async function resetPassword(id: string) {
    setError(null);
    const res = await authFetch(`/api/admin/users/${id}/reset-password`, {
      method: "POST",
    });
    const data = await parseJsonResponse<{ error?: string; message?: string }>(res);
    if (!res.ok) {
      setError(data.error ?? "Could not reset password");
      return;
    }
    setMessage(
      data.message ??
        "Password cleared — tell them to open Set password and choose a new one.",
    );
    await load();
  }

  function copyInstructions(id: string, name: string) {
    const text = `Hi ${name}, set up Data Link attendance:\n1. Open datalink_attend\n2. Tap "Set password"\n3. Student ID: ${id}\n4. Choose a password, then sign in for class check-in.`;
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <div className={adminStack}>
      <div>
        <h1 className="ella-heading-page">Students & staff</h1>
        <p className="ella-text-muted mt-2">
          Add students and lecturers here. Each student gets an ID they use to
          sign in.
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
        </div>
        {error && (
          <p className="ella-alert-error mt-3" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="ella-alert-success mt-3" role="status">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className={`${adminBtnPrimary} mt-5 w-full py-3.5 text-base font-bold sm:w-auto sm:px-8`}
        >
          {saving ? "Adding…" : "Add student or lecturer"}
        </button>
      </form>

      <div className="ella-table-wrap">
        <div className="ella-table-wrap-header">
          <h2 className="ella-heading-section text-lg">All students & staff</h2>
        </div>
        <table className="ella-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Student ID</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-[var(--ella-fg-subtle)]">
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-[var(--ella-fg-subtle)]">
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
