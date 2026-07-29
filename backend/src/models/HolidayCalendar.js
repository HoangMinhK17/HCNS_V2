import mongoose from "mongoose";

/**
 * HolidayCalendar – Lịch nghỉ lễ / tết của công ty
 * Dùng để:
 * - Loại trừ ngày lễ khi tính số ngày nghỉ phép thực tế
 * - Đánh dấu AttendanceSummary.isHoliday = true
 * - Tính OT ngày lễ (hệ số lương cao hơn)
 */
const HolidayCalendarSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    date: { type: Date, required: true },
    name: {
      type: String,
      required: true,
      trim: true,
    }, // VD: "Tết Nguyên Đán", "Quốc khánh 2/9"
    // Nếu true: tự động áp dụng mỗi năm (chỉ xét tháng/ngày)
    isRecurringYearly: { type: Boolean, default: false },
    year: { type: Number }, // null nếu recurring
    isHalfDay: { type: Boolean, default: false }, // nghỉ nửa ngày
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

HolidayCalendarSchema.index({ company: 1, date: 1 });
HolidayCalendarSchema.index({ company: 1, year: 1 });

export default mongoose.model("HolidayCalendar", HolidayCalendarSchema);
