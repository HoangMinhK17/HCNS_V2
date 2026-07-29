import mongoose from "mongoose";

/**
 * CompanyLocation – Tọa độ GPS văn phòng / chi nhánh
 * Dùng để kiểm tra check-in trong vùng cho phép (Geofencing)
 */
const CompanyLocationSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    }, // VD: "Văn phòng Hà Nội", "Chi nhánh HCM"
    address: { type: String, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    // Bán kính cho phép check-in (mét), mặc định 100m
    allowedRadius: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CompanyLocationSchema.index({ company: 1, isActive: 1 });

export default mongoose.model("CompanyLocation", CompanyLocationSchema);
