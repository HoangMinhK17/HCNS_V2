// ─────────────────────────────────────────────────────────────────────────────
// Onboarding Controller
// Quản lý cài đặt tài liệu onboarding + gửi Zalo thủ công
// ─────────────────────────────────────────────────────────────────────────────
import Employee from "../models/Employee.js";
import OnboardingSetting from "../models/OnboardingSetting.js";
import { getSupabase } from "../config/supabase.js";
import { sendZaloCampaign } from "../utils/crmZaloService.js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "onboarding-documents";

// ─── Helper: Sanitize tên file để dùng làm Supabase storage key ─────────────
// Supabase chỉ chấp nhận ký tự ASCII an toàn, không có dấu tiếng Việt
const sanitizeFileName = (name) => {
  return name
    // Bước 1: Normalize Unicode → tách ký tự gốc và dấu phụ
    .normalize("NFD")
    // Bước 2: Xóa các ký tự dấu phụ (combining marks)
    .replace(/[\u0300-\u036f]/g, "")
    // Bước 3: Chuyển đ/Đ (không phân tách được qua NFD)
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    // Bước 4: Chỉ giữ lại ký tự alphanumeric, dấu chấm, gạch ngang, gạch dưới
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    // Bước 5: Gộp nhiều dấu gạch dưới liên tiếp thành 1
    .replace(/_+/g, "_")
    // Bước 6: Trim dấu gạch dưới đầu/cuối
    .replace(/^_|_$/g, "");
};

// ─── Helper: Build nội dung tin nhắn từ template ───────────────────────────
const buildMessage = (template, employee, documents) => {
  const docLines = documents
    .map((d, i) => `${i + 1}. ${d.fileName}: ${d.fileUrl}`)
    .join("\n");
  return template
    .replace(/{fullName}/g, employee.fullName || "bạn")
    .replace(/{empCode}/g, employee.empCode || "")
    .replace(/{documentsBlock}/g, docLines || "(Chưa có tài liệu)");
};

// ─── GET /settings/onboarding ──────────────────────────────────────────────
export const getSettings = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    let setting = await OnboardingSetting.findOne({ company: companyId }).lean();
    if (!setting) {
      // Trả về default nếu chưa cấu hình
      setting = {
        company: companyId,
        welcomeMessageTemplate:
          " Chào mừng {fullName} gia nhập công ty!\n\nBộ phận HCNS gửi tới bạn bộ tài liệu onboarding:\n\n{documentsBlock}\n\nNếu có thắc mắc, bạn hãy liên hệ bộ phận HCNS nhé! ",
        documents: [],
      };
    }
    return res.json({ success: true, data: setting });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── PUT /settings/onboarding ──────────────────────────────────────────────
export const updateSettings = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { welcomeMessageTemplate } = req.body;
    const setting = await OnboardingSetting.findOneAndUpdate(
      { company: companyId },
      { $set: { welcomeMessageTemplate } },
      { upsert: true, new: true }
    );
    return res.json({ success: true, data: setting });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── Helper: Tự động tạo bucket nếu chưa tồn tại ───────────────────────────
const ensureBucketExists = async (supabase, bucketName) => {
  // Kiểm tra bucket đã có chưa
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === bucketName);
  if (!exists) {
    console.log(`[Onboarding] 📦 Bucket "${bucketName}" chưa tồn tại, đang tạo...`);
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: true, // Bật public để lấy URL gửi qua Zalo
    });
    if (error) throw new Error(`Không thể tạo bucket "${bucketName}": ${error.message}`);
    console.log(`[Onboarding] ✅ Đã tạo bucket "${bucketName}" (public).`);
  }
};

// ─── POST /settings/onboarding/upload (multipart/form-data) ────────────────
export const uploadDocument = async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ success: false, message: "Supabase chưa được cấu hình (thiếu SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Không có file được gửi lên" });
    }

    const companyId = req.user.companyId;
    const file = req.file;
    // Giữ tên gốc để hiển thị, tạo tên an toàn cho Supabase key
    const originalName = file.originalname;
    const safeName = sanitizeFileName(file.originalname);
    const storagePath = `company_${companyId}/${Date.now()}_${safeName}`;

    // Tự động tạo bucket nếu chưa tồn tại
    await ensureBucketExists(supabase, BUCKET);

    // Upload lên Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({ success: false, message: `Upload lên Supabase thất bại: ${uploadError.message}` });
    }

    // Lấy public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const fileUrl = urlData.publicUrl;

    // Lưu vào DB — dùng tên gốc tiếng Việt để hiển thị trên UI
    const newDoc = {
      fileName: originalName,   // Tên gốc (có dấu) để hiển thị
      fileUrl,
      storagePath,                 // Path đã sanitize trên Supabase
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    };

    const setting = await OnboardingSetting.findOneAndUpdate(
      { company: companyId },
      {
        $push: { documents: newDoc },
        $setOnInsert: { company: companyId },
      },
      { upsert: true, new: true }
    );

    return res.status(201).json({ success: true, data: setting });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── DELETE /settings/onboarding/documents/:docId ──────────────────────────
export const deleteDocument = async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ success: false, message: "Supabase chưa được cấu hình" });
    }
    const companyId = req.user.companyId;
    const { docId } = req.params;

    const setting = await OnboardingSetting.findOne({ company: companyId });
    if (!setting) return res.status(404).json({ success: false, message: "Không tìm thấy cài đặt" });

    const doc = setting.documents.id(docId);
    if (!doc) return res.status(404).json({ success: false, message: "Không tìm thấy tài liệu" });

    // Xóa khỏi Supabase Storage
    await supabase.storage.from(BUCKET).remove([doc.storagePath]);

    // Xóa khỏi DB
    setting.documents.pull(docId);
    await setting.save();

    return res.json({ success: true, message: "Đã xóa tài liệu" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── GET /settings/onboarding/employees ────────────────────────────────────
// Danh sách nhân viên onboarding (Pre-Onboarding/probation) + trạng thái gửi Zalo
export const getOnboardingEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({
      deletedAt: null,
      status: { $in: ["Pre-Onboarding"] },
    })
      .populate("department", "name")
      .populate("position", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: employees });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ─── POST /settings/onboarding/send/:employeeId ────────────────────────────
// Gửi thủ công Zalo onboarding cho 1 nhân viên (bỏ qua flag sent)
export const sendOnboardingManual = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const companyId = req.user.companyId;

    const [employee, setting] = await Promise.all([
      Employee.findOne({ _id: employeeId, deletedAt: null }).lean(),
      OnboardingSetting.findOne({ company: companyId }).lean(),
    ]);

    if (!employee) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });
    if (!employee.phone) return res.status(400).json({ success: false, message: "Nhân viên chưa có số điện thoại" });

    const channelId = process.env.ID_ZALO_CRM;
    if (!channelId) return res.status(500).json({ success: false, message: "Thiếu ID_ZALO_CRM trong .env" });

    const documents = setting?.documents || [];
    const template = setting?.welcomeMessageTemplate ||
      " Chào mừng {fullName} gia nhập công ty!\n\n{documentsBlock}";
    const content = buildMessage(template, employee, documents);

    await sendZaloCampaign({
      campaignName: `Onboarding_${employee.empCode}_${Date.now()}`,
      channelId,
      content,
      phones: [employee.phone],
    });

    await Employee.findByIdAndUpdate(employeeId, {
      onboardingZaloSent: true,
      onboardingZaloSentAt: new Date(),
    });

    return res.json({ success: true, message: `Đã gửi Zalo onboarding cho ${employee.fullName}` });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
