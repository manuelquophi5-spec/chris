"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import {
  distancePreviewMessage,
  gpsAccuracyHint,
  softenGeofenceApiError,
} from "@/lib/geofence-messages";
import {
  geolocationErrorMessage,
  getDevicePosition,
  type GeoErrorCode,
} from "@/lib/geolocation";
import { toastError, toastSuccess, toastWarning } from "@/lib/toast";
import type { ActiveSessionSummary, AttendanceType, TodayAttendanceStatus } from "@/types";

type LocationOption = { id: string; name: string };

type NearbySite = {
  id: string;
  name: string;
  distanceMeters: number;
  radiusMeters: number;
  inRange: boolean;
};

export type DailyAttendanceMode = "auto" | "daily" | "session";

type Props = {
  onUpdate?: () => void;
  attendanceMode?: DailyAttendanceMode;
};

const selectClass = "ella-select mt-2";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayLabel(dayKey: string) {
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

function sessionModeActive(
  today: TodayAttendanceStatus | null,
  mode: DailyAttendanceMode,
): boolean {
  if (mode === "daily") return false;
  if (mode === "session") {
    return Boolean(today?.hasActiveSessions && today.activeSessions.length > 0);
  }
  return Boolean(today?.useSessionMode);
}

function checkInButtonLabel(
  today: TodayAttendanceStatus | null,
  loading: boolean,
  mode: DailyAttendanceMode,
): string {
  if (loading) return "Getting your location…";
  if (!today) return "Check in";
  if (sessionModeActive(today, mode)) {
    const open = today.activeSessions.filter((s) => !s.hasCheckIn);
    if (open.length === 0) return "No session to check in";
    return "Check in to session";
  }
  if (today.checkIn) return "Already checked in";
  if (today.isComplete) return "Done for today";
  return "Check in";
}

function checkOutButtonLabel(
  today: TodayAttendanceStatus | null,
  loading: boolean,
  mode: DailyAttendanceMode,
): string {
  if (loading) return "Getting your location…";
  if (!today) return "Check out";
  if (sessionModeActive(today, mode)) {
    const open = today.activeSessions.filter(
      (s) => s.hasCheckIn && !s.hasCheckOut,
    );
    if (open.length === 0) return "Nothing to check out";
    return "Check out of session";
  }
  if (today.checkOut) return "Already checked out";
  if (!today.checkIn) return "Check in first";
  if (today.isComplete) return "Done for today";
  return "Check out";
}

export function DailyAttendanceCard({
  onUpdate,
  attendanceMode = "auto",
}: Props) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationId, setLocationId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [today, setToday] = useState<TodayAttendanceStatus | null>(null);
  const [nearby, setNearby] = useState<NearbySite | null>(null);
  const [distanceHint, setDistanceHint] = useState<string | null>(null);
  const [gpsHint, setGpsHint] = useState<string | null>(null);
  const [loading, setLoading] = useState<AttendanceType | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [reminderDismissed, setReminderDismissed] = useState(false);

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
      if (data.checkIn?.locationId) {
        setLocationId(data.checkIn.locationId);
      }
      if (
        sessionModeActive(data, attendanceMode) &&
        data.activeSessions.length === 1
      ) {
        const s = data.activeSessions[0];
        if (!s.hasCheckOut) setSessionId(s.id);
      }
    }
  }, [tzOffset, attendanceMode]);

  const loadLocations = useCallback(async () => {
    const res = await authFetch("/api/locations");
    const data = await res.json();
    setLocations(data.locations ?? []);
  }, []);

  const refreshNearby = useCallback(async () => {
    try {
      const position = await getDevicePosition();
      setGpsHint(gpsAccuracyHint(position.accuracy));
      const res = await authFetch(
        `/api/locations/nearby?latitude=${position.latitude}&longitude=${position.longitude}`,
      );
      const data = await parseJsonResponse<{
        sites?: NearbySite[];
        autoSelected?: string | null;
        error?: string;
      }>(res);
      if (!res.ok) return;
      const sites = data.sites ?? [];
      const effectiveId =
        locationId ||
        data.autoSelected ||
        (sites.length === 1 ? sites[0].id : "");
      const site =
        sites.find((s) => s.id === effectiveId) ?? sites[0] ?? null;
      setNearby(site);
      if (site) {
        setDistanceHint(
          distancePreviewMessage(
            site.distanceMeters,
            site.name,
            site.inRange,
          ),
        );
        if (!today?.checkIn && data.autoSelected && !locationId) {
          setLocationId(data.autoSelected);
        }
      }
    } catch {
      setNearby(null);
      setDistanceHint(null);
    }
  }, [locationId, today?.checkIn]);

  useEffect(() => {
    void loadLocations();
    void loadToday();
  }, [loadLocations, loadToday]);

  useEffect(() => {
    if (locations.length === 1 && !today?.checkIn && !locationId) {
      setLocationId(locations[0].id);
    }
  }, [locations, today?.checkIn, locationId]);

  useEffect(() => {
    void refreshNearby();
    const id = setInterval(() => void refreshNearby(), 30_000);
    return () => clearInterval(id);
  }, [refreshNearby]);

  const showCheckoutReminder =
    !reminderDismissed &&
    today?.checkIn &&
    !today.checkOut &&
    !sessionModeActive(today, attendanceMode) &&
    new Date().getHours() >= 17;

  function placeNameForError(effectiveLocationId: string) {
    return (
      locations.find((l) => l.id === effectiveLocationId)?.name ??
      nearby?.name ??
      today?.checkIn?.locationName ??
      "campus"
    );
  }

  function pickSessionForMark(type: AttendanceType): string | undefined {
    if (!today || !sessionModeActive(today, attendanceMode)) return undefined;
    if (sessionId) return sessionId;
    if (type === "check_in") {
      const open = today.activeSessions.filter((s) => !s.hasCheckIn);
      return open.length === 1 ? open[0].id : undefined;
    }
    const open = today.activeSessions.filter(
      (s) => s.hasCheckIn && !s.hasCheckOut,
    );
    return open.length === 1 ? open[0].id : undefined;
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoData(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toastWarning("Choose a photo (JPEG or PNG)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setPhotoData(typeof result === "string" ? result : null);
    };
    reader.readAsDataURL(file);
  }

  async function mark(type: AttendanceType) {
    const effectiveLocationId = today?.checkIn?.locationId ?? locationId;
    const effectiveSessionId = pickSessionForMark(type);

    if (sessionModeActive(today, attendanceMode)) {
      if (!effectiveSessionId) {
        toastWarning("Select an active session first");
        return;
      }
    } else if (!effectiveLocationId) {
      toastWarning("Select a campus first");
      return;
    }

    setLoading(type);
    try {
      const position = await getDevicePosition();
      setGpsHint(gpsAccuracyHint(position.accuracy));

      const res = await authFetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: position.latitude,
          longitude: position.longitude,
          locationId: effectiveLocationId || undefined,
          sessionId: effectiveSessionId,
          type,
          timezoneOffset: tzOffset,
          accuracy: position.accuracy,
          photoData: photoData ?? undefined,
        }),
      });
      const data = await parseJsonResponse<{
        error?: string;
        message?: string;
      }>(res);

      if (!res.ok) {
        const raw = data.error ?? "Could not record attendance";
        toastError(
          softenGeofenceApiError(
            raw,
            placeNameForError(effectiveLocationId ?? ""),
          ),
        );
        return;
      }

      toastSuccess(
        data.message ?? (type === "check_in" ? "Checked in" : "Checked out"),
      );
      setPhotoData(null);
      await loadToday();
      onUpdate?.();
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err.code as GeoErrorCode)
          : "unknown";
      toastError(geolocationErrorMessage(code));
    } finally {
      setLoading(null);
    }
  }

  const lockedSite = today?.checkIn?.locationName;
  const busy = loading !== null;
  const useSessions = sessionModeActive(today, attendanceMode);
  const canCheckIn =
    attendanceMode === "daily"
      ? !today?.checkIn && locations.length > 0
      : useSessions
        ? (today?.activeSessions.some((s) => !s.hasCheckIn) ?? false)
        : Boolean(today?.canCheckIn) && (locations.length > 0 || Boolean(today?.checkIn));
  const canCheckOut =
    attendanceMode === "daily"
      ? Boolean(today?.checkIn && !today?.checkOut)
      : useSessions
        ? (today?.activeSessions.some((s) => s.hasCheckIn && !s.hasCheckOut) ?? false)
        : Boolean(today?.canCheckOut);
  const checkInDisabled =
    busy ||
    !canCheckIn ||
    (!useSessions && !locationId && !today?.checkIn);
  const checkOutDisabled = busy || !canCheckOut;

  const openSessions =
    today?.activeSessions.filter((s) => !s.hasCheckOut) ?? [];

  return (
    <div className="space-y-5">
      {showCheckoutReminder && (
        <div className="ella-panel-muted animate-fade-in px-4 py-3" role="status">
          <p className="font-semibold">Remember to check out</p>
          <p className="mt-1">
            You checked in earlier but haven&apos;t checked out yet.
          </p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold underline"
            onClick={() => setReminderDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="ella-card-padded animate-slide-up">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[var(--ella-fg-subtle)]">
              {today ? formatDayLabel(today.dayKey) : "Today"}
            </p>
            <h2 className="ella-heading-section mt-0.5 text-xl">Attendance</h2>
          </div>
          {today?.isComplete ? (
            <span className="ella-badge ella-badge-complete animate-fade-in">
              Complete
            </span>
          ) : today?.checkIn || openSessions.some((s) => s.hasCheckIn) ? (
            <span className="ella-badge ella-badge-open animate-fade-in">
              On campus
            </span>
          ) : (
            <span className="ella-badge ella-badge-idle">Not in yet</span>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--ella-border)] pt-4">
          <div>
            <dt className="text-xs font-medium text-[var(--ella-fg-subtle)]">
              Check in
            </dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-[var(--ella-fg)]">
              {today?.checkIn ? formatTime(today.checkIn.markedAt) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[var(--ella-fg-subtle)]">
              Check out
            </dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-[var(--ella-fg)]">
              {today?.checkOut ? formatTime(today.checkOut.markedAt) : "—"}
            </dd>
          </div>
        </dl>
        {lockedSite && (
          <p className="mt-3 text-center text-xs text-[var(--ella-fg-muted)]">
            {lockedSite}
          </p>
        )}
      </section>

      <section
        className="ella-card-padded animate-slide-up"
        style={{ animationDelay: "60ms" }}
      >
        <h3 className="ella-heading-section">Mark attendance</h3>
        <p className="ella-text-muted mt-1">
          Be on campus to check in. GPS must be within the campus area.
        </p>

        {distanceHint && (
          <p className="ella-panel-muted mt-3 px-4 py-3 text-sm text-[var(--ella-fg-muted)]">
            {distanceHint}
          </p>
        )}
        {gpsHint && (
          <p className="mt-2 text-xs text-[var(--ella-warning)]">{gpsHint}</p>
        )}

        {useSessions && openSessions.length > 0 ? (
          <label className="mt-4 block">
            <span className="ella-label font-semibold">Active session</span>
            <select
              className={selectClass}
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value);
                const s = openSessions.find((x) => x.id === e.target.value);
                if (s) setLocationId(s.locationId);
              }}
              disabled={busy}
            >
              <option value="">Select session…</option>
              {openSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} @ {s.locationName}
                  {s.hasCheckIn ? " (checked in)" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : locations.length > 0 && !useSessions ? (
          <label className="mt-4 block">
            <span className="ella-label font-semibold">Campus</span>
            {lockedSite ? (
              <p
                className={`${selectClass} flex items-center bg-[var(--ella-surface-muted)] text-[var(--ella-fg-muted)]`}
              >
                {lockedSite}
              </p>
            ) : (
              <select
                className={selectClass}
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                disabled={busy || Boolean(today?.checkIn)}
              >
                <option value="">Select campus…</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            )}
          </label>
        ) : !useSessions ? (
          <p className="ella-panel-muted mt-4 px-4 py-3 text-sm">
            No campuses configured. Contact your administrator.
          </p>
        ) : null}

        <label className="mt-4 block">
          <span className="ella-label font-semibold">Photo (optional)</span>
          <input
            type="file"
            accept="image/*"
            capture="user"
            className="mt-2 w-full text-sm text-[var(--ella-fg-muted)]"
            onChange={onPhotoChange}
            disabled={busy}
          />
        </label>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            disabled={checkInDisabled}
            onClick={() => mark("check_in")}
            className="ella-btn-primary w-full min-h-[52px] text-base disabled:scale-100 disabled:border disabled:border-[var(--ella-border)] disabled:bg-[var(--ella-surface-muted)] disabled:text-[var(--ella-fg-subtle)]"
          >
            {checkInButtonLabel(today, loading === "check_in", attendanceMode)}
          </button>
          <button
            type="button"
            disabled={checkOutDisabled}
            onClick={() => mark("check_out")}
            className="ella-btn-secondary w-full min-h-[52px] border-[var(--ella-fg)] bg-[var(--ella-fg)] text-[var(--ella-accent-fg)] hover:bg-[var(--ella-fg-muted)] disabled:border-[var(--ella-border)] disabled:bg-[var(--ella-surface-muted)] disabled:text-[var(--ella-fg-subtle)]"
          >
            {checkOutButtonLabel(today, loading === "check_out", attendanceMode)}
          </button>
        </div>

        {today?.isComplete && (
          <p className="animate-fade-in mt-4 text-center text-sm font-medium text-[var(--ella-accent-hover)]">
            You&apos;re done for today. See you tomorrow.
          </p>
        )}

      </section>
    </div>
  );
}
