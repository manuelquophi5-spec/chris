"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import { CourseAttendanceCard } from "./CourseAttendanceCard";
import { DailyAttendanceCard } from "./DailyAttendanceCard";
import type { TodayAttendanceStatus } from "@/types";

type Tab = "classes" | "campus" | "session";

type Props = { onUpdate?: () => void };

export function StudentAttendanceHub({ onUpdate }: Props) {
  const [today, setToday] = useState<TodayAttendanceStatus | null>(null);
  const [tab, setTab] = useState<Tab>("classes");

  const load = useCallback(async () => {
    const tz = new Date().getTimezoneOffset();
    const res = await authFetch(`/api/attendance/today?timezoneOffset=${tz}`);
    const data = await parseJsonResponse<
      TodayAttendanceStatus & { error?: string }
    >(res);
    if (res.ok) {
      setToday(data);
      if (!data.hasEnrollments) {
        setTab(data.hasActiveSessions ? "session" : "campus");
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const enrolled = Boolean(today?.hasEnrollments);
  const showSessionTab = Boolean(today?.hasActiveSessions);

  if (!enrolled) {
    if (today?.hasActiveSessions) {
      return (
        <DailyAttendanceCard attendanceMode="session" onUpdate={() => { void load(); onUpdate?.(); }} />
      );
    }
    return (
      <DailyAttendanceCard attendanceMode="daily" onUpdate={() => { void load(); onUpdate?.(); }} />
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "classes", label: "My classes" },
    { id: "campus", label: "Campus day" },
  ];
  if (showSessionTab) {
    tabs.push({ id: "session", label: "Special session" });
  }

  return (
    <div className="space-y-4">
      <div
        className="flex gap-1 rounded-xl border border-[var(--ella-border)] bg-[var(--ella-surface-muted)] p-1"
        role="tablist"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-[44px] flex-1 rounded-lg px-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "bg-[var(--ella-surface)] text-[var(--ella-fg)] shadow-sm"
                : "text-[var(--ella-fg-muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "classes" && (
        <CourseAttendanceCard
          onUpdate={() => {
            void load();
            onUpdate?.();
          }}
        />
      )}
      {tab === "campus" && (
        <>
          <p className="ella-text-muted text-sm">
            For field trips or activities outside your class timetable. This is
            separate from class attendance.
          </p>
          <DailyAttendanceCard
            attendanceMode="daily"
            onUpdate={() => {
              void load();
              onUpdate?.();
            }}
          />
        </>
      )}
      {tab === "session" && showSessionTab && (
        <>
          <p className="ella-text-muted text-sm">
            One-off session created by your school (exam, workshop, etc.).
          </p>
          <DailyAttendanceCard
            attendanceMode="session"
            onUpdate={() => {
              void load();
              onUpdate?.();
            }}
          />
        </>
      )}
    </div>
  );
}
