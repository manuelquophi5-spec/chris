import mongoose, { Schema, type Model } from "mongoose";

export interface IAuditLog {
  _id: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  action: string;
  targetType: string;
  targetId: string;
  detail?: string;
  createdAt: Date;
}

const auditSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    detail: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ??
  mongoose.model<IAuditLog>("AuditLog", auditSchema);
