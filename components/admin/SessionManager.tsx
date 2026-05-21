"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";

type LocationOption = { id: string; name: string };

type SessionRow = {
  id: string;
  title: string;
  courseCode?: string;
  locationName: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
};

export function SessionManager() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [locationId, setLocationId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await authFetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          courseCode: courseCode.trim() || undefined,
          locationId,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        }),
      });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(
        res,
      );
      if (!res.ok) {
        setError(data.error ?? "Could not create session");
        return;
      }
      setMessage("Session created");
      setTitle("");
      setCourseCode("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Classes (optional)</h1>
      <p className="mt-2 max-w-2xl text-base text-slate-600">
        Only needed for schools or timed meetings. Staff check in when class starts
        and out when it ends. For a normal office, use daily check-in on the phone
        instead — you can skip this page.
      </p>

      <form
        onSubmit={handleCreate}
        className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-900">New session</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="Intro to Computing — Week 5"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Course code (optional)</span>
            <input
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              placeholder="CS101"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Site</span>
            <select
              required
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
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
            <span className="text-sm font-medium text-slate-700">Starts</span>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Ends</span>
            <input
              type="datetime-local"
              required
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-3 text-sm text-emerald-700" role="status">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Create session"}
        </button>
      </form>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Window</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-slate-500">
                  No sessions yet.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {s.title}
                    {s.courseCode ? (
                      <span className="ml-2 text-xs text-slate-500">
                        {s.courseCode}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.locationName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(s.startAt).toLocaleString()} –{" "}
                    {new Date(s.endAt).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3">
                    {s.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                        Live
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        Scheduled / ended
                      </span>
                    )}
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
