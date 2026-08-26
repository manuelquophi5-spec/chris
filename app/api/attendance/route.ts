import { connectDB } from "@/lib/db";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api";
import { Attendance } from "@/models/Attendance";
import mongoose from "mongoose";

/** List attendance records (own history for users; admins see all). */
export async function GET(request: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
    const courseIdFilter = searchParams.get("courseId")?.trim() ?? "";

    await connectDB();

    const isAdmin = auth.role === "admin";

    const filter: Record<string, unknown> = {};
    if (!isAdmin) {
      filter.userId = auth.id;
    }

    if (courseIdFilter === "campus") {
      filter.$or = [{ courseId: null }, { courseId: { $exists: false } }];
    } else if (courseIdFilter && mongoose.Types.ObjectId.isValid(courseIdFilter)) {
      filter.courseId = new mongoose.Types.ObjectId(courseIdFilter);
    }

    const records = await Attendance.find(filter)
      .sort({ markedAt: -1 })
      .limit(limit)
      .populate("locationId", "name")
      .populate("userId", "name email employeeId")
      .populate("courseId", "title courseCode")
      .lean();

    return jsonOk({
      attendance: records.map((r) => {
        const loc = r.locationId as
          | { _id: unknown; name?: string }
          | null
          | undefined;
        const usr = r.userId as
          | { _id: unknown; name?: string; email?: string; employeeId?: string }
          | null
          | undefined;
        const course = r.courseId as
          | { _id: unknown; title?: string; courseCode?: string }
          | null
          | undefined;

        const courseObj =
          course && typeof course === "object" && "_id" in course
            ? {
                id: String(course._id),
                title: String(course.title ?? ""),
                courseCode: String(course.courseCode ?? "").trim(),
              }
            : null;

        return {
          id: String(r._id),
          type: r.type ?? "check_in",
          dayKey: r.dayKey ?? "",
          markedAt: r.markedAt.toISOString(),
          distanceMeters: r.distanceMeters,
          withinGeofence: r.withinGeofence,
          isLate: Boolean(r.isLate),
          checkInMethod: r.checkInMethod === "qr" ? "qr" : "gps",
          location:
            loc && typeof loc === "object" && "name" in loc
              ? { id: String(loc._id), name: loc.name }
              : null,
          course: courseObj,
          user:
            isAdmin && usr && typeof usr === "object"
              ? {
                  id: String(usr._id),
                  name: usr.name ?? "",
                  email: usr.email ?? "",
                  studentId: usr.employeeId ?? "",
                }
              : undefined,
        };
      }),
    });
  } catch (error) {
    console.error("[api/attendance] GET error:", error);
    return jsonError(
      error instanceof Error ? error.message : "Internal Server Error",
      500,
    );
  }
}
