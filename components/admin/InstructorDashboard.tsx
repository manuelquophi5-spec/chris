"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import type { CourseRow, CourseStatsSummary } from "@/types";
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My classes</h1>
        <p className="mt-2 text-base text-slate-600">
          Classes you teach, enrolled students, and attendance summaries.
        </p>
      </div>

      <AdminHelpCard title="Lecturer quick guide">
        <p>Students mark attendance only during the scheduled class time.</p>
        <p>Late check-ins are recorded after the grace period set by admin.</p>
      </AdminHelpCard>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Your courses</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {(overview?.courses ?? []).length === 0 ? (
                <li className="px-5 py-8 text-sm text-slate-500">
                  No classes assigned yet. Ask an administrator to add you as lecturer.
                </li>
              ) : (
                overview?.courses.map(({ course, enrolledCount, averageAttendance }) => (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => void loadStats(course.id)}
                      className={`w-full px-5 py-4 text-left hover:bg-slate-50 ${
                        selectedId === course.id ? "bg-emerald-50" : ""
                      }`}
                    >
                      <p className="font-semibold text-slate-900">{course.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {course.startTime}–{course.endTime} · {enrolledCount} students ·
                        avg {averageAttendance}% attendance
                      </p>
                      {course.isActiveNow && (
                        <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          Active now
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Attendance by student</h2>
            {!stats ? (
              <p className="mt-4 text-sm text-slate-500">
                Select a class to see who attended, missed sessions, and late arrivals.
              </p>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-slate-600">
                  {stats.title} — last ~4 weeks ({stats.expectedSessions} expected sessions)
                </p>
                <table className="mt-4 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-slate-500">
                      <th className="py-2 pr-2">Student</th>
                      <th className="py-2 pr-2">%</th>
                      <th className="py-2 pr-2">Late</th>
                      <th className="py-2">Missed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.students.map((s) => (
                      <tr key={s.userId} className="border-b border-slate-50">
                        <td className="py-2 pr-2 font-medium">{s.name}</td>
                        <td className="py-2 pr-2">{s.attendancePercent}%</td>
                        <td className="py-2 pr-2">{s.lateSessions}</td>
                        <td className="py-2">{s.missedSessions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
