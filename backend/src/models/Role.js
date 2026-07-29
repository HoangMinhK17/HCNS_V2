import mongoose from "mongoose";

// Danh sách tất cả permissions của hệ thống Phase 1
export const ALL_PERMISSIONS = [
  // Employee
  "employee:view", "employee:create", "employee:edit", "employee:delete", "employee:import", "employee:export",
  // Department
  "department:view", "department:create", "department:edit", "department:delete",
  // Position
  "position:view", "position:create", "position:edit", "position:delete",
  // Company
  "company:view", "company:create", "company:edit", "company:delete",
  // Contract
  "contract:view", "contract:create", "contract:edit", "contract:delete",
  // Org Chart
  "orgchart:view",
  // Reports
  "report:view",
  // RBAC
  "role:view", "role:create", "role:edit", "role:delete",
  // User
  "user:view", "user:create", "user:edit", "user:delete",
  // System
  "system:settings",

  // ── Phase 2: Operations & ESS ───────────────────────────
  // Shift & Schedule
  "shift:view", "shift:create", "shift:edit", "shift:delete", "shift:assign",
  // Attendance
  "attendance:view", "attendance:checkin", "attendance:manual-edit",
  "attendance:approve", "attendance:export",
  // ESS (nhân viên tự phục vụ)
  "ess:leave", "ess:overtime", "ess:asset",
  // Approval (phải duyệt đơn của người khác)
  "approval:view", "approval:manage",
  // Settings
  "location:manage", "holiday:manage",
  "leavetype:manage", "leavebalance:manage",
];

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    permissions: {
      type: [String],
      enum: ALL_PERMISSIONS,
      default: [],
    },
    isSystem: { type: Boolean, default: false }, // Role hệ thống không xóa được
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RoleSchema.index({ deletedAt: 1 });

export default mongoose.model("Role", RoleSchema);
