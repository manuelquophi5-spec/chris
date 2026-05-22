"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import type { AttendanceAlert } from "@/types";
import { adminBtnPrimary, adminBtnSecondary } from "./admin-ui";

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
        <h1 className="ella-heading-page">Who came in today</h1>
        <p className="ella-text-muted mt-1">
          Download a spreadsheet for payroll, or see who forgot to check in or out
          {dayKey ? ` (${dayKey})` : ""}.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={downloadCsv} className={adminBtnPrimary}>
          Download spreadsheet (Excel)
        </button>
        <button
          type="button"
          onClick={() => void loadAlerts()}
          className={adminBtnSecondary}
        >
          Refresh alerts
        </button>
      </div>

      {!loading && alerts.length > 0 && (
        <div className="ella-alert-warning w-full">
          <p className="font-semibold">
            {alerts.length} alert{alerts.length === 1 ? "" : "s"} today
          </p>
          <ul className="mt-2 space-y-1">
            {alerts.slice(0, 8).map((a) => (
              <li key={`${a.userId}-${a.type}`}>
                {a.name} ({a.employeeId}) —{" "}
                {a.type === "missing_checkin"
                  ? "never checked in"
                  : "checked in, no check-out"}
              </li>
            ))}
            {alerts.length > 8 && (
              <li className="opacity-80">+{alerts.length - 8} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
