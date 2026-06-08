"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import {
  geolocationErrorMessage,
  getDevicePosition,
  type GeoErrorCode,
} from "@/lib/geolocation";
import type { ActiveCourseSummary, AttendanceType, TodayAttendanceStatus } from "@/types";

const selectClass = "ella-select mt-2";

type Props = { onUpdate?: () => void };

function courseLabel(c: ActiveCourseSummary): string {
  const code = c.courseCode ? `${c.courseCode} · ` : "";
  return `${code}${c.title} (${c.startTime}–${c.endTime})`;
}

function courseStatusLabel(c: ActiveCourseSummary): string {
  if (c.window.active && !c.hasCheckIn) return "In session";
  if (c.hasCheckIn && !c.hasCheckOut) return "Check out pending";
  if (c.hasCheckIn && c.hasCheckOut) return "Done today";
  return "Not active";
}

function pickDefaultCourse(courses: ActiveCourseSummary[]): string | null {
  if (courses.length === 0) return null;
  const active = courses.filter((c) => c.window.active);
  const needingCheckout = courses.filter((c) => c.canCheckOut);
  const pick =
    active.find((c) => c.canCheckIn || c.canCheckOut) ??
    needingCheckout[0] ??
    active[0] ??
    courses[0];
  return pick?.id ?? null;
}

export function CourseAttendanceCard({ onUpdate }: Props) {
  const [today, setToday] = useState<TodayAttendanceStatus | null>(null);
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<AttendanceType | null>(null);

  const tzOffset = new Date().getTimezoneOffset();

  const loadToday = useCallback(
    async (preferNextCheckout = false) => {
      const res = await authFetch(
        `/api/attendance/today?timezoneOffset=${tzOffset}`,
      );
      const data = await parseJsonResponse<
        TodayAttendanceStatus & { error?: string }
      >(res);
      if (res.ok) {
        setToday(data);
        const courses = data.activeCourses ?? [];
        setCourseId((prev) => {
          if (preferNextCheckout) {
            const needing = courses.find((c) => c.canCheckOut);
            if (needing) return needing.id;
          }
          if (prev && courses.some((c) => c.id === prev)) return prev;
          return pickDefaultCourse(courses) ?? "";
        });
      }
    },
    [tzOffset],
  );

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  const courses = today?.activeCourses ?? [];
  const selected = courses.find((c) => c.id === courseId);
  const activeNow = courses.filter((c) => c.window.active);
  const selectable = courses.filter(
    (c) => c.window.active || c.canCheckOut || c.canCheckIn,
  );

  async function mark(type: AttendanceType) {
    if (!courseId || !selected) {
      setError("Select a class.");
      return;
    }
    if (type === "check_in") {
      if (!selected.window.active) {
        setError(selected.window.reason ?? "This class is not active right now.");
        return;
      }
      if (!selected.canCheckIn) {
        setError("You already checked in for this class today.");
        return;
      }
    } else if (!selected.canCheckOut) {
      setError("Check in to this class first, or you already checked out.");
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
      await loadToday(true);
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
      <p className="ella-panel-muted px-4 py-3 text-sm text-[var(--ella-fg-muted)]">
        Your program and level are not set, or no classes match yet. Ask your
        administrator to add your program and level under Students & staff.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="ella-text-muted">
        Check in during class time at your campus. You can check out later the same
        day if class has ended.
      </p>

      {activeNow.length > 1 && (
        <p className="ella-alert-warning" role="status">
          {activeNow.length} classes in session — pick the class you are attending.
          Each class has its own check-in and check-out today.
        </p>
      )}

      {activeNow.length === 0 && !courses.some((c) => c.canCheckOut) && (
        <p className="ella-alert-warning">
          No class is in session right now. Use your timetable below for the next
          class time — check-in opens when class starts.
        </p>
      )}

      <label className="ella-label block">
        {activeNow.length > 0 ? "Class in session" : "Your class"}
      </label>
      <select
        className={selectClass}
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
      >
        {(selectable.length > 0 ? selectable : courses).map((c) => (
          <option key={c.id} value={c.id}>
            {courseLabel(c)}
            {c.window.active ? " — active" : ""}
            {c.hasCheckIn && !c.hasCheckOut ? " — check out pending" : ""}
            {c.hasCheckIn && c.hasCheckOut ? " — done today" : ""}
          </option>
        ))}
      </select>

      {selected && (
        <div className="ella-panel-muted space-y-1 px-4 py-3 text-sm text-[var(--ella-fg-muted)]">
          <p>
            <span className="font-semibold">Schedule:</span> {selected.scheduleLabel}
          </p>
          <p>
            <span className="font-semibold">Status:</span>{" "}
            {selected.window.active
              ? "Active now"
              : selected.nextClassHint ?? selected.window.reason}
          </p>
          {selected.locationName && (
            <p>
              <span className="font-semibold">Campus:</span> {selected.locationName}
            </p>
          )}
          {selected.hasCheckIn && !selected.hasCheckOut && !selected.window.active && (
            <p className="text-[var(--ella-warning)]">
              Class ended — you can still check out for today.
            </p>
          )}
          {selected.isLateNext && !selected.hasCheckIn && selected.window.active && (
            <p className="text-[var(--ella-warning)]">
              Past the on-time window — check-in will count as late.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={!selected?.canCheckIn || loading !== null}
          onClick={() => void mark("check_in")}
          className="ella-btn-primary min-h-[52px] disabled:opacity-50"
        >
          {loading === "check_in" ? "Checking in…" : "Check in to class"}
        </button>
        <button
          type="button"
          disabled={!selected?.canCheckOut || loading !== null}
          onClick={() => void mark("check_out")}
          className="ella-btn-secondary min-h-[52px] disabled:opacity-50"
        >
          {loading === "check_out" ? "Checking out…" : "Check out of class"}
        </button>
      </div>

      <section>
        <h2 className="ella-heading-section text-base">Your timetable</h2>
        <ul className="mt-2 space-y-2">
          {courses.map((c) => (
            <li
              key={c.id}
              className={`ella-panel-muted px-3 py-2 text-sm ${
                c.id === courseId ? "ring-1 ring-[var(--ella-accent)]" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-[var(--ella-fg)]">
                  {c.courseCode ? (
                    <span className="font-mono text-[var(--ella-fg-subtle)]">
                      {c.courseCode}{" "}
                    </span>
                  ) : null}
                  {c.title}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    c.window.active && !c.hasCheckIn
                      ? "bg-[var(--ella-accent-subtle)] text-[var(--ella-accent-hover)]"
                      : c.hasCheckIn && !c.hasCheckOut
                        ? "bg-[var(--ella-warning-subtle)] text-[var(--ella-warning)]"
                        : c.hasCheckIn && c.hasCheckOut
                          ? "bg-[var(--ella-surface-muted)] text-[var(--ella-fg-subtle)]"
                          : "bg-[var(--ella-surface-muted)] text-[var(--ella-fg-muted)]"
                  }`}
                >
                  {courseStatusLabel(c)}
                </span>
              </div>
              <p className="mt-0.5 text-[var(--ella-fg-muted)]">{c.scheduleLabel}</p>
              <p className="mt-0.5 text-[var(--ella-fg-subtle)]">
                {c.window.active
                  ? "In session now"
                  : c.hasCheckIn && !c.hasCheckOut
                    ? "Checked in — check out when you leave"
                    : c.hasCheckIn && c.hasCheckOut
                      ? "Completed today"
                      : c.nextClassHint ?? c.window.reason}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p className="ella-alert-error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="ella-alert-success">{message}</p>}
    </div>
  );
}
