"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import { ACADEMIC_LEVELS, ACADEMIC_PROGRAMS } from "@/lib/academic";
import { WEEKDAY_OPTIONS } from "@/lib/schedule";
import { toastError, toastSuccess } from "@/lib/toast";
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
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [eligibleStudents, setEligibleStudents] = useState<
    Array<{ id: string; name: string; studentId: string }>
  >([]);
  const [eligibleMeta, setEligibleMeta] = useState<{
    programLabel: string;
    levelLabel: string;
  } | null>(null);
  const [stats, setStats] = useState<CourseStatsSummary | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [program, setProgram] = useState("");
  const [level, setLevel] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [lecturerId, setLecturerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [lateAfterMinutes, setLateAfterMinutes] = useState(15);
  const [scheduleDays, setScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [courseSearch, setCourseSearch] = useState("");
  const load = useCallback(async () => {
    const tzOffset = new Date().getTimezoneOffset();
    const [cRes, uRes, lRes] = await Promise.all([
      authFetch(`/api/admin/courses?timezoneOffset=${tzOffset}`),
      authFetch("/api/admin/users?role=instructor&limit=200"),
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
    }
    if (lRes.ok) setLocations(lData.locations ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function hydrateFormFromCourse(c: CourseRow) {
    setTitle(c.title);
    setCourseCode(c.courseCode ?? "");
    setProgram(c.program ?? "");
    setLevel(c.level ?? "");
    setDescription(c.description ?? "");
    setLecturerId(c.lecturerId);
    setLocationId(c.locationId ?? "");
    setStartTime(c.startTime);
    setEndTime(c.endTime);
    setLateAfterMinutes(c.lateAfterMinutes);
    setScheduleDays([...c.scheduleDays]);
    setIsActive(c.isActive);
    setEditingId(c.id);
  }

  function resetCreateForm() {
    setTitle("");
    setCourseCode("");
    setProgram("");
    setLevel("");
    setDescription("");
    setLecturerId("");
    setLocationId("");
    setStartTime("09:00");
    setEndTime("11:00");
    setLateAfterMinutes(15);
    setScheduleDays([1, 2, 3, 4, 5]);
    setIsActive(true);
    setEditingId(null);
  }

  async function loadCourseDetail(id: string) {
    setSelectedId(id);
    const course = courses.find((c) => c.id === id);
    if (course) hydrateFormFromCourse(course);
    const [eRes, sRes] = await Promise.all([
      authFetch(`/api/admin/courses/${id}/enrollments`),
      authFetch(`/api/admin/courses/${id}/stats`),
    ]);
    const eData = await parseJsonResponse<{
      error?: string;
      programLabel?: string;
      levelLabel?: string;
      students?: Array<{ id: string; name: string; studentId: string }>;
    }>(eRes);
    const sData = await parseJsonResponse<{
      error?: string;
      stats?: CourseStatsSummary;
    }>(sRes);
    if (eRes.ok) {
      setEligibleStudents(eData.students ?? []);
      setEligibleMeta({
        programLabel: eData.programLabel ?? "",
        levelLabel: eData.levelLabel ?? "",
      });
    }
    if (sRes.ok) setStats(sData.stats ?? null);
  }

  function toggleDay(day: number) {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function handleSaveClass(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title,
        courseCode: courseCode.trim(),
        program,
        level: level === "" ? undefined : level,
        description,
        lecturerId,
        locationId: locationId || null,
        startTime,
        endTime,
        lateAfterMinutes,
        scheduleDays,
        isActive,
        timezoneOffset: new Date().getTimezoneOffset(),
      };

      const res = editingId
        ? await authFetch(`/api/admin/courses/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await authFetch("/api/admin/courses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              courseCode: courseCode.trim() || undefined,
            }),
          });

      const data = await parseJsonResponse<{ error?: string; message?: string }>(res);
      if (!res.ok) {
        toastError(data.error ?? (editingId ? "Could not update class" : "Could not create class"));
        return;
      }
      toastSuccess(data.message ?? (editingId ? "Class updated" : "Class created"));
      if (!editingId) resetCreateForm();
      await load();
      if (editingId) await loadCourseDetail(editingId);
    } finally {
      setSaving(false);
    }
  }

  async function duplicateCourse(id: string) {
    const tzOffset = new Date().getTimezoneOffset();
    const res = await authFetch(
      `/api/admin/courses/${id}/duplicate?timezoneOffset=${tzOffset}`,
      { method: "POST" },
    );
    const data = await parseJsonResponse<{ error?: string; message?: string }>(res);
    if (!res.ok) {
      toastError(data.error ?? "Could not duplicate class");
      return;
    }
    toastSuccess(data.message ?? "Class duplicated");
    await load();
  }

  const filteredRecords = stats?.students.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredCourses = courses.filter((c) => {
    if (!courseSearch) return true;
    const q = courseSearch.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.courseCode ?? "").toLowerCase().includes(q) ||
      c.lecturerName.toLowerCase().includes(q) ||
      c.programLabel.toLowerCase().includes(q)
    );
  });

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
          <li>Create a campus under Campuses with GPS radius.</li>
          <li>Add lecturers under Students & staff (role: Lecturer).</li>
          <li>
            Create a class with program + level (e.g. Computer Science, Level 200).
          </li>
          <li>
            Students with matching program and level see the class automatically — no
            manual enrollment.
          </li>
        </ol>
      </AdminHelpCard>

      <form
        onSubmit={(e) => void handleSaveClass(e)}
        className="ella-card-padded"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="ella-heading-section text-lg">
            {editingId ? "Edit class" : "Create a class"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetCreateForm}
              className={adminBtnGhost}
            >
              New class instead
            </button>
          )}
        </div>
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
          <label className="block">
            <span className="ella-label font-semibold">Program</span>
            <select
              required
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className={`${adminInput} mt-1`}
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
              className={`${adminInput} mt-1`}
            >
              <option value="">Select level</option>
              {ACADEMIC_LEVELS.map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="ella-label font-semibold">Course code</span>
            <input
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
              className={`${adminInput} mt-1 font-mono`}
              placeholder="e.g. BBA101"
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
              <option value="">Select campus</option>
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
        {editingId && (
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Class is active (visible to students)
          </label>
        )}
        <button
          type="submit"
          disabled={
            saving ||
            scheduleDays.length === 0 ||
            !lecturerId ||
            !program ||
            level === ""
          }
          className={`${adminBtnPrimary} mt-6 px-5 py-3`}
        >
          {saving ? "Saving…" : editingId ? "Save changes" : "Create class"}
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ella-list-panel">
          <div className="ella-list-panel-header">
            <h2 className="ella-heading-section text-lg">All classes</h2>
          </div>
          <div className="px-4 py-2">
            <input
              type="text"
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              placeholder="Search by title, code, or lecturer…"
              className={`${adminInput}`}
            />
          </div>
          <ul className="max-h-[380px] divide-y divide-[var(--ella-border)] overflow-y-auto">
            {filteredCourses.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[var(--ella-fg-muted)]">
                {courseSearch ? "No classes match your search." : "No classes yet."}
              </li>
            ) : (
              filteredCourses.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => void loadCourseDetail(c.id)}
                    className={`ella-list-item ${
                      selectedId === c.id ? "ella-list-item-active" : ""
                    }`}
                  >
                    <p className="font-semibold text-[var(--ella-fg)]">
                      {c.courseCode ? (
                        <span className="font-mono text-[var(--ella-fg-subtle)]">
                          {c.courseCode}{" "}
                        </span>
                      ) : null}
                      {c.title}
                    </p>
                    <p className="ella-text-muted text-sm">
                      {c.programLabel} · Level {c.level} · {c.lecturerName} ·{" "}
                      {c.enrolledCount} students
                    </p>
                    {c.isActiveNow && (
                      <span className="text-xs font-semibold text-[var(--ella-accent-hover)]">
                        Active now
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-4">
          {selectedId ? (
            <>
              <div className="ella-card-padded">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="ella-heading-section">Assigned students</h3>
                  <button
                    type="button"
                    onClick={() => void duplicateCourse(selectedId)}
                    className={adminBtnGhost}
                  >
                    Duplicate class
                  </button>
                </div>
                {eligibleMeta && (
                  <p className="ella-text-muted mt-2 text-sm">
                    Auto-assigned: {eligibleMeta.programLabel},{" "}
                    {eligibleMeta.levelLabel} ({eligibleStudents.length} students)
                  </p>
                )}
                <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto text-sm">
                  {eligibleStudents.length === 0 ? (
                    <li className="ella-text-muted">
                      No students with this program and level yet. Add them under
                      Students & staff.
                    </li>
                  ) : (
                    eligibleStudents.map((s) => (
                      <li
                        key={s.id}
                        className="ella-panel-muted px-3 py-2"
                      >
                        {s.name}{" "}
                        <span className="font-mono text-[var(--ella-fg-subtle)]">
                          {s.studentId}
                        </span>
                      </li>
                    ))
                  )}
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
                          <th scope="col">Student</th>
                          <th scope="col">%</th>
                          <th scope="col">Late</th>
                          <th scope="col">Missed</th>
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
              Select a class to view assigned students and attendance statistics.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
