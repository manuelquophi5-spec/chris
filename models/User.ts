import mongoose, { Schema, type Model } from "mongoose";
import type { UserRole } from "@/types";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  employeeId: string;
  email: string;
  passwordHash?: string;
  passwordMustChange: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  name: string;
  role: UserRole;
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
    passwordHash: { type: String, select: false },
    passwordMustChange: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["admin", "instructor", "user"],
      default: "user",
    },
  },
  { timestamps: true },
);

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);
