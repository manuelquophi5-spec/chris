"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import {
  geolocationErrorMessage,
  getDevicePosition,
  type GeoErrorCode,
} from "@/lib/geolocation";
import type { AttendanceType, TodayAttendanceStatus } from "@/types";

const selectClass =
  "mt-2 w-full min-h-[52px] rounded-2xl border border-slate-200/80 bg-white px-4 text-base text-slate-900 shadow-inner transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25";

type Props = { onUpdate?: () => void };

export function CourseAttendanceCard({ onUpdate }: Props) {
  const [today, setToday] = useState<TodayAttendanceStatus | null>(null);
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<AttendanceType | null>(null);

  const tzOffset = new Date().getTimezoneOffset();

  const loadToday = useCallback(async () => {
    const res = await authFetch(
      `/api/attendance/today?timezoneOffset=${tzOffset}`,
    );
    const data = await parseJsonResponse<
      TodayAttendanceStatus & { error?: string }
    >(res);
    if (res.ok) {
      setToday(data);
      const active = data.activeCourses?.filter((c) => c.window.active) ?? [];
      const pick =
        active.find((c) => c.canCheckIn || c.canCheckOut) ?? active[0];
      if (pick) setCourseId(pick.id);
    }
  }, [tzOffset]);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  const courses = today?.activeCourses ?? [];
  const selected = courses.find((c) => c.id === courseId);

  async function mark(type: AttendanceType) {
    if (!courseId || !selected) {
      setError("Select a class that is active right now.");
      return;
    }
    if (!selected.window.active) {
      setError(selected.window.reason ?? "This class is not active right now.");
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(type);

    try {
      const pos = await getDevicePosition();
      const res = await authFetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          type,
          courseId,
          timezoneOffset: tzOffset,
          locationId: selected.locationId ?? undefined,
        }),
      });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(
        res,
      );
      if (!res.ok) {
        setError(data.error ?? "Could not mark attendance");
        return;
      }
      setMessage(data.message ?? "Recorded");
      await loadToday();
      onUpdate?.();
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err.code as GeoErrorCode)
          : "unknown";
      setError(geolocationErrorMessage(code));
    } finally {
      setLoading(null);
    }
  }

  if (!today?.hasEnrollments) {
    return (
      <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
        No classes assigned yet. Ask your administrator to enroll you.
      </p>
    );
  }

  const inactive = courses.filter((c) => !c.window.active);
  const active = courses.filter((c) => c.window.active);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Select the class you are attending. Attendance is only allowed during the
        scheduled time.
      </p>

      {active.length === 0 ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No class is active right now.
          {inactive[0]?.window.reason
            ? ` ${inactive[0].window.reason}`
            : " Check your timetable."}
        </p>
      ) : (
        <>
          <label className="block text-sm font-medium text-slate-700">
            Class in session
          </label>
          <select
            className={selectClass}
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            {active.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.startTime}–{c.endTime})
                {c.hasCheckIn ? " — checked in" : ""}
              </option>
            ))}
          </select>

          {selected && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Today:</span>{" "}
                {selected.window.active ? "Active now" : selected.window.reason}
              </p>
              {selected.locationName && (
                <p className="mt-1">
                  <span className="font-semibold">Campus:</span>{" "}
                  {selected.locationName}
                </p>
              )}
              {selected.isLateNext && !selected.hasCheckIn && (
                <p className="mt-2 text-amber-800">
                  You are past the on-time window — check-in will count as late.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!selected?.canCheckIn || loading !== null}
              onClick={() => void mark("check_in")}
              className="min-h-[52px] rounded-2xl bg-emerald-600 px-4 text-base font-semibold text-white disabled:opacity-50"
            >
              {loading === "check_in" ? "Checking in…" : "Check in to class"}
            </button>
            <button
              type="button"
              disabled={!selected?.canCheckOut || loading !== null}
              onClick={() => void mark("check_out")}
              className="min-h-[52px] rounded-2xl border-2 border-slate-300 bg-white px-4 text-base font-semibold text-slate-800 disabled:opacity-50"
            >
              {loading === "check_out" ? "Checking out…" : "Check out of class"}
            </button>
          </div>
        </>
      )}

      {inactive.length > 0 && active.length > 0 && (
        <details className="text-sm text-slate-500">
          <summary className="cursor-pointer font-medium">
            Other enrolled classes (not active now)
          </summary>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {inactive.map((c) => (
              <li key={c.id}>
                {c.title}: {c.window.reason ?? "Not scheduled now"}
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          {message}
        </p>
      )}
    </div>
  );
}
