import { connectDB } from "@/lib/db";
import { getAuthUser, jsonError, jsonOk } from "@/lib/api";
import { Attendance } from "@/models/Attendance";

/** List attendance records (own history for users, all for admins). */
export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  await connectDB();

  const isStaff = auth.role === "admin" || auth.role === "instructor";
  const filter = isStaff ? {} : { userId: auth.id };

  const records = await Attendance.find(filter)
    .sort({ markedAt: -1 })
    .limit(limit)
    .populate("locationId", "name")
    .populate("userId", "name email employeeId")
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

      return {
        id: String(r._id),
        type: r.type ?? "check_in",
        dayKey: r.dayKey ?? "",
        markedAt: r.markedAt,
        distanceMeters: r.distanceMeters,
        withinGeofence: r.withinGeofence,
        location: loc && typeof loc === "object" && "name" in loc
          ? { id: String(loc._id), name: loc.name }
          : null,
        user:
          isStaff && usr && typeof usr === "object"
            ? {
                id: String(usr._id),
                name: usr.name ?? "",
                email: usr.email ?? "",
                employeeId: usr.employeeId ?? "",
              }
            : undefined,
      };
    }),
  });
}
