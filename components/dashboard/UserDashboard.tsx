"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { CourseAttendanceCard } from "./CourseAttendanceCard";

type Stats = {
  totalCheckIns: number;
  totalLate: number;
  uniqueDays: number;
  streak: number;
  perCourse: Array<{
    id: string;
    title: string;
    courseCode: string;
    checkIns: number;
    lates: number;
    days: number;
    attendanceRate: number;
  }>;
};

function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-xl bg-[var(--ella-surface-muted)] h-16" />
  );
}

export function UserDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/attendance/stats")
      .then((r) => r.json())
      .then((d) => { if (d.stats) setStats(d.stats); })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <CourseAttendanceCard />

      {statsLoading ? (
        <div className="ella-card-padded space-y-3">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      ) : stats ? (
        <div className="ella-card-padded space-y-4">
          <h2 className="ella-heading-section text-lg">Your attendance</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-[var(--ella-surface-muted)] px-3 py-3 text-center">
              <p className="text-2xl font-bold text-[var(--ella-fg)]">{stats.totalCheckIns}</p>
              <p className="text-xs text-[var(--ella-fg-muted)] mt-1">Check-ins</p>
            </div>
            <div className="rounded-xl bg-[var(--ella-surface-muted)] px-3 py-3 text-center">
              <p className="text-2xl font-bold text-[var(--ella-fg)]">{stats.uniqueDays}</p>
              <p className="text-xs text-[var(--ella-fg-muted)] mt-1">Days active</p>
            </div>
            <div className="rounded-xl bg-[var(--ella-surface-muted)] px-3 py-3 text-center">
              <p className={`text-2xl font-bold ${stats.totalLate > 0 ? "text-[var(--ella-warning)]" : "text-[var(--ella-fg)]"}`}>{stats.totalLate}</p>
              <p className="text-xs text-[var(--ella-fg-muted)] mt-1">Late</p>
            </div>
            <div className="rounded-xl bg-[var(--ella-surface-muted)] px-3 py-3 text-center">
              <p className="text-2xl font-bold text-[var(--ella-accent-hover)]">{stats.streak}</p>
              <p className="text-xs text-[var(--ella-fg-muted)] mt-1">Day streak 🔥</p>
            </div>
          </div>

          {stats.perCourse.length > 0 && (
            <div className="mt-2 space-y-2">
              {stats.perCourse.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg bg-[var(--ella-surface-muted)] px-3 py-2.5"
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
                    className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      c.attendanceRate >= 90
                        ? "bg-green-100 text-green-700"
                        : c.attendanceRate >= 70
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {c.attendanceRate}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
