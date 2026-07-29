import mongoose from "mongoose";
import { ApprovalHistorySchema } from "./LeaveRequest.js";

/**
 * OvertimeRequest – Đăng ký làm thêm giờ (OT)
 *
 * Chuẩn Việt Nam (Điều 107 BLLĐ 2019):
 * - OT ngày thường: ≤ 50% lương giờ bình thường
 * - OT ngày nghỉ hàng tuần: ≥ 200%
 * - OT ngày lễ: ≥ 300%
 * - Tổng OT ≤ 200 giờ/năm (hoặc 300 giờ với ngành đặc thù)
 */
const OvertimeRequestSchema = new mongoose.Schema(
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

    workDate: { type: Date, required: true },
    fromTime: { type: String, required: true }, // HH:mm, VD: "18:00"
    toTime: { type: String, required: true },   // HH:mm, VD: "21:00"
    totalHours: { type: Number, required: true }, // tính server-side
    reason: { type: String, required: true, trim: true },

    // Loại OT để tính hệ số lương
    otType: {
      type: String,
      enum: ["weekday", "weekend", "holiday"],
      required: true,
    },
    // Hình thức bồi thường
    compensationType: {
      type: String,
      enum: ["pay", "leave"], // trả tiền hoặc nghỉ bù
      default: "pay",
    },

    // ── Approval Workflow ─────────────────────────────────────────
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "cancelled"],
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

    submittedAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    cancelledAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

OvertimeRequestSchema.index({ employee: 1, workDate: 1 });
OvertimeRequestSchema.index({ employee: 1, status: 1 });
OvertimeRequestSchema.index({ currentApprover: 1, status: 1 });
OvertimeRequestSchema.index({ company: 1, status: 1 });

export default mongoose.model("OvertimeRequest", OvertimeRequestSchema);
