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
import type { ActiveSessionSummary, AttendanceType, TodayAttendanceStatus } from "@/types";

type LocationOption = { id: string; name: string };

type NearbySite = {
  id: string;
  name: string;
  distanceMeters: number;
  radiusMeters: number;
  inRange: boolean;
};

type Props = {
  onUpdate?: () => void;
};

const selectClass =
  "mt-2 w-full min-h-[52px] rounded-2xl border border-slate-200/80 bg-white px-4 text-base text-slate-900 shadow-inner transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25";

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

function checkInButtonLabel(
  today: TodayAttendanceStatus | null,
  loading: boolean,
): string {
  if (loading) return "Getting your location…";
  if (!today) return "Check in";
  if (today.useSessionMode) {
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
): string {
  if (loading) return "Getting your location…";
  if (!today) return "Check out";
  if (today.useSessionMode) {
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

export function DailyAttendanceCard({ onUpdate }: Props) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationId, setLocationId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [today, setToday] = useState<TodayAttendanceStatus | null>(null);
  const [nearby, setNearby] = useState<NearbySite | null>(null);
  const [distanceHint, setDistanceHint] = useState<string | null>(null);
  const [gpsHint, setGpsHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
      if (data.useSessionMode && data.activeSessions.length === 1) {
        const s = data.activeSessions[0];
        if (!s.hasCheckOut) setSessionId(s.id);
      }
    }
  }, [tzOffset]);

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
    !today.useSessionMode &&
    new Date().getHours() >= 17;

  function placeNameForError(effectiveLocationId: string) {
    return (
      locations.find((l) => l.id === effectiveLocationId)?.name ??
      nearby?.name ??
      today?.checkIn?.locationName ??
      "the office"
    );
  }

  function pickSessionForMark(type: AttendanceType): string | undefined {
    if (!today?.useSessionMode) return undefined;
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
      setError("Choose a photo (JPEG or PNG)");
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
    setError(null);
    setMessage(null);

    const effectiveLocationId = today?.checkIn?.locationId ?? locationId;
    const effectiveSessionId = pickSessionForMark(type);

    if (today?.useSessionMode) {
      if (!effectiveSessionId) {
        setError("Select an active session first");
        return;
      }
    } else if (!effectiveLocationId) {
      setError("Select a work site first");
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
        setError(
          softenGeofenceApiError(
            raw,
            placeNameForError(effectiveLocationId ?? ""),
          ),
        );
        return;
      }

      setMessage(
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
      setError(geolocationErrorMessage(code));
    } finally {
      setLoading(null);
    }
  }

  const lockedSite = today?.checkIn?.locationName;
  const busy = loading !== null;
  const useSessions = Boolean(today?.useSessionMode);
  const canCheckIn = Boolean(today?.canCheckIn) && (useSessions || locations.length > 0);
  const canCheckOut = Boolean(today?.canCheckOut);
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
        <div
          className="animate-fade-in rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          <p className="font-semibold">Remember to check out</p>
          <p className="mt-1 text-amber-800">
            You checked in earlier but haven&apos;t checked out yet.
          </p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-amber-900 underline"
            onClick={() => setReminderDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="mobile-card animate-slide-up overflow-hidden rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-900/15">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-100/90">
              {today ? formatDayLabel(today.dayKey) : "Today"}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">
              Attendance
            </h2>
          </div>
          {today?.isComplete ? (
            <span className="animate-fade-in rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              ✓ Complete
            </span>
          ) : today?.checkIn || openSessions.some((s) => s.hasCheckIn) ? (
            <span className="animate-fade-in rounded-full bg-amber-400/30 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              On site
            </span>
          ) : (
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur">
              Not in yet
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-100">
              Check in
            </p>
            <p className="mt-1 text-sm font-semibold">
              {today?.checkIn ? formatTime(today.checkIn.markedAt) : "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-100">
              Check out
            </p>
            <p className="mt-1 text-sm font-semibold">
              {today?.checkOut ? formatTime(today.checkOut.markedAt) : "—"}
            </p>
          </div>
        </div>
        {lockedSite && (
          <p className="mt-3 text-center text-xs text-emerald-100/90">
            {lockedSite}
          </p>
        )}
      </section>

      <section
        className="mobile-card animate-slide-up rounded-3xl border border-slate-200/80 bg-white p-5 shadow-md shadow-slate-200/50"
        style={{ animationDelay: "60ms" }}
      >
        <h3 className="text-base font-bold text-slate-900">Mark attendance</h3>
        <p className="mt-1 text-sm text-slate-500">
          Be at the office to check in. GPS must be within the site area.
        </p>

        {distanceHint && (
          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {distanceHint}
          </p>
        )}
        {gpsHint && (
          <p className="mt-2 text-xs text-amber-700">{gpsHint}</p>
        )}

        {useSessions && openSessions.length > 0 ? (
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">
              Active session
            </span>
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
            <span className="text-sm font-semibold text-slate-700">
              Work site
            </span>
            {lockedSite ? (
              <p
                className={`${selectClass} flex items-center bg-slate-50 text-slate-700`}
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
                <option value="">Select site…</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            )}
          </label>
        ) : !useSessions ? (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No sites configured. Contact your administrator.
          </p>
        ) : null}

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-slate-700">
            Photo (optional)
          </span>
          <input
            type="file"
            accept="image/*"
            capture="user"
            className="mt-2 w-full text-sm text-slate-600"
            onChange={onPhotoChange}
            disabled={busy}
          />
        </label>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            disabled={checkInDisabled}
            onClick={() => mark("check_in")}
            className="mobile-action-btn w-full rounded-2xl bg-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] disabled:scale-100 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            {checkInButtonLabel(today, loading === "check_in")}
          </button>
          <button
            type="button"
            disabled={checkOutDisabled}
            onClick={() => mark("check_out")}
            className="mobile-action-btn w-full rounded-2xl bg-slate-800 py-4 text-base font-bold text-white shadow-lg shadow-slate-800/25 transition-all active:scale-[0.98] disabled:scale-100 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            {checkOutButtonLabel(today, loading === "check_out")}
          </button>
        </div>

        {today?.isComplete && (
          <p className="animate-fade-in mt-4 text-center text-sm font-medium text-emerald-700">
            You&apos;re done for today. See you tomorrow.
          </p>
        )}

        {message && (
          <p
            className="animate-fade-in mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
            role="status"
          >
            {message}
          </p>
        )}
        {error && (
          <p
            className="animate-shake mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
