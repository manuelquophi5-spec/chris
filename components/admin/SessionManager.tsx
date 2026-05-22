"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
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
    <div className={adminStack}>
      <div>
        <h1 className="ella-heading-page">Classes (optional)</h1>
        <p className="ella-text-muted mt-2 max-w-2xl">
          Only needed for schools or timed meetings. Staff check in when class starts
          and out when it ends. For a normal office, use daily check-in on the phone
          instead — you can skip this page.
        </p>
      </div>

      <form onSubmit={handleCreate} className="ella-card-padded">
        <h2 className="ella-heading-section text-lg">New session</h2>
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
          className={`${adminBtnPrimary} mt-4 px-5`}
        >
          {saving ? "Saving…" : "Create session"}
        </button>
      </form>

      <div className="ella-table-wrap">
        <table className="ella-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Site</th>
              <th>Window</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-[var(--ella-fg-subtle)]">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
