import mongoose from "mongoose";

const OnboardingDocumentSchema = new mongoose.Schema({
  fileName:    { type: String, required: true },
  fileUrl:     { type: String, required: true },  // Public URL từ Supabase
  storagePath: { type: String, required: true },  // Path trên Supabase Storage để xóa
  fileSize:    { type: Number },                  // bytes
  mimeType:    { type: String },
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  uploadedAt:  { type: Date, default: Date.now },
});

const OnboardingSettingSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,  // Mỗi công ty chỉ có 1 bộ cài đặt
    },
    welcomeMessageTemplate: {
      type: String,
      default:
        " Chào mừng {fullName} gia nhập công ty!\n\n" +
        "Bộ phận HCNS gửi tới bạn bộ tài liệu onboarding:\n\n" +
        "{documentsBlock}\n\n" +
        "Nếu có thắc mắc, bạn hãy liên hệ bộ phận HCNS nhé! ",
    },
    documents: { type: [OnboardingDocumentSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("OnboardingSetting", OnboardingSettingSchema);
