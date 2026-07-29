import mongoose from "mongoose";

/**
 * WorkScheduleAssignment – Phân ca chi tiết: 1 nhân viên × 1 ngày × 1 ca
 * Tạo bởi HR/Manager khi lập lịch tuần/tháng
 * Đây là "kế hoạch", AttendanceLog là "thực tế"
 */
const WorkScheduleAssignmentSchema = new mongoose.Schema(
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
    shiftTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShiftTemplate",
      // null = ngày nghỉ
    },
    workDate: { type: Date, required: true }, // normalize về 00:00:00 UTC
    isOff: { type: Boolean, default: false }, // ngày nghỉ theo lịch
    isHoliday: { type: Boolean, default: false }, // ngày lễ
    note: { type: String, trim: true },
    // Ai tạo lịch
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Unique: 1 nhân viên chỉ có 1 lịch/ngày
WorkScheduleAssignmentSchema.index(
  { employee: 1, workDate: 1 },
  { unique: true }
);
WorkScheduleAssignmentSchema.index({ company: 1, workDate: 1 });
WorkScheduleAssignmentSchema.index({ employee: 1, workDate: -1 });

export default mongoose.model(
  "WorkScheduleAssignment",
  WorkScheduleAssignmentSchema
);
