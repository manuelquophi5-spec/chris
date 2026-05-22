import mongoose, { Schema, type Model } from "mongoose";
import type { AttendanceType } from "@/types";

export interface IAttendance {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  locationId: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId | null;
  courseId?: mongoose.Types.ObjectId | null;
  isLate?: boolean;
  type: AttendanceType;
  dayKey: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  gpsAccuracy?: number | null;
  withinGeofence: boolean;
  photoData?: string | null;
  markedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "AttendanceSession",
      default: null,
    },
    type: {
      type: String,
      enum: ["check_in", "check_out"],
      required: true,
    },
    dayKey: { type: String, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    distanceMeters: { type: Number, required: true },
    gpsAccuracy: { type: Number },
    withinGeofence: { type: Boolean, required: true },
    photoData: { type: String, select: false },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

attendanceSchema.index({ userId: 1, markedAt: -1 });
attendanceSchema.index({ userId: 1, dayKey: 1, type: 1 });
attendanceSchema.index(
  { userId: 1, sessionId: 1, type: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $type: "objectId" } } },
);
attendanceSchema.index({ sessionId: 1, markedAt: -1 });
attendanceSchema.index({ courseId: 1, dayKey: 1, markedAt: -1 });
attendanceSchema.index(
  { userId: 1, courseId: 1, dayKey: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { courseId: { $type: "objectId" } },
  },
);
attendanceSchema.index({ locationId: 1, markedAt: -1 });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ??
  mongoose.model<IAttendance>("Attendance", attendanceSchema);
