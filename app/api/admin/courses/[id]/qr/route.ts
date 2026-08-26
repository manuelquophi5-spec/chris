import { connectDB } from "@/lib/db";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { signQrToken } from "@/lib/qr-token";
import { Course } from "@/models/Course";
import mongoose from "mongoose";

type RouteContext = { params: Promise<{ id: string }> };

/** Admin: QR link for a course (scan target = /scan?token=...), covers both check-in and check-out. */
export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid course id", 400);
  }

  await connectDB();
  const course = await Course.findById(id).select("_id title").lean();
  if (!course) return jsonError("Course not found", 404);

  const token = await signQrToken({ courseId: id });
  const origin = new URL(request.url).origin;

  return jsonOk({
    url: `${origin}/scan?token=${token}`,
  });
}
