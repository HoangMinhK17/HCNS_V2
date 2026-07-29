import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    taxCode: { type: String, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    website: { type: String, trim: true },
    logo: { type: String },
    foundedDate: { type: Date },
    legalRepresentative: { type: String, trim: true },
    businessType: {
      type: String,
      enum: ["joint-stock", "limited", "sole-proprietorship", "partnership", "other"],
      default: "limited",
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    deletedAt: { type: Date, default: null },

    // ── Phase 2: Attendance Settings ───────────────────────────
    attendanceSettings: {
      // Bật/tắt các phương thức chấm công
      gpsEnabled: { type: Boolean, default: true },
      faceEnabled: { type: Boolean, default: true },
      // Yêu cầu phải có cả GPS và FaceID mới hợp lệ
      requireBothMethods: { type: Boolean, default: false },
      // Bán kính mặc định (mét) nếu CompanyLocation không có riêng
      defaultAllowedRadius: { type: Number, default: 100 },
      // Ngưỡng faceDistance (Euclidean) chấp nhận
      faceDistanceThreshold: { type: Number, default: 0.5 },
      // Số giờ sau khi vào ca, nếu chưa check-in thì đánh vắng
      autoAbsentAfterHours: { type: Number, default: 4 },
    },
  },
  { timestamps: true }
);

CompanySchema.index({ deletedAt: 1 });

export default mongoose.model("Company", CompanySchema);
