import mongoose, { Schema, type Model } from "mongoose";

export interface ICourse {
  _id: mongoose.Types.ObjectId;
  title: string;
  /** Short code shown to students, e.g. BBA101 */
  courseCode?: string;
  /** Program slug matching student.program */
  program: string;
  /** Academic level: 100, 200, 300, or 400 */
  level: number;
  description?: string;
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
    courseCode: { type: String, trim: true, uppercase: true, default: "" },
    program: { type: String, required: true, trim: true, lowercase: true },
    level: {
      type: Number,
      required: true,
      enum: [100, 200, 300, 400],
    },
    description: { type: String, trim: true, default: "" },
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

courseSchema.index({ isActive: 1 });
courseSchema.index({ program: 1, level: 1, isActive: 1 });

if (process.env.NODE_ENV !== "production") {
  if (mongoose.models.Course) {
    mongoose.deleteModel("Course");
  }
}

export const Course: Model<ICourse> =
  mongoose.models.Course ?? mongoose.model<ICourse>("Course", courseSchema);
