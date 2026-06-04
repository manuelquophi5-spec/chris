"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import type { AttendanceAlert } from "@/types";
import { adminBtnPrimary, adminBtnSecondary } from "./admin-ui";

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 27);
  return d.toISOString().slice(0, 10);
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminAttendanceTools() {
  const tzOffset = new Date().getTimezoneOffset();
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [dayKey, setDayKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

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

  function downloadExport(format: "xlsx" | "csv") {
    const params = new URLSearchParams({
      timezoneOffset: String(tzOffset),
      format,
    });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.open(`/api/attendance/export?${params.toString()}`, "_blank");
  }

  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="ella-heading-page">Who came in today</h1>
        <p className="ella-text-muted mt-1">
          Download attendance as Excel, or see who forgot to check in or out
          {dayKey ? ` (${dayKey})` : ""}.
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-2 sm:w-auto">
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs">
            <span className="ella-label">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="ella-input mt-1"
            />
          </label>
          <label className="block text-xs">
            <span className="ella-label">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="ella-input mt-1"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadExport("xlsx")}
            className={adminBtnPrimary}
          >
            Download Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => downloadExport("csv")}
            className={adminBtnSecondary}
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => void loadAlerts()}
            className={adminBtnSecondary}
          >
            Refresh alerts
          </button>
        </div>
      </div>

      {!loading && alerts.length > 0 && (
        <div className="ella-alert-warning w-full">
          <p className="font-semibold">
            {alerts.length} alert{alerts.length === 1 ? "" : "s"} today
          </p>
          <ul className="mt-2 space-y-1">
            {alerts.slice(0, 8).map((a) => (
              <li key={`${a.userId}-${a.type}`}>
                {a.name} ({a.studentId}) —{" "}
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
