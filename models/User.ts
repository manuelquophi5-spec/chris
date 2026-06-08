import mongoose, { Schema, type Model } from "mongoose";
import type { UserRole } from "@/types";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  employeeId?: string;
  email: string;
  passwordHash?: string;
  passwordMustChange: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  name: string;
  role: UserRole;
  /** Student program slug, e.g. computer-science */
  program?: string;
  /** Student academic level: 100, 200, 300, or 400 */
  level?: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Optional until the user completes "Set password" on first login.
    passwordHash: { type: String, select: false, required: false },
    passwordMustChange: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["admin", "instructor", "user"],
      default: "user",
    },
    program: { type: String, trim: true, lowercase: true, default: "" },
    level: { type: Number, enum: [100, 200, 300, 400], required: false },
  },
  { timestamps: true },
);

// Next.js hot reload can keep an old schema (e.g. required passwordHash).
if (process.env.NODE_ENV !== "production") {
  if (mongoose.models.User) {
    mongoose.deleteModel("User");
  }
}

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);
