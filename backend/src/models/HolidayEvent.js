import mongoose from "mongoose";

/**
 * HolidayEvent – Sự kiện nghỉ lễ tự động thông báo qua Zalo CRM
 *
 * Luồng hoạt động (Cron Job chạy 08:00 mỗi ngày):
 *  1. (start_date - today == notify_advance_days) && !is_notified
 *     → Gửi announcement_template → is_notified = true
 *  2. (today == start_date) && !is_wished
 *     → Gửi wish_template → is_wished = true
 */
const HolidayEventSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // ── Thông tin sự kiện ──────────────────────────────────────
    title: {
      type: String,
      required: true,
      trim: true,
    }, // VD: "Nghỉ lễ Quốc khánh 2/9"

    start_date: { type: Date, required: true }, // Ngày bắt đầu nghỉ
    end_date: { type: Date, required: true },   // Ngày kết thúc nghỉ
    back_to_work_date: { type: Date },          // Ngày đi làm lại

    // ── Cấu hình thông báo ─────────────────────────────────────
    notify_advance_days: {
      type: Number,
      default: 2,
      min: 0,
    }, // Báo trước N ngày trước start_date

    // Template hỗ trợ placeholder {{name}} (thay bằng "Toàn thể nhân viên" khi broadcast)
    announcement_template: {
      type: String,
      trim: true,
    }, // Nội dung thông báo lịch nghỉ

    wish_template: {
      type: String,
      trim: true,
    }, // Nội dung lời chúc ngày nghỉ lễ

    // ── Trạng thái gửi (do cron job cập nhật) ─────────────────
    is_notified: { type: Boolean, default: false }, // Đã gửi thông báo trước chưa
    is_wished: { type: Boolean, default: false },   // Đã gửi lời chúc chưa

    // ── Metadata gửi (lưu để audit) ───────────────────────────
    notified_at: { type: Date, default: null },   // Thời điểm gửi thông báo
    wished_at: { type: Date, default: null },     // Thời điểm gửi lời chúc
    notified_count: { type: Number, default: 0 }, // Số người nhận thông báo
    wished_count: { type: Number, default: 0 },   // Số người nhận lời chúc

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

HolidayEventSchema.index({ company: 1, start_date: 1 });
HolidayEventSchema.index({ company: 1, is_notified: 1 });
HolidayEventSchema.index({ company: 1, is_wished: 1 });

export default mongoose.model("HolidayEvent", HolidayEventSchema);
