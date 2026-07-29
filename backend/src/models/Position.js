import mongoose from "mongoose";
import softDeletePlugin from "../utils/softDeletePlugin.js";
import auditLogPlugin from "../utils/auditLogPlugin.js";
const PositionSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: "Position", default: null },
    level: {
      type: String,
      enum: ["C-level", "Director", "Manager", "Senior", "Junior", "Intern", "Other"],
      default: "Other",
    },
    jobDescription: { type: String, trim: true },
    requirements: { type: String, trim: true },
    headcount: { type: Number, default: 1 },
    keywords: { type: [String], default: [] },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PositionSchema.index({ department: 1 });
PositionSchema.index({ reportsTo: 1 });
PositionSchema.index({ deletedAt: 1 });

PositionSchema.plugin(softDeletePlugin);
PositionSchema.plugin(auditLogPlugin);

export default mongoose.model("Position", PositionSchema);
