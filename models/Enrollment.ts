import mongoose, { Schema, type Model } from "mongoose";

export interface IEnrollment {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

enrollmentSchema.index({ courseId: 1, userId: 1 }, { unique: true });
enrollmentSchema.index({ userId: 1 });

if (process.env.NODE_ENV !== "production") {
  if (mongoose.models.Enrollment) {
    mongoose.deleteModel("Enrollment");
  }
}

export const Enrollment: Model<IEnrollment> =
  mongoose.models.Enrollment ??
  mongoose.model<IEnrollment>("Enrollment", enrollmentSchema);
