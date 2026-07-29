import mongoose from "mongoose";

/**
 * LeaveBalance – Số ngày phép tồn của từng nhân viên theo từng loại phép
 * Cập nhật khi: đầu năm (allocated), duyệt đơn (pending→used), hủy đơn (pending→restored)
 */
const LeaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveType",
      required: true,
    },
    year: { type: Number, required: true },
    // Số ngày được cấp đầu năm (hoặc theo seniority)
    allocated: { type: Number, default: 0 },
    // Số ngày chuyển từ năm trước
    carryOver: { type: Number, default: 0 },
    // Số ngày đã sử dụng (approved + completed)
    used: { type: Number, default: 0 },
    // Số ngày đang chờ duyệt (pending requests)
    pending: { type: Number, default: 0 },
    // Số ngày còn lại = allocated + carryOver - used - pending
    // (Tính virtual, không lưu để tránh inconsistent)
    // Điều chỉnh thủ công (HR có thể cộng/trừ)
    adjustment: { type: Number, default: 0 },
    adjustmentNote: { type: String, trim: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Unique per employee + leaveType + year
LeaveBalanceSchema.index(
  { employee: 1, leaveType: 1, year: 1 },
  { unique: true }
);
LeaveBalanceSchema.index({ employee: 1, year: 1 });

// Virtual: số ngày còn lại
LeaveBalanceSchema.virtual("remaining").get(function () {
  return (
    (this.allocated || 0) +
    (this.carryOver || 0) +
    (this.adjustment || 0) -
    (this.used || 0) -
    (this.pending || 0)
  );
});

export default mongoose.model("LeaveBalance", LeaveBalanceSchema);
