import mongoose from "mongoose";

const HrmSyncLogSchema = new mongoose.Schema(
  {
    syncedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    triggeredBy: { type: String, enum: ["manual", "cron"], default: "manual" },
    departments: {
      total: { type: Number, default: 0 },
      inserted: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      removed: { type: Number, default: 0 },
      names: { type: [String], default: [] },
    },
    positions: {
      total: { type: Number, default: 0 },
      inserted: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      removed: { type: Number, default: 0 },
      names: { type: [String], default: [] },
    },
    employees: {
      total: { type: Number, default: 0 },
      inserted: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      removed: { type: Number, default: 0 },
      codes: { type: [String], default: [] },
    },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

HrmSyncLogSchema.index({ syncedAt: -1 });

export default mongoose.model("HrmSyncLog", HrmSyncLogSchema);
