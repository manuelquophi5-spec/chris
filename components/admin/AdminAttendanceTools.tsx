"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import type { AttendanceAlert } from "@/types";

export function AdminAttendanceTools() {
  const tzOffset = new Date().getTimezoneOffset();
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [dayKey, setDayKey] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    const res = await authFetch(
      `/api/attendance/alerts?timezoneOffset=${tzOffset}`,
    );
    const data = await parseJsonResponse<{
      alerts?: AttendanceAlert[];
      dayKey?: string;
      error?: string;
    }>(res);
    if (res.ok) {
      setAlerts(data.alerts ?? []);
      setDayKey(data.dayKey ?? "");
    }
    setLoading(false);
  }, [tzOffset]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  function downloadCsv() {
    const url = `/api/attendance/export?timezoneOffset=${tzOffset}`;
    window.open(url, "_blank");
  }

  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Who came in today</h1>
        <p className="mt-1 text-base text-slate-600">
          Download a spreadsheet for payroll, or see who forgot to check in or out
          {dayKey ? ` (${dayKey})` : ""}.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Download spreadsheet (Excel)
        </button>
        <button
          type="button"
          onClick={() => void loadAlerts()}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh alerts
        </button>
      </div>

      {!loading && alerts.length > 0 && (
        <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            {alerts.length} alert{alerts.length === 1 ? "" : "s"} today
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {alerts.slice(0, 8).map((a) => (
              <li key={`${a.userId}-${a.type}`}>
                {a.name} ({a.employeeId}) —{" "}
                {a.type === "missing_checkin"
                  ? "never checked in"
                  : "checked in, no check-out"}
              </li>
            ))}
            {alerts.length > 8 && (
              <li className="text-amber-700">+{alerts.length - 8} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
