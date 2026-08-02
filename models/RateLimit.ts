import mongoose, { Schema, type Model } from "mongoose";

export interface IRateLimit {
  _id: mongoose.Types.ObjectId;
  key: string;
  count: number;
  resetAt: Date;
}

const rateLimitSchema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  resetAt: { type: Date, required: true },
});

// TTL index: document is removed once the clock passes its own resetAt.
rateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<IRateLimit> =
  mongoose.models.RateLimit ??
  mongoose.model<IRateLimit>("RateLimit", rateLimitSchema);
