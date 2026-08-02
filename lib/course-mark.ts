import { getDayKey } from "@/lib/day";
import { geofenceOutOfRangeMessage } from "@/lib/geofence-messages";
import { checkImplausibleMovement } from "@/lib/gps-spoofing";
import { isWithinGeofence } from "@/lib/haversine";
import { evaluateCourseSchedule } from "@/lib/schedule";
import { toAttendanceSummary } from "@/lib/attendance";
import { Attendance } from "@/models/Attendance";
import { Course } from "@/models/Course";
import { studentCanAccessCourse } from "@/lib/courses";
import { User } from "@/models/User";
import { Location } from "@/models/Location";
import type { AttendanceType } from "@/types";
import mongoose from "mongoose";

export async function markCourseAttendance(params: {
  userId: string;
  courseId: string;
  type: AttendanceType;
  coords: { latitude: number; longitude: number };
  timezoneOffset: number;
  gpsAccuracy: number | null;
  locationIdOverride?: string;
}) {
  const {
    userId,
    courseId,
    type,
    coords,
    timezoneOffset,
    gpsAccuracy,
    locationIdOverride,
  } = params;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return { error: "Invalid class", status: 400 as const };
  }

  const course = await Course.findOne({ _id: courseId, isActive: true });
  if (!course) {
    return { error: "Class not found or inactive", status: 404 as const };
  }

  const allowed = await studentCanAccessCourse(userId, course);
  if (!allowed) {
    const student = await User.findById(userId).select("program level role").lean();
    if (student?.role === "user" && (!student.program || student.level == null)) {
      return {
        error:
          "Your program and level are not set — ask your administrator to update your profile.",
        status: 403 as const,
      };
    }
    return {
      error: "This class is not assigned to your program and level.",
      status: 403 as const,
    };
  }

  const window = evaluateCourseSchedule(
    course.scheduleDays,
    course.startTime,
    course.endTime,
    course.lateAfterMinutes ?? 15,
    new Date(),
    timezoneOffset,
  );

  const dayKey = getDayKey(new Date(), timezoneOffset);
  const existing = await Attendance.find({
    userId,
    courseId: course._id,
    dayKey,
  }).lean();

  const hasIn = existing.some((r) => r.type === "check_in");
  const hasOut = existing.some((r) => r.type === "check_out");

  if (type === "check_in") {
    if (!window.active) {
      return {
        error: window.reason ?? "Class is not active right now",
        status: 403 as const,
      };
    }
    if (hasIn) {
      return { error: "You already checked in for this class today.", status: 409 as const };
    }
  } else {
    if (!hasIn) {
      return { error: "Check in to this class first.", status: 400 as const };
    }
    if (hasOut) {
      return { error: "You already checked out of this class today.", status: 409 as const };
    }
  }

  const locationId = locationIdOverride ?? course.locationId?.toString() ?? "";
  if (!locationId) {
    return {
      error: "This class has no campus location — ask your administrator.",
      status: 400 as const,
    };
  }

  const location = await Location.findOne({ _id: locationId, isActive: true });
  if (!location) {
    return { error: "Class location not found or inactive", status: 404 as const };
  }

  const { within, distanceMeters } = isWithinGeofence(
    coords.latitude,
    coords.longitude,
    location.latitude,
    location.longitude,
    location.radiusMeters,
  );

  if (!within) {
    return {
      error: geofenceOutOfRangeMessage(
        distanceMeters,
        location.radiusMeters,
        location.name,
      ),
      status: 403 as const,
    };
  }

  const markedAt = new Date();
  const movement = await checkImplausibleMovement(
    userId,
    coords.latitude,
    coords.longitude,
    markedAt,
  );
  if (!movement.ok) {
    return { error: movement.message, status: 403 as const };
  }

  const isLate = type === "check_in" && window.isLate;

  const record = await Attendance.create({
    userId,
    locationId: location._id,
    courseId: course._id,
    type,
    dayKey,
    latitude: coords.latitude,
    longitude: coords.longitude,
    distanceMeters,
    gpsAccuracy,
    withinGeofence: true,
    isLate,
    markedAt,
  });

  const summary = toAttendanceSummary(record, location.name, undefined, course.title);

  return {
    ok: true as const,
    summary,
    message:
      type === "check_in"
        ? isLate
          ? `Checked in (late) — ${course.title}`
          : `Checked in — ${course.title}`
        : `Checked out — ${course.title}`,
  };
}
