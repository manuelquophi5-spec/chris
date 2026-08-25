import { NextResponse } from "next/server";
import type { SessionUser } from "@/types";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyAccessToken } from "@/lib/auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export async function getAuthUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyAccessToken(token);
}

export async function requireAuth(): Promise<
  SessionUser | NextResponse
> {
  const user = await getAuthUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (result.role !== "admin") {
    return jsonError("Forbidden: admin only", 403);
  }
  return result;
}

export function parseCoordinates(
  latitude: unknown,
  longitude: unknown,
): { latitude: number; longitude: number } | null {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return null;
  }
  return { latitude: lat, longitude: lon };
}
