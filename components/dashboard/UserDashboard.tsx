"use client";

import { CourseAttendanceCard } from "./CourseAttendanceCard";
import type { TodayAttendanceStatus, UserAttendanceStats } from "@/types";

type Props = {
  initialToday: TodayAttendanceStatus;
  initialStats: UserAttendanceStats | null;
};

export function UserDashboard({ initialToday, initialStats }: Props) {
  const stats = initialStats;

  return (
    <div className="space-y-6">
      <CourseAttendanceCard initialToday={initialToday} />

      {stats ? (
        <div className="space-y-4">
          <div>
            <h2 className="ella-heading-section text-lg">Your attendance</h2>
            <div className="ella-stat-row mt-3">
              <div className="ella-stat-cell">
                <p className="ella-stat-label">Check-ins</p>
                <p className="ella-stat-value">{stats.totalCheckIns}</p>
              </div>
              <div className="ella-stat-cell">
                <p className="ella-stat-label">Days active</p>
                <p className="ella-stat-value">{stats.uniqueDays}</p>
              </div>
              <div className="ella-stat-cell">
                <p className="ella-stat-label">Late</p>
                <p
                  className={`ella-stat-value ${stats.totalLate > 0 ? "text-[var(--ella-warning)]" : ""}`}
                >
                  {stats.totalLate}
                </p>
              </div>
            </div>
          </div>

          {stats.perCourse.length > 0 && (
            <ul className="space-y-2">
              {stats.perCourse.map((c) => (
                <li
                  key={c.id}
                  className="ella-panel-muted flex items-center justify-between px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--ella-fg)]">
                      {c.courseCode ? (
                        <span className="font-mono text-[var(--ella-fg-subtle)]">{c.courseCode} </span>
                      ) : null}
                      {c.title}
                    </p>
                    <p className="text-xs text-[var(--ella-fg-muted)]">
                      {c.checkIns} check-ins · {c.lates} late
                    </p>
                  </div>
                  <span
                    className={`ml-3 shrink-0 ${
                      c.attendanceRate >= 90
                        ? "ella-chip-success"
                        : c.attendanceRate >= 70
                          ? "ella-chip-warning"
                          : "ella-chip-danger"
                    }`}
                  >
                    {c.attendanceRate}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
