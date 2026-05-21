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
    <ul className="mt-4 space-y-3">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-28 animate-pulse rounded-3xl bg-slate-100"
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
    <section className="mobile-card rounded-3xl border border-slate-200/80 bg-white p-5 shadow-md shadow-slate-200/50">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">History</h2>
          <p className="mt-0.5 text-sm text-slate-500">Your past check-ins</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="min-h-[44px] shrink-0 rounded-2xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition active:scale-95 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <HistorySkeleton />
      ) : days.length === 0 ? (
        <div className="animate-fade-in mt-8 text-center">
          <p className="text-4xl">📋</p>
          <p className="mt-3 text-sm font-medium text-slate-600">
            No attendance yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Check in from the Home tab when you arrive
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {days.map((day, index) => (
            <li
              key={day.dayKey}
              className="animate-slide-up rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{day.label}</p>
                {day.checkIn && day.checkOut ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                    Complete
                  </span>
                ) : day.checkIn ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                    Open
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{day.locationName}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    In
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {day.checkIn ? formatTime(day.checkIn.markedAt) : "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Out
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {day.checkOut ? formatTime(day.checkOut.markedAt) : "—"}
                  </p>
                </div>
              </div>
              {showUser && day.checkIn?.user && (
                <p className="mt-2 text-xs text-slate-600">
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
