import mongoose, { Schema, type Model } from "mongoose";

export interface ICourse {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  lecturerId: mongoose.Types.ObjectId;
  locationId?: mongoose.Types.ObjectId | null;
  /** 0=Sun … 6=Sat (JavaScript getDay) */
  scheduleDays: number[];
  startTime: string;
  endTime: string;
  lateAfterMinutes: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    lecturerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "Location", default: null },
    scheduleDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5],
      validate: {
        validator: (v: number[]) =>
          Array.isArray(v) &&
          v.length > 0 &&
          v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        message: "Pick at least one class day",
      },
    },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    lateAfterMinutes: { type: Number, default: 15, min: 0, max: 120 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

courseSchema.index({ lecturerId: 1, isActive: 1 });
courseSchema.index({ isActive: 1 });

if (process.env.NODE_ENV !== "production") {
  if (mongoose.models.Course) {
    mongoose.deleteModel("Course");
  }
}

export const Course: Model<ICourse> =
  mongoose.models.Course ?? mongoose.model<ICourse>("Course", courseSchema);
