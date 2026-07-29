import OvertimeRequest from "../models/OvertimeRequest.js";
import Employee from "../models/Employee.js";
import HolidayCalendar from "../models/HolidayCalendar.js";
import { isWeekend } from "../utils/dateUtils.js";

// ── Xác định loại OT (weekday/weekend/holiday) ───────────────────────────────
async function determineOtType(date, companyId) {
  if (isWeekend(date)) return "weekend";

  const dateStr = new Date(date).toISOString().split("T")[0];
  const holiday = await HolidayCalendar.findOne({
    company: companyId,
    $or: [
      { date: { $gte: new Date(dateStr), $lt: new Date(new Date(dateStr).getTime() + 86400000) }, isRecurringYearly: false },
    ],
  }).lean();

  return holiday ? "holiday" : "weekday";
}

// ── Tạo đơn OT ───────────────────────────────────────────────────────────────
export const createOvertimeRequest = async (req, res) => {
  try {
    const { workDate, fromTime, toTime, reason, compensationType = "pay" } = req.body;

    const employee = await Employee.findOne({ email: req.user.email, deletedAt: null }).lean();
    if (!employee) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });

    // Tính tổng giờ OT
    const [fh, fm] = fromTime.split(":").map(Number);
    const [th, tm] = toTime.split(":").map(Number);
    const totalHours = ((th * 60 + tm) - (fh * 60 + fm)) / 60;
    if (totalHours <= 0) {
      return res.status(400).json({ success: false, message: "Thời gian OT không hợp lệ" });
    }

    // Kiểm tra trùng OT cùng ngày
    const existing = await OvertimeRequest.findOne({
      employee: employee._id,
      workDate: new Date(workDate),
      status: { $in: ["pending", "approved"] },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "Đã có đăng ký OT cho ngày này" });
    }

    const otType = await determineOtType(new Date(workDate), employee.company);

    const request = await OvertimeRequest.create({
      employee: employee._id,
      company: employee.company,
      workDate: new Date(workDate),
      fromTime,
      toTime,
      totalHours,
      reason,
      otType,
      compensationType,
      status: "draft",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Đã tạo đơn OT (draft)",
      data: { ...request.toObject(), otType },
    });
  } catch (error) {
    console.error("createOvertimeRequest:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Xem danh sách OT của nhân viên ────────────────────────────────────────────
export const getMyOvertimeRequests = async (req, res) => {
  try {
    const employee = await Employee.findOne({ email: req.user.email, deletedAt: null }).lean();
    if (!employee) return res.status(200).json({ success: true, data: [], pagination: { total: 0, page: 1 } });

    const { status, month, year, page = 1, limit = 20 } = req.query;
    const filter = { employee: employee._id };
    if (status) filter.status = status;
    if (month && year) {
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);
      filter.workDate = { $gte: from, $lte: to };
    }

    const [data, total] = await Promise.all([
      OvertimeRequest.find(filter).sort({ workDate: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      OvertimeRequest.countDocuments(filter),
    ]);

    return res.status(200).json({ success: true, data, pagination: { total, page: Number(page) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
