import mongoose from "mongoose";

/**
 * LeaveType – Loại phép nghỉ của công ty
 * VD: Phép năm, Phép ốm, Phép thai sản, Phép không lương, Nghỉ bù OT...
 * Chuẩn theo Bộ luật Lao động Việt Nam 2019
 */
const LeaveTypeSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    }, // VD: 'AL' (Annual), 'SL' (Sick), 'ML' (Maternity), 'UL' (Unpaid)
    name: {
      type: String,
      required: true,
      trim: true,
    }, // VD: "Nghỉ phép năm", "Nghỉ ốm", "Nghỉ thai sản"
    // Số ngày tối đa/năm (0 = không giới hạn, VD: thai sản)
    maxDaysPerYear: { type: Number, default: 12 },
    // Có tính lương không (AL, ML = true; UL = false)
    isPaid: { type: Boolean, default: true },
    // Có cần đính kèm giấy tờ không (VD: Phép ốm cần giấy bệnh viện)
    requireAttachment: { type: Boolean, default: false },
    // Cho phép xin nghỉ nửa ngày không
    allowHalfDay: { type: Boolean, default: true },
    // Số ngày tối thiểu phải xin trước (advance notice)
    minAdvanceDays: { type: Number, default: 1 },
    // Có tích lũy sang năm sau không
    carryOverAllowed: { type: Boolean, default: false },
    // Số ngày tối đa được carry over
    maxCarryOverDays: { type: Number, default: 5 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

LeaveTypeSchema.index({ company: 1, code: 1 }, { unique: true, sparse: true });
LeaveTypeSchema.index({ company: 1, isActive: 1 });

export default mongoose.model("LeaveType", LeaveTypeSchema);
