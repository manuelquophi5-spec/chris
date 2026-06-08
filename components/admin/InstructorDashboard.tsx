"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import type { CourseRow, CourseStatsSummary, CourseTodayRoster } from "@/types";
import { adminBtnPrimary, adminBtnSecondary, adminInput, adminStack } from "./admin-ui";
import { AdminHelpCard } from "./AdminHelpCard";

type Overview = {
  lecturerName: string;
  courses: Array<{
    course: CourseRow;
    enrolledCount: number;
    averageAttendance: number;
  }>;
};

export function InstructorDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [stats, setStats] = useState<CourseStatsSummary | null>(null);
  const [todayRoster, setTodayRoster] = useState<CourseTodayRoster | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 27);
    return d.toISOString().slice(0, 10);
  });
  const [exportTo, setExportTo] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const selectedCourse = useMemo(
    () => overview?.courses.find((c) => c.course.id === selectedId)?.course ?? null,
    [overview, selectedId],
  );

  const loadOverview = useCallback(async () => {
    const res = await authFetch("/api/instructor/overview");
    const data = await parseJsonResponse<Overview & { error?: string }>(res);
    if (res.ok) setOverview(data);
    else setError(data.error ?? "Could not load classes");
    return data;
  }, []);

  const loadCourseDetail = useCallback(async (courseId: string) => {
    const tz = new Date().getTimezoneOffset();
    const [statsRes, todayRes] = await Promise.all([
      authFetch(
        `/api/admin/courses/${courseId}/stats?from=${defaultFrom()}&to=${defaultTo()}`,
      ),
      authFetch(
        `/api/instructor/today?timezoneOffset=${tz}&courseId=${courseId}`,
      ),
    ]);
    const statsData = await parseJsonResponse<{
      stats?: CourseStatsSummary;
      error?: string;
    }>(statsRes);
    const todayData = await parseJsonResponse<{
      rosters?: CourseTodayRoster[];
      error?: string;
    }>(todayRes);
    if (statsRes.ok) setStats(statsData.stats ?? null);
    else setError(statsData.error ?? "Could not load attendance");
    if (todayRes.ok) setTodayRoster(todayData.rosters?.[0] ?? null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await loadOverview();
    setLoading(false);
  }, [loadOverview]);

  useEffect(() => {
    void load();
  }, [load]);

  async function selectCourse(courseId: string) {
    setSelectedId(courseId);
    setError(null);
    await loadCourseDetail(courseId);
  }

  function defaultFrom() {
    const d = new Date();
    d.setDate(d.getDate() - 27);
    return d.toISOString().slice(0, 10);
  }

  function defaultTo() {
    return new Date().toISOString().slice(0, 10);
  }

  function downloadExport(format: "xlsx" | "csv") {
    if (!selectedId) return;
    const tz = new Date().getTimezoneOffset();
    const params = new URLSearchParams({
      timezoneOffset: String(tz),
      format,
      from: exportFrom,
      to: exportTo,
      courseId: selectedId,
    });
    window.open(`/api/attendance/export?${params.toString()}`, "_blank");
  }

  return (
    <div className={adminStack}>
      <div>
        <h1 className="ella-heading-page">My classes</h1>
        <p className="ella-text-muted mt-2">
          Select a class to manage attendance, view assigned students, and export
          records.
        </p>
      </div>

      <AdminHelpCard title="Lecturer quick guide">
        <p>Students are assigned automatically by program and level.</p>
        <p>Check-in during class time at the campus geofence; check-out same day.</p>
      </AdminHelpCard>

      {error && <p className="ella-alert-error">{error}</p>}

      {loading ? (
        <p className="text-[var(--ella-fg-muted)]">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="ella-list-panel">
            <div className="ella-list-panel-header">
              <h2 className="ella-heading-section text-lg">Your courses</h2>
            </div>
            <ul className="divide-y divide-[var(--ella-border)]">
              {(overview?.courses ?? []).length === 0 ? (
                <li className="px-5 py-8 text-sm text-[var(--ella-fg-subtle)]">
                  No classes assigned yet. Ask an administrator to assign you as
                  lecturer on a class.
                </li>
              ) : (
                overview?.courses.map(({ course, enrolledCount, averageAttendance }) => (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => void selectCourse(course.id)}
                      className={`ella-list-item ${
                        selectedId === course.id ? "ella-list-item-active" : ""
                      }`}
                    >
                      <p className="font-semibold text-[var(--ella-fg)]">
                        {course.courseCode ? (
                          <span className="font-mono text-[var(--ella-fg-subtle)]">
                            {course.courseCode}{" "}
                          </span>
                        ) : null}
                        {course.title}
                      </p>
                      <p className="ella-text-muted mt-1 text-sm">
                        {course.programLabel} · Level {course.level} ·{" "}
                        {course.startTime}–{course.endTime}
                      </p>
                      <p className="ella-text-muted text-sm">
                        {enrolledCount} students · avg {averageAttendance}% attendance
                      </p>
                      {course.isActiveNow && (
                        <span className="ella-chip-success mt-2">In session</span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="space-y-4">
            {!selectedCourse ? (
              <p className="ella-panel-muted border-dashed p-8 text-center text-sm text-[var(--ella-fg-subtle)]">
                Select a class from the list to manage attendance and view students.
              </p>
            ) : (
              <>
                <div className="ella-card-padded">
                  <h2 className="ella-heading-section text-lg">
                    {selectedCourse.title}
                  </h2>
                  <p className="ella-text-muted mt-1 text-sm">
                    {selectedCourse.programLabel} · Level {selectedCourse.level} ·{" "}
                    {selectedCourse.startTime}–{selectedCourse.endTime}
                  </p>
                </div>

                <div className="ella-card-padded">
                  <h3 className="ella-heading-section">Today&apos;s roster</h3>
                  {!todayRoster ? (
                    <p className="ella-text-muted mt-2 text-sm">Loading…</p>
                  ) : todayRoster.students.length === 0 ? (
                    <p className="ella-text-muted mt-2 text-sm">
                      No students with this program and level yet.
                    </p>
                  ) : (
                    <div className="ella-table-wrap mt-3">
                      <table className="ella-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>ID</th>
                            <th>Today</th>
                          </tr>
                        </thead>
                        <tbody>
                          {todayRoster.students.map((s) => (
                            <tr key={s.userId}>
                              <td className="ella-table-primary">{s.name}</td>
                              <td className="font-mono text-xs">{s.studentId}</td>
                              <td>
                                {!s.checkedIn
                                  ? "—"
                                  : s.checkedOut
                                    ? s.isLate
                                      ? "In & out (late)"
                                      : "In & out"
                                    : s.isLate
                                      ? "Checked in (late)"
                                      : "Checked in"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="ella-card-padded">
                  <h3 className="ella-heading-section">Attendance by student</h3>
                  {!stats ? (
                    <p className="ella-text-muted mt-2 text-sm">Loading…</p>
                  ) : (
                    <>
                      <p className="ella-text-muted mt-1 text-sm">
                        Last ~4 weeks ({stats.expectedSessions} expected sessions)
                      </p>
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
                            {stats.students.map((s) => (
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
                    </>
                  )}
                </div>

                <div className="ella-card-padded">
                  <h3 className="ella-heading-section">Export this class</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="ella-label">From</span>
                      <input
                        type="date"
                        value={exportFrom}
                        onChange={(e) => setExportFrom(e.target.value)}
                        className={`${adminInput} mt-1`}
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="ella-label">To</span>
                      <input
                        type="date"
                        value={exportTo}
                        onChange={(e) => setExportTo(e.target.value)}
                        className={`${adminInput} mt-1`}
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => downloadExport("xlsx")}
                      className={adminBtnPrimary}
                    >
                      Download Excel (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadExport("csv")}
                      className={adminBtnSecondary}
                    >
                      Download CSV
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
