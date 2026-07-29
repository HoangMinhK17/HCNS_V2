import mongoose from "mongoose";

/**
 * AttendanceSummary – Tổng hợp chấm công 1 nhân viên × 1 ngày
 * Được tạo/cập nhật tự động sau mỗi lần checkout hoặc cuối ngày (cron job)
 * Đây là dữ liệu đầu vào cho Phase 3 (Payroll)
 */
const AttendanceSummarySchema = new mongoose.Schema(
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
    // Ca được phân (từ WorkScheduleAssignment)
    shiftTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShiftTemplate",
    },

    // ── Thực tế ──────────────────────────────────────────────────
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    actualWorkMinutes: { type: Number, default: 0 }, // trừ break
    plannedWorkMinutes: { type: Number, default: 0 }, // theo ca

    // ── Sai lệch ────────────────────────────────────────────────
    // Dựa vào ShiftTemplate.allowedLateMins / allowedEarlyMins
    lateMinutes: { type: Number, default: 0 },     // đi muộn (sau tolerance)
    earlyLeaveMinutes: { type: Number, default: 0 }, // về sớm (sau tolerance)
    overtimeMinutes: { type: Number, default: 0 },  // làm thêm sau giờ ca

    // ── Flags ────────────────────────────────────────────────────
    isAbsent: { type: Boolean, default: false },
    isOnLeave: { type: Boolean, default: false },
    leaveRequest: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveRequest" },
    isHoliday: { type: Boolean, default: false },
    isOff: { type: Boolean, default: false }, // ngày nghỉ theo lịch
    hasOvertimeApproved: { type: Boolean, default: false },
    overtimeRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OvertimeRequest",
    },

    // ── Trạng thái tổng hợp ──────────────────────────────────────
    status: {
      type: String,
      enum: [
        "present",     // đủ công
        "late",        // đi muộn (vượt tolerance)
        "early-leave", // về sớm (vượt tolerance)
        "late-early",  // cả hai
        "absent",      // vắng không phép
        "on-leave",    // nghỉ phép có phép
        "holiday",     // ngày lễ
        "off",         // ngày nghỉ theo lịch (T7, CN)
        "no-schedule", // chưa xếp lịch ca
      ],
      default: "no-schedule",
    },

    note: { type: String },
    // Sau khi chốt lương → lockedAt != null → không thể sửa
    lockedAt: { type: Date, default: null },
    // HR có thể override thủ công
    manuallyEdited: { type: Boolean, default: false },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

// Unique: 1 nhân viên chỉ có 1 summary/ngày
AttendanceSummarySchema.index(
  { employee: 1, workDate: 1 },
  { unique: true }
);
AttendanceSummarySchema.index({ company: 1, workDate: 1 });
AttendanceSummarySchema.index({ employee: 1, workDate: -1 });
AttendanceSummarySchema.index({ status: 1 });
AttendanceSummarySchema.index({ lockedAt: 1 });

export default mongoose.model("AttendanceSummary", AttendanceSummarySchema);
