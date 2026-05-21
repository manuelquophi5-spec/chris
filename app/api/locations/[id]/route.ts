import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import {
  jsonError,
  jsonOk,
  parseCoordinates,
  requireAdmin,
} from "@/lib/api";
import { Location } from "@/models/Location";
import mongoose from "mongoose";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid location id", 400);
  }

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return jsonError("Name cannot be empty");
      updates.name = name;
    }

    if (body.latitude !== undefined || body.longitude !== undefined) {
      const coords = parseCoordinates(
        body.latitude,
        body.longitude,
      );
      if (!coords) return jsonError("Valid latitude and longitude are required");
      updates.latitude = coords.latitude;
      updates.longitude = coords.longitude;
    }

    if (body.radiusMeters !== undefined) {
      const radiusMeters = Number(body.radiusMeters);
      if (!Number.isFinite(radiusMeters) || radiusMeters < 10) {
        return jsonError("radiusMeters must be at least 10");
      }
      updates.radiusMeters = radiusMeters;
    }

    if (body.isActive !== undefined) {
      updates.isActive = Boolean(body.isActive);
    }

    if (Object.keys(updates).length === 0) {
      return jsonError("No fields to update");
    }

    await connectDB();
    const location = await Location.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!location) return jsonError("Location not found", 404);

    await writeAudit(
      auth.id,
      "location.update",
      "location",
      id,
      location.name,
    );

    return jsonOk({
      location: {
        id: location._id.toString(),
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: location.radiusMeters,
        isActive: location.isActive,
      },
    });
  } catch (err) {
    console.error("[locations PATCH]", err);
    return jsonError("Failed to update location", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid location id", 400);
  }

  try {
    await connectDB();
    const location = await Location.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
    if (!location) return jsonError("Location not found", 404);

    await writeAudit(
      auth.id,
      "location.deactivate",
      "location",
      id,
      location.name,
    );

    return jsonOk({ ok: true });
  } catch (err) {
    console.error("[locations DELETE]", err);
    return jsonError("Failed to deactivate location", 500);
  }
}
