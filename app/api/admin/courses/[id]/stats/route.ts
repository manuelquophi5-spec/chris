import { connectDB } from "@/lib/db";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { getCourseStats } from "@/lib/courses";
import mongoose from "mongoose";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid course id", 400);
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.trim() || undefined;
  const to = searchParams.get("to")?.trim() || undefined;

  await connectDB();

  try {
    const stats = await getCourseStats(id, from, to);
    return jsonOk({ stats });
  } catch {
    return jsonError("Course not found", 404);
  }
}
