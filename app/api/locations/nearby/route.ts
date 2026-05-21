import { connectDB } from "@/lib/db";
import { getAuthUser, jsonError, jsonOk, parseCoordinates } from "@/lib/api";
import { rankSitesByDistance } from "@/lib/site-picker";
import { Location } from "@/models/Location";

/** Rank active sites by distance from the user's coordinates. */
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const coords = parseCoordinates(
    searchParams.get("latitude"),
    searchParams.get("longitude"),
  );
  if (!coords) {
    return jsonError("latitude and longitude query params are required");
  }

  await connectDB();
  const sites = await Location.find({ isActive: true }).lean();
  const ranked = rankSitesByDistance(
    sites.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      radiusMeters: s.radiusMeters,
    })),
    coords.latitude,
    coords.longitude,
  );

  const autoSelected = ranked.filter((s) => s.inRange).length === 1
    ? ranked.find((s) => s.inRange)?.id ?? null
    : null;

  return jsonOk({ sites: ranked, autoSelected });
}
