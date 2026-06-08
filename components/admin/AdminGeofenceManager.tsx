"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import type { GeocodeResult } from "@/lib/geocode";
import {
  geolocationErrorMessage,
  getDevicePosition,
  type GeoErrorCode,
} from "@/lib/geolocation";
import { GeofenceMapLoader } from "./GeofenceMapLoader";
import { LocationSearch } from "./LocationSearch";
import { toastError, toastSuccess } from "@/lib/toast";
import type { GeofenceLocation } from "@/types/location";

const DEFAULT_LAT = 5.6037;
const DEFAULT_LNG = -0.187;

import {
  adminBtnDanger,
  adminBtnGhost,
  adminBtnPrimary,
  adminBtnSecondary,
  adminInput,
  adminStack,
} from "./admin-ui";

const inputClass = adminInput;
const btnPrimary = adminBtnPrimary;

export function AdminGeofenceManager() {
  const [locations, setLocations] = useState<GeofenceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteFilter, setSiteFilter] = useState("");
  const [mapViewKey, setMapViewKey] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);
  const [radiusMeters, setRadiusMeters] = useState(100);

  const isEditing = selectedId !== null;
  const draft = { latitude, longitude, radiusMeters };

  const filteredLocations = useMemo(() => {
    const q = siteFilter.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.latitude.toFixed(4).includes(q) ||
        loc.longitude.toFixed(4).includes(q),
    );
  }, [locations, siteFilter]);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/locations?all=1");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load locations");
      setLocations(data.locations ?? []);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  function resetForm() {
    setSelectedId(null);
    setName("");
    setLatitude(DEFAULT_LAT);
    setLongitude(DEFAULT_LNG);
    setRadiusMeters(100);
  }

  function selectLocation(loc: GeofenceLocation) {
    setSelectedId(loc.id);
    setName(loc.name);
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    setRadiusMeters(loc.radiusMeters);
    setMapViewKey((k) => k + 1);
  }

  function handleMapClick(lat: number, lng: number) {
    setLatitude(Math.round(lat * 1e6) / 1e6);
    setLongitude(Math.round(lng * 1e6) / 1e6);
    setMapViewKey((k) => k + 1);
  }

  function handlePlaceSelect(place: GeocodeResult) {
    setLatitude(place.latitude);
    setLongitude(place.longitude);
    if (!name.trim()) {
      setName(place.shortName.slice(0, 80));
    }
    setMapViewKey((k) => k + 1);
  }

  async function useMyLocation() {
    try {
      const pos = await getDevicePosition();
      setLatitude(pos.latitude);
      setLongitude(pos.longitude);
      setMapViewKey((k) => k + 1);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err.code as GeoErrorCode)
          : "unknown";
      toastError(geolocationErrorMessage(code));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toastError("Site name is required");
      return;
    }

    setSaving(true);
    const payload = {
      name: trimmedName,
      latitude,
      longitude,
      radiusMeters,
    };

    const res = await authFetch(
      isEditing ? `/api/locations/${selectedId}` : "/api/locations",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await parseJsonResponse<{ error?: string; location?: { name: string } }>(
      res,
    );
    setSaving(false);

    if (!res.ok) {
      toastError(data.error ?? "Save failed");
      return;
    }

    toastSuccess(
      isEditing
        ? "Location updated"
        : `Created “${data.location?.name ?? trimmedName}”`,
    );
    resetForm();
    await loadLocations();
  }

  async function toggleActive(loc: GeofenceLocation) {
    const res = await authFetch(`/api/locations/${loc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !loc.isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      toastError(data.error ?? "Update failed");
      return;
    }
    toastSuccess(loc.isActive ? "Campus deactivated" : "Campus activated");
    if (selectedId === loc.id && !loc.isActive) resetForm();
    await loadLocations();
  }

  async function deactivate(loc: GeofenceLocation) {
    if (!confirm(`Deactivate “${loc.name}”? Users will no longer check in here.`)) {
      return;
    }
    const res = await authFetch(`/api/locations/${loc.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toastError(data.error ?? "Deactivate failed");
      return;
    }
    if (selectedId === loc.id) resetForm();
    toastSuccess(`“${loc.name}” deactivated`);
    await loadLocations();
  }

  return (
    <div className={adminStack}>
      <div>
        <h1 className="ella-heading-page">Campuses</h1>
        <p className="ella-text-muted mt-2 max-w-2xl">
          Mark where staff are allowed to check in. Search for your building, set
          how close they must be (the highlighted circle on the map), then save.
        </p>
      </div>

      <section className="ella-card-padded">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 max-w-xl">
            <LocationSearch onSelect={handlePlaceSelect} disabled={saving} />
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            className="shrink-0 ella-btn-secondary border-[var(--ella-accent-muted)] bg-[var(--ella-accent-subtle)] text-[var(--ella-accent-hover)]"
          >
            Use my current location
          </button>
        </div>

        <p className="mt-3 ella-text-muted">
          <strong>Step 1:</strong> Search your office address and pick it from the list.
          <br />
          <strong>Step 2:</strong> Drag the slider so the circle covers the building (try 80–150 m).
          <br />
          <strong>Step 3:</strong> Give it a simple name and tap Save below.
        </p>

        <div className="mt-4">
          <GeofenceMapLoader
            locations={locations}
            draft={draft}
            selectedId={selectedId}
            viewKey={mapViewKey}
            onMapClick={handleMapClick}
          />
        </div>
      </section>

      <section className="ella-card-padded">
        <h2 className="ella-heading-section">
          {isEditing ? "Update this campus" : "Save a new campus"}
        </h2>
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <input
            className={inputClass}
            placeholder="Name staff will see (e.g. Main Office)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="ella-label text-xs">Latitude</span>
              <input
                type="number"
                step="any"
                className={`${inputClass} mt-1`}
                value={latitude}
                onChange={(e) => setLatitude(Number(e.target.value))}
                required
              />
            </label>
            <label className="block">
              <span className="ella-label text-xs">Longitude</span>
              <input
                type="number"
                step="any"
                className={`${inputClass} mt-1`}
                value={longitude}
                onChange={(e) => setLongitude(Number(e.target.value))}
                required
              />
            </label>
          </div>
          <label className="block">
            <span className="flex justify-between ella-label text-xs text-[var(--ella-fg-muted)]">
              <span>How close must they be? (metres)</span>
              <span className="text-[var(--ella-fg)]">{radiusMeters} m</span>
            </span>
            <input
              type="range"
              min={10}
              max={500}
              step={5}
              className="mt-2 w-full accent-[var(--ella-accent)]"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--ella-fg-subtle)]">
              <span>10 m</span>
              <span>500 m</span>
            </div>
          </label>
          <div className="flex gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 ella-btn-secondary"
              >
                Cancel
              </button>
            )}
            <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>
              {saving ? "Saving…" : isEditing ? "Save changes" : "Save campus"}
            </button>
          </div>
        </form>
      </section>

      <section className="ella-card-padded">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="ella-heading-section">Your campuses</h2>
          <div className="flex gap-2">
            <input
              type="search"
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              placeholder="Filter sites…"
              className={`${adminInput} min-w-[200px] sm:w-56`}
            />
            <button
              type="button"
              onClick={loadLocations}
              className={`${adminBtnGhost} shrink-0 text-[var(--ella-accent-hover)]`}
            >
              Refresh
            </button>
          </div>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--ella-fg-subtle)]">Loading…</p>
        ) : locations.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--ella-fg-subtle)]">
            No sites yet. Search for your office above, then create a geofence.
          </p>
        ) : filteredLocations.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--ella-fg-subtle)]">No sites match your filter.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--ella-border)]">
            {filteredLocations.map((loc) => (
              <li
                key={loc.id}
                className={`flex flex-col gap-2 py-3 first:pt-0 lg:flex-row lg:items-center lg:justify-between ${
                  selectedId === loc.id ? "rounded-lg bg-[var(--ella-accent-subtle)] px-2 -mx-2" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-[var(--ella-fg)]">
                    {loc.name}
                    {!loc.isActive && (
                      <span className="ella-chip-neutral ml-2 text-[10px] uppercase">
                        inactive
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--ella-fg-subtle)]">
                    {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} ·{" "}
                    {loc.radiusMeters} m radius
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => selectLocation(loc)}
                    className={adminBtnGhost}
                  >
                    Edit on map
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(loc)}
                    className={adminBtnGhost}
                  >
                    {loc.isActive ? "Disable" : "Enable"}
                  </button>
                  {loc.isActive && (
                    <button
                      type="button"
                      onClick={() => deactivate(loc)}
                      className={adminBtnDanger}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
