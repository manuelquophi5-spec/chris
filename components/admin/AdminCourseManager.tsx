"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import { WEEKDAY_OPTIONS } from "@/lib/schedule";
import type { AdminUserRow, CourseRow, CourseStatsSummary } from "@/types";
import {
  adminBtnGhost,
  adminBtnPrimary,
  adminBtnSecondary,
  adminInput,
  adminSelect,
  adminStack,
} from "./admin-ui";
import { AdminHelpCard } from "./AdminHelpCard";

type LocationOption = { id: string; name: string };

export function AdminCourseManager() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [lecturers, setLecturers] = useState<AdminUserRow[]>([]);
  const [students, setStudents] = useState<AdminUserRow[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState<
    Array<{ id: string; name: string; employeeId: string }>
  >([]);
  const [stats, setStats] = useState<CourseStatsSummary | null>(null);
  const [pickStudent, setPickStudent] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lecturerId, setLecturerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [lateAfterMinutes, setLateAfterMinutes] = useState(15);
  const [scheduleDays, setScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const load = useCallback(async () => {
    const [cRes, uRes, lRes] = await Promise.all([
      authFetch("/api/admin/courses"),
      authFetch("/api/admin/users"),
      authFetch("/api/locations?all=1"),
    ]);
    const cData = await parseJsonResponse<{ error?: string; courses?: CourseRow[] }>(
      cRes,
    );
    const uData = await parseJsonResponse<{ error?: string; users?: AdminUserRow[] }>(
      uRes,
    );
    const lData = await parseJsonResponse<{
      error?: string;
      locations?: LocationOption[];
    }>(lRes);
    if (cRes.ok) setCourses(cData.courses ?? []);
    if (uRes.ok) {
      const users = uData.users ?? [];
      setLecturers(users.filter((u) => u.role === "instructor"));
      setStudents(users.filter((u) => u.role === "user"));
    }
    if (lRes.ok) setLocations(lData.locations ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadCourseDetail(id: string) {
    setSelectedId(id);
    const [eRes, sRes] = await Promise.all([
      authFetch(`/api/admin/courses/${id}/enrollments`),
      authFetch(`/api/admin/courses/${id}/stats`),
    ]);
    const eData = await parseJsonResponse<{
      error?: string;
      students?: Array<{ id: string; name: string; employeeId: string }>;
    }>(eRes);
    const sData = await parseJsonResponse<{
      error?: string;
      stats?: CourseStatsSummary;
    }>(sRes);
    if (eRes.ok) setEnrolled(eData.students ?? []);
    if (sRes.ok) setStats(sData.stats ?? null);
  }

  function toggleDay(day: number) {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await authFetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          lecturerId,
          locationId: locationId || null,
          startTime,
          endTime,
          lateAfterMinutes,
          scheduleDays,
        }),
      });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(res);
      if (!res.ok) {
        setError(data.error ?? "Could not create class");
        return;
      }
      setMessage(data.message ?? "Class created");
      setTitle("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function enrollSelected() {
    if (!selectedId || pickStudent.length === 0) return;
    const res = await authFetch(`/api/admin/courses/${selectedId}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: pickStudent }),
    });
    const data = await parseJsonResponse<{ error?: string; message?: string }>(res);
    if (!res.ok) {
      setError(data.error ?? "Could not enroll");
      return;
    }
    setMessage(data.message ?? "Enrolled");
    setPickStudent([]);
    await loadCourseDetail(selectedId);
    await load();
  }

  async function removeStudent(userId: string) {
    if (!selectedId) return;
    const res = await authFetch(
      `/api/admin/courses/${selectedId}/enrollments?userId=${userId}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      await loadCourseDetail(selectedId);
      await load();
    }
  }

  const notEnrolled = students.filter(
    (s) => !enrolled.some((e) => e.id === s.id),
  );

  const filteredRecords = stats?.students.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.employeeId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={adminStack}>
      <div>
        <h1 className="ella-heading-page">Classes & courses</h1>
        <p className="ella-text-muted mt-2">
          Create classes, set schedules, assign lecturers, enroll students, and
          review attendance.
        </p>
      </div>

      <AdminHelpCard title="School setup">
        <ol className="list-inside list-decimal space-y-1">
          <li>Create a workplace (campus) under Workplaces with GPS radius.</li>
          <li>Add lecturers under Students & staff (role: Lecturer).</li>
          <li>Create a class here and pick days + start/end times (e.g. 15:00).</li>
          <li>Enroll students — they check in only while the class is active.</li>
        </ol>
      </AdminHelpCard>

      {message && (
        <p className="ella-alert-success">
          {message}
        </p>
      )}
      {error && (
        <p className="ella-alert-error">{error}</p>
      )}

      <form
        onSubmit={handleCreate}
        className="ella-card-padded"
      >
        <h2 className="ella-heading-section text-lg">Create a class</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="ella-label font-semibold">Course title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${adminInput} mt-1`}
              placeholder="e.g. Introduction to Computing"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="ella-label font-semibold">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${adminInput} mt-1`}
            />
          </label>
          <label className="block">
            <span className="ella-label font-semibold">Lecturer</span>
            <select
              required
              value={lecturerId}
              onChange={(e) => setLecturerId(e.target.value)}
              className={`${adminInput} mt-1`}
            >
              <option value="">Select lecturer</option>
              {lecturers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="ella-label font-semibold">Campus / room GPS</span>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={`${adminInput} mt-1`}
            >
              <option value="">Select workplace</option>
              {locations
                .filter((l) => l.id)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="ella-label font-semibold">Start time</span>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`${adminInput} mt-1`}
            />
          </label>
          <label className="block">
            <span className="ella-label font-semibold">End time</span>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`${adminInput} mt-1`}
            />
          </label>
          <label className="block">
            <span className="ella-label font-semibold">
              Late after (minutes)
            </span>
            <input
              type="number"
              min={0}
              max={120}
              value={lateAfterMinutes}
              onChange={(e) => setLateAfterMinutes(Number(e.target.value))}
              className={`${adminInput} mt-1`}
            />
          </label>
        </div>
        <fieldset className="mt-4">
          <legend className="ella-label font-semibold">Class days</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAY_OPTIONS.map((d) => (
              <label
                key={d.value}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium ${
                  scheduleDays.includes(d.value)
                    ? "border-[var(--ella-accent)] bg-[var(--ella-accent-subtle)] text-[var(--ella-accent-hover)]"
                    : "border-[var(--ella-border)] text-[var(--ella-fg-muted)]"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={scheduleDays.includes(d.value)}
                  onChange={() => toggleDay(d.value)}
                />
                {d.label.slice(0, 3)}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={saving || scheduleDays.length === 0}
          className={`${adminBtnPrimary} mt-6 px-5 py-3`}
        >
          {saving ? "Saving…" : "Create class"}
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ella-list-panel">
          <div className="ella-list-panel-header">
            <h2 className="ella-heading-section text-lg">All classes</h2>
          </div>
          <ul className="max-h-[420px] divide-y divide-[var(--ella-border)] overflow-y-auto">
            {courses.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => void loadCourseDetail(c.id)}
                  className={`ella-list-item ${
                    selectedId === c.id ? "ella-list-item-active" : ""
                  }`}
                >
                  <p className="font-semibold text-[var(--ella-fg)]">{c.title}</p>
                  <p className="ella-text-muted text-sm">
                    {c.lecturerName} · {c.startTime}–{c.endTime} · {c.enrolledCount}{" "}
                    students
                  </p>
                  {c.isActiveNow && (
                    <span className="text-xs font-semibold text-[var(--ella-accent-hover)]">
                      Active now
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {selectedId ? (
            <>
              <div className="ella-card-padded">
                <h3 className="ella-heading-section">Enroll students</h3>
                <select
                  multiple
                  value={pickStudent}
                  onChange={(e) =>
                    setPickStudent(
                      Array.from(e.target.selectedOptions, (o) => o.value),
                    )
                  }
                  className={`${adminInput} mt-2 h-32 py-2`}
                >
                  {notEnrolled.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.employeeId})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[var(--ella-fg-subtle)]">
                  Hold Ctrl (Windows) to select multiple students.
                </p>
                <button
                  type="button"
                  onClick={() => void enrollSelected()}
                  className={`${adminBtnPrimary} mt-3`}
                >
                  Add to class
                </button>
                <ul className="mt-4 space-y-1 text-sm">
                  {enrolled.map((s) => (
                    <li
                      key={s.id}
                      className="ella-panel-muted flex items-center justify-between px-3 py-2"
                    >
                      <span>
                        {s.name}{" "}
                        <span className="font-mono text-[var(--ella-fg-subtle)]">{s.employeeId}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeStudent(s.id)}
                        className="text-xs font-semibold text-red-700"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="ella-card-padded">
                <h3 className="ella-heading-section">Attendance report</h3>
                <input
                  type="search"
                  placeholder="Search student…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`${adminInput} mt-2`}
                />
                {stats && (
                  <div className="ella-table-wrap mt-4">
                    <table className="ella-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>%</th>
                          <th>Late</th>
                          <th>Missed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords?.map((s) => (
                          <tr key={s.userId}>
                            <td className="ella-table-primary">{s.name}</td>
                            <td>{s.attendancePercent}%</td>
                            <td>{s.lateSessions}</td>
                            <td>{s.missedSessions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="ella-panel-muted border-dashed p-8 text-center text-sm text-[var(--ella-fg-subtle)]">
              Select a class to enroll students and view attendance statistics.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
