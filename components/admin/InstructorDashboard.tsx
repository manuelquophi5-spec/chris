"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import type { CourseRow, CourseStatsSummary } from "@/types";
import { adminStack } from "./admin-ui";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authFetch("/api/instructor/overview");
    const data = await parseJsonResponse<Overview & { error?: string }>(res);
    if (res.ok) setOverview(data);
    else setError(data.error ?? "Could not load classes");
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

  return (
    <div className={adminStack}>
      <div>
        <h1 className="ella-heading-page">My classes</h1>
        <p className="ella-text-muted mt-2">
          Classes you teach, enrolled students, and attendance summaries.
        </p>
      </div>

      <AdminHelpCard title="Lecturer quick guide">
        <p>Students mark attendance only during the scheduled class time.</p>
        <p>Late check-ins are recorded after the grace period set by admin.</p>
      </AdminHelpCard>

      {error && <p className="ella-alert-error">{error}</p>}

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
