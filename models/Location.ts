import mongoose, { Schema, type Model } from "mongoose";

export interface ILocation {
  _id: mongoose.Types.ObjectId;
  name: string;
  latitude: number;
  longitude: number;
  /** Allowed check-in radius from center point, in meters */
  radiusMeters: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocation>(
  {
    name: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    radiusMeters: { type: Number, required: true, min: 10, max: 50_000 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const Location: Model<ILocation> =
  mongoose.models.Location ??
  mongoose.model<ILocation>("Location", locationSchema);
