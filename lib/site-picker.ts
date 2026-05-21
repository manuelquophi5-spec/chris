import { haversineDistanceMeters } from "@/lib/haversine";

export type SiteWithDistance = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  distanceMeters: number;
  inRange: boolean;
};

export function rankSitesByDistance(
  sites: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  }>,
  userLat: number,
  userLon: number,
): SiteWithDistance[] {
  return sites
    .map((site) => {
      const distanceMeters = Math.round(
        haversineDistanceMeters(
          userLat,
          userLon,
          site.latitude,
          site.longitude,
        ),
      );
      return {
        ...site,
        distanceMeters,
        inRange: distanceMeters <= site.radiusMeters,
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function pickAutoSite(sites: SiteWithDistance[]): SiteWithDistance | null {
  const inRange = sites.filter((s) => s.inRange);
  if (inRange.length === 1) return inRange[0];
  return null;
}
