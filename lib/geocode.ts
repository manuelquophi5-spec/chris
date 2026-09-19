export type GeocodeResult = {
  displayName: string;
  shortName: string;
  latitude: number;
  longitude: number;
};

type NominatimRow = {
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
};

/** Search places via OpenStreetMap Nominatim (server-side only). */
export async function searchPlaces(
  query: string,
  limit = 6,
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(Math.min(limit, 10)));
  url.searchParams.set("addressdetails", "0");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "ug_attend/1.0 (geofence-admin)",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error("Place search is temporarily unavailable");
  }

  const rows = (await res.json()) as NominatimRow[];

  return rows
    .map((row) => {
      const lat = Number(row.lat);
      const lon = Number(row.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const displayName = row.display_name ?? row.name ?? "Unknown place";
      const shortName = row.name ?? displayName.split(",")[0]?.trim() ?? displayName;
      return {
        displayName,
        shortName,
        latitude: Math.round(lat * 1e6) / 1e6,
        longitude: Math.round(lon * 1e6) / 1e6,
      };
    })
    .filter((r): r is GeocodeResult => r !== null);
}
