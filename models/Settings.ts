import mongoose, { Schema, type Model } from "mongoose";

/** Singleton document — one row holds the whole school's brand settings. */
export interface ISettings {
  _id: mongoose.Types.ObjectId;
  appName: string;
  logoUrl: string;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    appName: { type: String, trim: true, default: "" },
    logoUrl: { type: String, trim: true, default: "" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export const Settings: Model<ISettings> =
  mongoose.models.Settings ?? mongoose.model<ISettings>("Settings", settingsSchema);
