"use client";

import { useEffect } from "react";
import { Circle, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { GeofenceLocation } from "@/types/location";

const DEFAULT_CENTER: [number, number] = [5.6037, -0.187];
const DEFAULT_ZOOM = 13;

type DraftPin = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

type Props = {
  locations: GeofenceLocation[];
  draft: DraftPin | null;
  selectedId: string | null;
  /** Bumps when map should fly to draft/search center */
  viewKey?: number;
  onMapClick: (lat: number, lng: number) => void;
};

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapRecenter({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center[0], center[1], zoom]);
  return null;
}

export function GeofenceMap({
  locations,
  draft,
  selectedId,
  viewKey = 0,
  onMapClick,
}: Props) {
  const activeLocations = locations.filter((l) => l.isActive);
  const center: [number, number] = draft
    ? [draft.latitude, draft.longitude]
    : selectedId
      ? (() => {
          const sel = locations.find((l) => l.id === selectedId);
          return sel
            ? ([sel.latitude, sel.longitude] as [number, number])
            : activeLocations[0]
              ? ([
                  activeLocations[0].latitude,
                  activeLocations[0].longitude,
                ] as [number, number])
              : DEFAULT_CENTER;
        })()
      : activeLocations[0]
        ? ([
            activeLocations[0].latitude,
            activeLocations[0].longitude,
          ] as [number, number])
        : DEFAULT_CENTER;

  const zoom =
    draft || selectedId || activeLocations.length > 0 ? 17 : DEFAULT_ZOOM;

  return (
    <div className="h-[min(56vh,480px)] w-full overflow-hidden rounded-xl border border-[var(--ella-border)]">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onMapClick} />
        <MapRecenter center={center} zoom={zoom} key={viewKey} />

        {locations.map((loc) => (
          <Circle
            key={loc.id}
            center={[loc.latitude, loc.longitude]}
            radius={loc.radiusMeters}
            pathOptions={{
              color: loc.id === selectedId ? "#047857" : loc.isActive ? "#10b981" : "#94a3b8",
              fillColor: loc.id === selectedId ? "#059669" : loc.isActive ? "#34d399" : "#cbd5e1",
              fillOpacity: loc.id === selectedId ? 0.35 : 0.2,
              weight: loc.id === selectedId ? 3 : 2,
            }}
          />
        ))}

        {draft && (
          <Circle
            center={[draft.latitude, draft.longitude]}
            radius={draft.radiusMeters}
            pathOptions={{
              color: "#0369a1",
              fillColor: "#0ea5e9",
              fillOpacity: 0.25,
              weight: 2,
              dashArray: "6 4",
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
