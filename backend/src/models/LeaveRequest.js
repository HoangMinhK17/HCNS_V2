import mongoose from "mongoose";

/**
 * ApprovalHistory sub-schema – Lịch sử hành động phê duyệt
 * Dùng chung cho LeaveRequest, OvertimeRequest, AssetRequest
 */
export const ApprovalHistorySchema = new mongoose.Schema(
  {
    step: { type: Number, required: true },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    approverUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    action: {
      type: String,
      enum: ["approved", "rejected", "noted", "cancelled"],
      required: true,
    },
    comment: { type: String, trim: true },
    actionAt: { type: Date, default: Date.now },
    notifyOnly: { type: Boolean, default: false }, // Step chỉ để thông báo
  },
  { _id: true, timestamps: false }
);

/**
 * LeaveRequest – Đơn xin nghỉ phép (ESS)
 *
 * Flow chuẩn:
 *  draft → pending → [approved | rejected | cancelled]
 *
 * Khi approved:
 *  - LeaveBalance.pending -= totalDays
 *  - LeaveBalance.used    += totalDays
 *  - AttendanceSummary ngày đó → isOnLeave = true
 */
const LeaveRequestSchema = new mongoose.Schema(
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
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },

    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    // Nửa ngày: 'full' | 'morning' | 'afternoon' (chỉ khi fromDate = toDate)
    halfDay: {
      type: String,
      enum: ["full", "morning", "afternoon"],
      default: "full",
    },
    // Số ngày thực (loại trừ ngày lễ, cuối tuần) - tính server-side
    totalDays: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    attachment: { type: String }, // URL file đính kèm (giấy bệnh viện...)

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
    currentStep: { type: Number, default: 1 }, // đang ở bước phê duyệt nào
    // Người đang cần phê duyệt (resolves từ approvalFlow step + orgchart)
    currentApprover: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    approvalHistory: [ApprovalHistorySchema],

    submittedAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelReason: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ employee: 1, status: 1 });
LeaveRequestSchema.index({ employee: 1, fromDate: 1 });
LeaveRequestSchema.index({ currentApprover: 1, status: 1 }); // inbox query
LeaveRequestSchema.index({ company: 1, status: 1 });

export default mongoose.model("LeaveRequest", LeaveRequestSchema);
