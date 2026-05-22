import { connectDB } from "@/lib/db";
import { jsonError, jsonOk, requireStaff } from "@/lib/api";
import { canLecturerAccessCourse, getCourseStats } from "@/lib/courses";
import mongoose from "mongoose";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireStaff();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid course id", 400);
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.trim() || undefined;
  const to = searchParams.get("to")?.trim() || undefined;

  await connectDB();
  const allowed = await canLecturerAccessCourse(
    auth.id,
    id,
    auth.role === "admin",
  );
  if (!allowed) return jsonError("Forbidden", 403);

  try {
    const stats = await getCourseStats(id, from, to);
    return jsonOk({ stats });
  } catch {
    return jsonError("Course not found", 404);
  }
}
