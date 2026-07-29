import mongoose from "mongoose";

/**
 * AttendanceLog – Bản ghi thô mỗi lần check-in / check-out
 * Lưu đầy đủ GPS + FaceID để audit trail
 * Mỗi lần bấm check-in hoặc check-out → 1 document
 */
const AttendanceLogSchema = new mongoose.Schema(
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
    // Ngày làm việc (normalize về đầu ngày, dùng để group)
    workDate: { type: Date, required: true },
    // Loại bản ghi
    type: {
      type: String,
      enum: ["check-in", "check-out"],
      required: true,
    },
    // Thời điểm chính xác
    timestamp: { type: Date, required: true },
    // Phương thức chấm công
    method: {
      type: String,
      enum: ["gps", "face", "gps-face", "manual", "device"],
      default: "gps-face",
    },

    // ── GPS ─────────────────────────────────────────────────────
    latitude: { type: Number },
    longitude: { type: Number },
    gpsAccuracy: { type: Number }, // độ chính xác GPS (mét)
    // Văn phòng gần nhất được so sánh
    officeLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyLocation",
    },
    distanceFromOffice: { type: Number }, // khoảng cách tính được (mét)
    allowedRadius: { type: Number },      // ngưỡng cho phép lúc check-in
    isWithinAllowedRadius: { type: Boolean, default: false },

    // ── FaceID (face-api.js) ─────────────────────────────────────
    // Ảnh chụp lúc check-in (base64 thumbnail hoặc URL sau khi upload)
    faceImageUrl: { type: String },
    // Euclidean distance giữa descriptor hiện tại vs. descriptor đã đăng ký
    // Nhỏ hơn = giống hơn. Ngưỡng chuẩn face-api.js = 0.5
    faceDistance: { type: Number },
    faceMatchScore: { type: Number }, // 1 - faceDistance, để dễ đọc hơn
    faceVerified: { type: Boolean, default: false },

    // ── Validation tổng hợp ──────────────────────────────────────
    // isValid = GPS ok AND (face ok OR method = 'manual')
    isValid: { type: Boolean, default: false },
    invalidReason: { type: String }, // mô tả lý do nếu isValid = false
    isManuallyApproved: { type: Boolean, default: false }, // HR override

    // ── Metadata ────────────────────────────────────────────────
    ipAddress: { type: String },
    deviceInfo: { type: String }, // User-Agent
    // Nếu method = 'manual': ai nhập thủ công
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    manualNote: { type: String },
  },
  { timestamps: true }
);

AttendanceLogSchema.index({ employee: 1, workDate: 1, type: 1 });
AttendanceLogSchema.index({ employee: 1, workDate: -1 });
AttendanceLogSchema.index({ company: 1, workDate: 1 });
AttendanceLogSchema.index({ timestamp: -1 });

export default mongoose.model("AttendanceLog", AttendanceLogSchema);
