import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { searchPlaces } from "@/lib/geocode";

/** Admin-only place search for geofence setup (proxies Nominatim). */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (q.trim().length < 2) {
    return jsonOk({ results: [] });
  }

  if (q.length > 200) {
    return jsonError("Search query is too long");
  }

  try {
    const results = await searchPlaces(q, 8);
    return jsonOk({ results });
  } catch (err) {
    console.error("[geocode/search]", err);
    return jsonError("Could not search places. Try again in a moment.", 502);
  }
}
