import mongoose from "mongoose";
import softDeletePlugin from "../utils/softDeletePlugin.js";
import auditLogPlugin from "../utils/auditLogPlugin.js";
const DepartmentSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    managerName: { type: String, default: "" },
    functions: { type: String, trim: true },
    headcount: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    keywords: { type: [String], default: [] },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

DepartmentSchema.index({ parent: 1 });
DepartmentSchema.index({ company: 1 });
DepartmentSchema.index({ deletedAt: 1 });

DepartmentSchema.plugin(softDeletePlugin);
DepartmentSchema.plugin(auditLogPlugin);

export default mongoose.model("Department", DepartmentSchema);
