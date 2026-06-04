"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [todayRosters, setTodayRosters] = useState<CourseTodayRoster[]>([]);
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
  const [exportCourseId, setExportCourseId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const tz = new Date().getTimezoneOffset();
    const [overviewRes, todayRes] = await Promise.all([
      authFetch("/api/instructor/overview"),
      authFetch(`/api/instructor/today?timezoneOffset=${tz}`),
    ]);
    const data = await parseJsonResponse<Overview & { error?: string }>(
      overviewRes,
    );
    const todayData = await parseJsonResponse<{
      error?: string;
      rosters?: CourseTodayRoster[];
    }>(todayRes);
    if (overviewRes.ok) setOverview(data);
    else setError(data.error ?? "Could not load classes");
    if (todayRes.ok) setTodayRosters(todayData.rosters ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadStats(courseId: string) {
    setSelectedId(courseId);
    const res = await authFetch(
      `/api/admin/courses/${courseId}/stats?from=${defaultFrom()}&to=${defaultTo()}`,
    );
    const data = await parseJsonResponse<{ stats?: CourseStatsSummary; error?: string }>(
      res,
    );
    if (res.ok) setStats(data.stats ?? null);
    else setError(data.error ?? "Could not load attendance");
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
    const tz = new Date().getTimezoneOffset();
    const params = new URLSearchParams({
      timezoneOffset: String(tz),
      format,
      from: exportFrom,
      to: exportTo,
    });
    if (exportCourseId) params.set("courseId", exportCourseId);
    window.open(`/api/attendance/export?${params.toString()}`, "_blank");
  }

  return (
    <div className={adminStack}>
      <div>
        <h1 className="ella-heading-page">My classes</h1>
        <p className="ella-text-muted mt-2">
          Classes you teach, enrolled students, and attendance summaries.
        </p>
      </div>

      <AdminHelpCard title="Lecturer quick guide">
        <p>Students check in during class time at the campus geofence.</p>
        <p>They can check out later the same day after class ends.</p>
        <p>Late check-ins are recorded after the grace period set by admin.</p>
      </AdminHelpCard>

      {error && <p className="ella-alert-error">{error}</p>}

      <div className="ella-card-padded">
        <h2 className="ella-heading-section text-lg">Export attendance</h2>
        <p className="ella-text-muted mt-1 text-sm">
          Download Excel for your classes (all or one class).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
          <label className="block text-sm sm:col-span-2">
            <span className="ella-label">Class (optional)</span>
            <select
              value={exportCourseId}
              onChange={(e) => setExportCourseId(e.target.value)}
              className={`${adminInput} mt-1`}
            >
              <option value="">All my classes</option>
              {(overview?.courses ?? []).map(({ course }) => (
                <option key={course.id} value={course.id}>
                  {course.courseCode ? `${course.courseCode} · ` : ""}
                  {course.title}
                </option>
              ))}
            </select>
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

      {!loading && todayRosters.length > 0 && (
        <div className="ella-card-padded space-y-6">
          <h2 className="ella-heading-section text-lg">Today&apos;s roster</h2>
          {todayRosters.map((roster) => {
            const present = roster.students.filter((s) => s.checkedIn).length;
            return (
              <div key={roster.courseId}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[var(--ella-fg)]">
                    {roster.courseCode ? (
                      <span className="font-mono text-[var(--ella-fg-subtle)]">
                        {roster.courseCode}{" "}
                      </span>
                    ) : null}
                    {roster.title}
                  </h3>
                  {roster.isActiveNow && (
                    <span className="ella-chip-success">In session</span>
                  )}
                  <span className="ella-text-muted text-sm">
                    {present}/{roster.students.length} checked in today
                  </span>
                </div>
                {roster.students.length === 0 ? (
                  <p className="ella-text-muted mt-2 text-sm">No students enrolled.</p>
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
                        {roster.students.map((s) => (
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
            );
          })}
        </div>
      )}

      {loading ? (
        <p className="text-[var(--ella-fg-muted)]">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="ella-list-panel">
            <div className="ella-list-panel-header">
              <h2 className="ella-heading-section text-lg">Your courses</h2>
            </div>
            <ul className="divide-y divide-[var(--ella-border)]">
              {(overview?.courses ?? []).length === 0 ? (
                <li className="px-5 py-8 text-sm text-[var(--ella-fg-subtle)]">
                  No classes assigned yet. Ask an administrator to add you as lecturer.
                </li>
              ) : (
                overview?.courses.map(({ course, enrolledCount, averageAttendance }) => (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => void loadStats(course.id)}
                      className={`ella-list-item ${
                        selectedId === course.id ? "ella-list-item-active" : ""
                      }`}
                    >
                      <p className="font-semibold text-[var(--ella-fg)]">{course.title}</p>
                      <p className="ella-text-muted mt-1 text-sm">
                        {course.startTime}–{course.endTime} · {enrolledCount} students ·
                        avg {averageAttendance}% attendance
                      </p>
                      {course.isActiveNow && (
                        <span className="ella-chip-success mt-2">Active now</span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="ella-card-padded">
            <h2 className="ella-heading-section text-lg">Attendance by student</h2>
            {!stats ? (
              <p className="ella-text-muted mt-4">
                Select a class to see who attended, missed sessions, and late arrivals.
              </p>
            ) : (
              <div className="mt-4">
                <p className="ella-text-muted">
                  {stats.title} — last ~4 weeks ({stats.expectedSessions} expected sessions)
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
