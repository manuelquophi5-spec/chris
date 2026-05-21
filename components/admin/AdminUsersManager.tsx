"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import type { AdminUserRow } from "@/types";
import { AdminHelpCard } from "./AdminHelpCard";

export function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState<"user" | "instructor">("user");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authFetch("/api/admin/users");
    const data = await parseJsonResponse<{ users?: AdminUserRow[]; error?: string }>(
      res,
    );
    if (res.ok) setUsers(data.users ?? []);
    else setError(data.error ?? "Could not load team list");
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
          employeeId: employeeId.trim(),
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
          `Added ${firstName}. Tell them to open Ella and tap “Set password” with ID ${employeeId.toUpperCase()}.`,
      );
      setFirstName("");
      setEmployeeId("");
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

  function copyInstructions(id: string, name: string) {
    const text = `Hi ${name}, set up Ella attendance:\n1. Open the Ella website\n2. Tap "Set password"\n3. Employee ID: ${id}\n4. Choose a password, then sign in each day to check in/out.`;
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Team</h1>
        <p className="mt-2 text-base text-slate-600">
          Add employees here. Each person gets an ID number they use to sign in.
        </p>
      </div>

      <AdminHelpCard title="Tell new staff (copy & send)">
        <p>After you add someone, send them:</p>
        <p className="rounded-lg bg-white px-3 py-2 font-medium text-slate-800">
          “Open Ella → Set password → enter your Employee ID → pick a password →
          check in when you arrive.”
        </p>
      </AdminHelpCard>

      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold text-slate-900">Add a new person</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">First name</span>
            <input
              type="text"
              required
              minLength={2}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="e.g. Ama"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Employee ID (they will type this)
            </span>
            <input
              type="text"
              required
              minLength={3}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 font-mono text-base uppercase focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="e.g. E10234"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Job type</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "instructor")}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-base"
            >
              <option value="user">Staff — checks in on phone only</option>
              <option value="instructor">
                Supervisor — can also run class sessions & view attendance
              </option>
            </select>
          </label>
        </div>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="mt-5 w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {saving ? "Adding…" : "Add to team"}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Everyone on the team</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Employee ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-slate-500">
                  No one added yet. Use the form above.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.name}
                    {u.role === "instructor" && (
                      <span className="ml-2 text-xs text-slate-500">Supervisor</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-base text-slate-800">
                    {u.employeeId}
                  </td>
                  <td className="px-4 py-3">
                    {u.lockedUntil ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                        Locked (too many wrong passwords)
                      </span>
                    ) : u.passwordMustChange ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                        Needs to set password
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                        Ready to use Ella
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyInstructions(u.employeeId, u.name)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {copiedId === u.employeeId ? "Copied!" : "Copy instructions"}
                      </button>
                      {u.lockedUntil ? (
                        <button
                          type="button"
                          onClick={() => void unlockUser(u.id)}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white"
                        >
                          Unlock
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
