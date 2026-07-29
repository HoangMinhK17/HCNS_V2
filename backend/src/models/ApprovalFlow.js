import mongoose from "mongoose";

/**
 * ApprovalFlow – Template cấu hình luồng phê duyệt
 *
 * Phase 2 áp dụng luồng 2 tầng chuẩn:
 *   Step 1: Quản lý trực tiếp (reportsTo) → action required (approve/reject)
 *   Step 2: HR (role hr) → notify only (không cần action, chỉ theo dõi)
 *
 * Thiết kế extensible để Phase 3+ có thể thêm tầng (CEO, CFO...)
 */
const ApprovalStepSchema = new mongoose.Schema(
  {
    step: { type: Number, required: true }, // 1, 2, 3...
    label: { type: String }, // Tên bước VD: "Quản lý trực tiếp"
    approverType: {
      type: String,
      enum: [
        "direct-manager",    // Employee.reportsTo
        "department-manager",// Trưởng phòng của Department
        "hr",                // Bất kỳ user có role hr
        "specific-employee", // Người cụ thể
        "ceo",               // Giám đốc (cần config)
      ],
      required: true,
    },
    specificApprover: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    }, // Chỉ dùng khi approverType = 'specific-employee'
    // notifyOnly = true: không cần action, chỉ nhận thông báo
    notifyOnly: { type: Boolean, default: false },
    // Số giờ tối đa để phê duyệt trước khi escalate/remind
    deadlineHours: { type: Number, default: 48 },
    canSkipIfNoManager: { type: Boolean, default: false },
  },
  { _id: false }
);

const ApprovalFlowSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    requestType: {
      type: String,
      enum: ["leave", "overtime", "asset"],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    steps: [ApprovalStepSchema],
    isActive: { type: Boolean, default: true },
    // Flow mặc định cho loại request này
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ApprovalFlowSchema.index({ company: 1, requestType: 1, isDefault: 1 });

export default mongoose.model("ApprovalFlow", ApprovalFlowSchema);
