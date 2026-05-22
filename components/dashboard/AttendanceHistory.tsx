"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import type { AttendanceType } from "@/types";

type Row = {
  id: string;
  type: AttendanceType;
  dayKey: string;
  markedAt: string;
  distanceMeters: number;
  location: { name?: string } | null;
  user?: { name: string; email: string; employeeId?: string };
};

type DayGroup = {
  dayKey: string;
  label: string;
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

function groupByDay(rows: Row[]): DayGroup[] {
  const map = new Map<string, DayGroup>();

  for (const row of rows) {
    const key = row.dayKey || row.markedAt.slice(0, 10);
    if (!map.has(key)) {
      map.set(key, {
        dayKey: key,
        label: dayLabel(key),
        checkIn: null,
        checkOut: null,
        locationName: row.location?.name ?? "Unknown site",
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

  const days = useMemo(() => groupByDay(rows), [rows]);

  function load() {
    setLoading(true);
    authFetch("/api/attendance?limit=60")
      .then((r) => r.json())
      .then((data) => setRows(data.attendance ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="ella-card-padded">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="ella-heading-section text-lg">History</h2>
          <p className="ella-text-muted mt-0.5">Your past check-ins</p>
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

      {loading ? (
        <HistorySkeleton />
      ) : days.length === 0 ? (
        <div className="animate-fade-in mt-8 text-center">
          <p className="text-sm font-medium text-[var(--ella-fg-muted)]">
            No attendance yet
          </p>
          <p className="mt-1 text-xs text-[var(--ella-fg-subtle)]">
            Check in from Home when you arrive on site
          </p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-[var(--ella-border)] rounded-xl border border-[var(--ella-border)] bg-[var(--ella-surface)]">
          {days.map((day, index) => (
            <li
              key={day.dayKey}
              className="animate-slide-up px-4 py-3.5"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--ella-fg)]">
                    {day.label}
                  </p>
                  <p className="text-xs text-[var(--ella-fg-subtle)]">
                    {day.locationName}
                  </p>
                </div>
                {day.checkIn && day.checkOut ? (
                  <span className="ella-badge ella-badge-complete">Complete</span>
                ) : day.checkIn ? (
                  <span className="ella-badge ella-badge-open">Open</span>
                ) : null}
              </div>
              <p className="mt-2 text-sm tabular-nums text-[var(--ella-fg-muted)]">
                <span className="text-[var(--ella-fg-subtle)]">In </span>
                {day.checkIn ? formatTime(day.checkIn.markedAt) : "—"}
                <span className="mx-2 text-[var(--ella-border-strong)]">·</span>
                <span className="text-[var(--ella-fg-subtle)]">Out </span>
                {day.checkOut ? formatTime(day.checkOut.markedAt) : "—"}
              </p>
              {showUser && day.checkIn?.user && (
                <p className="mt-1.5 text-xs text-[var(--ella-fg-muted)]">
                  {day.checkIn.user.name}
                  {day.checkIn.user.employeeId
                    ? ` · ${day.checkIn.user.employeeId}`
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
