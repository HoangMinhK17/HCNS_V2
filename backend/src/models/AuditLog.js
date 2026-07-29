import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ["CREATE", "UPDATE", "DELETE"], required: true },
    collectionName: { type: String, required: true },
    recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Null nếu thao tác hệ thống
    oldValues: { type: mongoose.Schema.Types.Mixed, default: {} },
    newValues: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    note: { type: String }
  },
  { timestamps: true }
);

AuditLogSchema.index({ collectionName: 1, recordId: 1 });
AuditLogSchema.index({ createdAt: -1 }, { expireAfterSeconds: 2592000 });
export default mongoose.model("AuditLog", AuditLogSchema);
