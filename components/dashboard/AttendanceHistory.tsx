"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import type { AttendanceType } from "@/types";

type CourseRef = { id: string; title: string; courseCode: string } | null;

type Row = {
  id: string;
  type: AttendanceType;
  dayKey: string;
  markedAt: string;
  distanceMeters: number;
  isLate: boolean;
  location: { name?: string } | null;
  course: CourseRef;
  user?: { name: string; email: string; studentId?: string };
};

type DayGroup = {
  groupKey: string;
  dayKey: string;
  label: string;
  classLabel: string;
  courseId: string | null;
  checkIn: Row | null;
  checkOut: Row | null;
  locationName: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayLabel(dayKey: string) {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (dayKey === localToday) return "Today";
  const d = new Date(`${dayKey}T12:00:00`);
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function classLabel(course: CourseRef): string {
  if (!course) return "Other";
  const code = course.courseCode ? `${course.courseCode} · ` : "";
  return `${code}${course.title}`;
}

function groupKeyFor(row: Row): string {
  const cid = row.course?.id ?? "campus";
  return `${row.dayKey || row.markedAt.slice(0, 10)}:${cid}`;
}

function groupByDayAndClass(rows: Row[]): DayGroup[] {
  const map = new Map<string, DayGroup>();

  for (const row of rows) {
    const key = groupKeyFor(row);
    const dayKey = row.dayKey || row.markedAt.slice(0, 10);
    if (!map.has(key)) {
      map.set(key, {
        groupKey: key,
        dayKey,
        label: dayLabel(dayKey),
        classLabel: classLabel(row.course),
        courseId: row.course?.id ?? null,
        checkIn: null,
        checkOut: null,
        locationName: row.location?.name ?? "Unknown campus",
      });
    }
    const g = map.get(key)!;
    if (row.type === "check_out") {
      g.checkOut = row;
    } else {
      g.checkIn = row;
    }
    if (row.location?.name) g.locationName = row.location.name;
  }

  return [...map.values()].sort((a, b) => b.dayKey.localeCompare(a.dayKey));
}

function HistorySkeleton() {
  return (
    <ul className="mt-4 space-y-2">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-20 animate-pulse rounded-xl bg-[var(--ella-surface-muted)]"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </ul>
  );
}

export function AttendanceHistory({ showUser = false }: { showUser?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const courseFilters = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) {
      if (r.course) {
        seen.set(r.course.id, classLabel(r.course));
      }
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "campus") return rows.filter((r) => !r.course);
    return rows.filter((r) => r.course?.id === filter);
  }, [rows, filter]);

  const days = useMemo(() => groupByDayAndClass(filteredRows), [filteredRows]);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch("/api/attendance?limit=100");
      if (!res.ok) {
        const text = await res.text();
        console.error("Attendance API Error:", res.status, text);
        setRows([]);
        return;
      }
      const data = await res.json();
      setRows(data.attendance ?? []);
    } catch (err) {
      console.error("Attendance fetch failed:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="ella-card-padded">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="ella-heading-section text-lg">History</h2>
          <p className="ella-text-muted mt-0.5">Past check-ins by class and campus</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="ella-btn-ghost min-h-[44px] rounded-xl bg-[var(--ella-accent-subtle)] text-[var(--ella-accent-hover)] disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`inline-flex min-h-[44px] items-center rounded-full px-3.5 text-xs font-semibold ${
            filter === "all"
              ? "bg-[var(--ella-accent-subtle)] text-[var(--ella-accent-hover)]"
              : "bg-[var(--ella-surface-muted)] text-[var(--ella-fg-muted)]"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter("campus")}
          className={`inline-flex min-h-[44px] items-center rounded-full px-3.5 text-xs font-semibold ${
            filter === "campus"
              ? "bg-[var(--ella-accent-subtle)] text-[var(--ella-accent-hover)]"
              : "bg-[var(--ella-surface-muted)] text-[var(--ella-fg-muted)]"
          }`}
        >
          Other
        </button>
        {courseFilters.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={`inline-flex min-h-[44px] items-center rounded-full px-3.5 text-xs font-semibold ${
              filter === c.id
                ? "bg-[var(--ella-accent-subtle)] text-[var(--ella-accent-hover)]"
                : "bg-[var(--ella-surface-muted)] text-[var(--ella-fg-muted)]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <HistorySkeleton />
      ) : days.length === 0 ? (
        <p className="ella-text-muted mt-6 text-center text-sm">
          No attendance records yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {days.map((day) => (
            <li
              key={day.groupKey}
              className="ella-panel-muted rounded-xl px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--ella-fg)]">
                    {day.label}
                  </p>
                  <p className="text-sm text-[var(--ella-accent-hover)]">
                    {day.classLabel}
                  </p>
                  <p className="ella-text-muted text-sm">{day.locationName}</p>
                </div>
                {day.checkIn?.isLate && (
                  <span className="ella-badge-warning text-xs">Late</span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[var(--ella-fg-subtle)]">In</span>
                  <p className="font-medium">
                    {day.checkIn ? formatTime(day.checkIn.markedAt) : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--ella-fg-subtle)]">Out</span>
                  <p className="font-medium">
                    {day.checkOut ? formatTime(day.checkOut.markedAt) : "—"}
                  </p>
                </div>
              </div>
              {showUser && day.checkIn?.user && (
                <p className="mt-2 text-xs text-[var(--ella-fg-subtle)]">
                  {day.checkIn.user.name}
                  {day.checkIn.user.studentId
                    ? ` · ${day.checkIn.user.studentId}`
                    : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
