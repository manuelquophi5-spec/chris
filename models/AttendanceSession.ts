import mongoose, { Schema, type Model } from "mongoose";

export interface IAttendanceSession {
  _id: mongoose.Types.ObjectId;
  title: string;
  courseCode?: string;
  locationId: mongoose.Types.ObjectId;
  startAt: Date;
  endAt: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<IAttendanceSession>(
  {
    title: { type: String, required: true, trim: true },
    courseCode: { type: String, trim: true },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

sessionSchema.index({ startAt: 1, endAt: 1 });
sessionSchema.index({ locationId: 1, startAt: -1 });

export const AttendanceSession: Model<IAttendanceSession> =
  mongoose.models.AttendanceSession ??
  mongoose.model<IAttendanceSession>("AttendanceSession", sessionSchema);
