import mongoose from "mongoose";
import { ApprovalHistorySchema } from "./LeaveRequest.js";

/**
 * AssetRequest – Đề xuất cấp phát / sửa chữa / thu hồi tài sản
 * Dùng khi nhân viên cần: laptop, bàn ghế, dụng cụ, văn phòng phẩm...
 */
const AssetRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // Loại yêu cầu
    requestType: {
      type: String,
      enum: ["new", "repair", "replace", "return"],
      required: true,
    },
    assetName: { type: String, required: true, trim: true },
    assetCode: { type: String, trim: true }, // Mã tài sản hiện tại (khi repair/replace/return)
    quantity: { type: Number, default: 1, min: 1 },
    reason: { type: String, required: true, trim: true },
    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    expectedDate: { type: Date }, // Ngày cần trước

    // ── Approval Workflow ─────────────────────────────────────────
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "fulfilled", // Đã cấp phát / xử lý xong
      ],
      default: "draft",
    },
    approvalFlow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApprovalFlow",
    },
    currentStep: { type: Number, default: 1 },
    currentApprover: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    approvalHistory: [ApprovalHistorySchema],

    // ── Fulfillment ───────────────────────────────────────────────
    fulfilledAt: { type: Date },
    fulfilledNote: { type: String }, // Ghi chú khi cấp phát
    fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    submittedAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    cancelledAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

AssetRequestSchema.index({ employee: 1, status: 1 });
AssetRequestSchema.index({ currentApprover: 1, status: 1 });
AssetRequestSchema.index({ company: 1, status: 1 });

export default mongoose.model("AssetRequest", AssetRequestSchema);
