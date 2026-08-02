"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  adminBtnPrimary,
  adminInput,
  adminSelect,
  adminStack,
} from "./admin-ui";

type LocationOption = { id: string; name: string };

type SessionRow = {
  id: string;
  title: string;
  courseCode?: string;
  locationId: string;
  locationName: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
};

/** "2026-08-01T09:00" — value a datetime-local input accepts, in local time. */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

export function SessionManager() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [locationId, setLocationId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [sessRes, locRes] = await Promise.all([
      authFetch("/api/admin/sessions"),
      authFetch("/api/locations"),
    ]);
    const sessData = await parseJsonResponse<{
      sessions?: SessionRow[];
      error?: string;
    }>(sessRes);
    const locData = await locRes.json();
    if (sessRes.ok) setSessions(sessData.sessions ?? []);
    setLocations(
      (locData.locations ?? []).map((l: LocationOption) => ({
        id: l.id,
        name: l.name,
      })),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setTitle("");
    setCourseCode("");
    setLocationId("");
    setStartAt("");
    setEndAt("");
    setEditingId(null);
  }

  function startEdit(s: SessionRow) {
    setEditingId(s.id);
    setTitle(s.title);
    setCourseCode(s.courseCode ?? "");
    setLocationId(s.locationId);
    setStartAt(toDatetimeLocal(s.startAt));
    setEndAt(toDatetimeLocal(s.endAt));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        courseCode: courseCode.trim() || undefined,
        locationId,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      };
      const res = editingId
        ? await authFetch(`/api/admin/sessions/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await authFetch("/api/admin/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(
        res,
      );
      if (!res.ok) {
        toastError(
          data.error ?? (editingId ? "Could not update session" : "Could not create session"),
        );
        return;
      }
      toastSuccess(data.message ?? (editingId ? "Session updated" : "Session created"));
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function cancelSession(id: string, title: string) {
    if (!window.confirm(`Cancel "${title}"? This cannot be undone.`)) return;
    setCancelingId(id);
    try {
      const res = await authFetch(`/api/admin/sessions/${id}`, {
        method: "DELETE",
      });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(
        res,
      );
      if (!res.ok) {
        toastError(data.error ?? "Could not cancel session");
        return;
      }
      toastSuccess(data.message ?? "Session cancelled");
      if (editingId === id) resetForm();
      await load();
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className={adminStack}>
      <div>
        <h1 className="ella-heading-page">Classes (optional)</h1>
        <p className="ella-text-muted mt-2 max-w-2xl">
          Only needed for schools or timed meetings. Staff check in when class starts
          and out when it ends. For a normal office, use daily check-in on the phone
          instead — you can skip this page.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ella-card-padded">
        <h2 className="ella-heading-section text-lg">
          {editingId ? "Edit session" : "New session"}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="ella-label">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={adminInput}
              placeholder="Intro to Computing — Week 5"
            />
          </label>
          <label className="block">
            <span className="ella-label">Course code (optional)</span>
            <input
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              className={adminInput}
              placeholder="CS101"
            />
          </label>
          <label className="block">
            <span className="ella-label">Site</span>
            <select
              required
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={adminSelect}
            >
              <option value="">Select site…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="ella-label">Starts</span>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={adminInput}
            />
          </label>
          <label className="block">
            <span className="ella-label">Ends</span>
            <input
              type="datetime-local"
              required
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className={adminInput}
            />
          </label>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className={`${adminBtnPrimary} px-5`}
          >
            {saving
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Create session"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-semibold text-[var(--ella-fg-muted)] hover:text-[var(--ella-fg)]"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <div className="ella-table-wrap">
        <table className="ella-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Site</th>
              <th>Window</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-[var(--ella-fg-subtle)]">
                  No sessions yet.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id}>
                  <td className="ella-table-primary">
                    {s.title}
                    {s.courseCode ? (
                      <span className="ml-2 text-xs font-normal text-[var(--ella-fg-subtle)]">
                        {s.courseCode}
                      </span>
                    ) : null}
                  </td>
                  <td>{s.locationName}</td>
                  <td>
                    {new Date(s.startAt).toLocaleString()} –{" "}
                    {new Date(s.endAt).toLocaleTimeString()}
                  </td>
                  <td>
                    {s.isActive ? (
                      <span className="ella-chip-success">Live</span>
                    ) : (
                      <span className="ella-chip-neutral">Scheduled / ended</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(s)}
                        className="rounded-lg border border-[var(--ella-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ella-fg-muted)] hover:text-[var(--ella-fg)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancelSession(s.id, s.title)}
                        disabled={cancelingId === s.id}
                        className="rounded-lg border border-[var(--ella-danger)]/35 bg-[var(--ella-danger-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ella-danger)] hover:opacity-90 disabled:opacity-50"
                      >
                        {cancelingId === s.id ? "Cancelling…" : "Cancel"}
                      </button>
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
