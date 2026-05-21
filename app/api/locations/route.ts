import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import {
  getAuthUser,
  jsonError,
  jsonOk,
  parseCoordinates,
  requireAdmin,
} from "@/lib/api";
import { Location } from "@/models/Location";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get("all") === "1";

  if (includeAll && user.role !== "admin") {
    return jsonError("Forbidden: admin only", 403);
  }

  await connectDB();
  const locations = await Location.find(
    includeAll ? {} : { isActive: true },
  )
    .sort({ name: 1 })
    .lean();

  return jsonOk({
    locations: locations.map((loc) => ({
      id: loc._id.toString(),
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      radiusMeters: loc.radiusMeters,
      isActive: loc.isActive,
      createdAt: loc.createdAt?.toISOString(),
      updatedAt: loc.updatedAt?.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const coords = parseCoordinates(body.latitude, body.longitude);
    const radiusMeters = Number(body.radiusMeters ?? 100);

    if (!name) return jsonError("Location name is required");
    if (!coords) return jsonError("Valid latitude and longitude are required");
    if (!Number.isFinite(radiusMeters) || radiusMeters < 10) {
      return jsonError("radiusMeters must be at least 10");
    }

    await connectDB();
    const location = await Location.create({
      name,
      latitude: coords.latitude,
      longitude: coords.longitude,
      radiusMeters,
      isActive: true,
      createdBy: auth.id,
    });

    await writeAudit(
      auth.id,
      "location.create",
      "location",
      location._id.toString(),
      name,
    );

    return jsonOk(
      {
        location: {
          id: location._id.toString(),
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          radiusMeters: location.radiusMeters,
        },
      },
      201,
    );
  } catch (err) {
    console.error("[locations POST]", err);
    return jsonError("Failed to create location", 500);
  }
}
