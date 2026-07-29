import AssetRequest from "../models/AssetRequest.js";
import Employee from "../models/Employee.js";

export const createAssetRequest = async (req, res) => {
  try {
    const { requestType, assetName, assetCode, quantity, reason, urgency, expectedDate } = req.body;

    // Tìm employee: ưu tiên theo ID link từ user, fallback theo email
    let employee = null;
    if (req.user.employee) {
      employee = await Employee.findOne({ _id: req.user.employee, deletedAt: null }).lean();
    }
    if (!employee) {
      employee = await Employee.findOne({ email: req.user.email, deletedAt: null }).lean();
    }
    if (!employee) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ nhân viên của bạn" });
    }

    // Validate company tồn tại trên employee
    if (!employee.company) {
      return res.status(400).json({
        success: false,
        message: "Hồ sơ nhân viên chưa được gắn công ty. Vui lòng liên hệ HR để cập nhật.",
      });
    }

    const request = await AssetRequest.create({
      employee: employee._id,
      company: employee.company,
      requestType,
      assetName,
      assetCode: assetCode || null,
      quantity: quantity || 1,
      reason,
      urgency: urgency || "medium",
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      status: "draft",
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, message: "Đã tạo đề xuất tài sản (draft)", data: request });
  } catch (error) {
    console.error("createAssetRequest:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const getMyAssetRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const userRole = req.user?.roleCode;
    const isAdmin = ["super-admin", "hr-admin"].includes(userRole);

    let filter = {};

    if (isAdmin) {
      // Super Admin & HR Admin: xem toàn bộ theo công ty (nếu có)
      if (status) filter.status = status;
    } else {
      // Các role còn lại: chỉ xem đề xuất do chính mình tạo
      filter.createdBy = req.user._id;
      if (status) filter.status = status;
    }

    const [data, total] = await Promise.all([
      AssetRequest.find(filter)
        .populate("employee", "fullName employeeCode")
        .populate("createdBy", "username email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      AssetRequest.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, data, pagination: { total, page: Number(page) } });
  } catch (error) {
    console.error("getMyAssetRequests:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};


export const fulfillAssetRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { fulfilledNote } = req.body;

    const request = await AssetRequest.findById(id);
    if (!request) return res.status(404).json({ success: false, message: "Không tìm thấy" });
    if (request.status !== "approved") {
      return res.status(400).json({ success: false, message: "Chỉ cấp phát được đề xuất đã duyệt" });
    }

    request.status = "fulfilled";
    request.fulfilledAt = new Date();
    request.fulfilledNote = fulfilledNote || "";
    request.fulfilledBy = req.user._id;
    await request.save();

    return res.status(200).json({ success: true, message: "Đã cấp phát tài sản", data: request });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
