import LeaveRequest from "../models/LeaveRequest.js";
import LeaveBalance from "../models/LeaveBalance.js";
import LeaveType from "../models/LeaveType.js";
import Employee from "../models/Employee.js";
import { countWorkingDays } from "../utils/dateUtils.js";

// ── Tạo đơn nghỉ phép (draft) ─────────────────────────────────────────────────
export const createLeaveRequest = async (req, res) => {
  try {
    const { leaveTypeId, fromDate, toDate, halfDay = "full", reason, attachment } = req.body;

    const employee = await Employee.findOne({ email: req.user.email, deletedAt: null }).lean();
    if (!employee) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });

    const leaveType = await LeaveType.findById(leaveTypeId).lean();
    if (!leaveType || !leaveType.isActive) {
      return res.status(400).json({ success: false, message: "Loại phép không hợp lệ" });
    }

    // Tính số ngày thực tế (loại trừ lễ, cuối tuần)
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (from > to) return res.status(400).json({ success: false, message: "Ngày bắt đầu phải trước ngày kết thúc" });

    const totalDays = await countWorkingDays(from, to, employee.company, halfDay);
    if (totalDays <= 0) return res.status(400).json({ success: false, message: "Khoảng ngày không có ngày làm việc hợp lệ" });

    // Kiểm tra số ngày phép còn đủ không
    const balance = await LeaveBalance.findOne({
      employee: employee._id,
      leaveType: leaveTypeId,
      year: new Date().getFullYear(),
    }).lean();

    if (balance) {
      const remaining = (balance.allocated || 0) + (balance.carryOver || 0) + (balance.adjustment || 0) - (balance.used || 0) - (balance.pending || 0);
      if (remaining < totalDays) {
        return res.status(400).json({
          success: false,
          message: `Không đủ ngày phép. Còn lại: ${remaining} ngày, yêu cầu: ${totalDays} ngày`,
        });
      }
    }

    // Kiểm tra không trùng đơn đã có
    const overlap = await LeaveRequest.findOne({
      employee: employee._id,
      status: { $in: ["pending", "approved"] },
      fromDate: { $lte: to },
      toDate: { $gte: from },
    });
    if (overlap) {
      return res.status(400).json({ success: false, message: "Đã có đơn nghỉ phép trong khoảng thời gian này" });
    }

    const request = await LeaveRequest.create({
      employee: employee._id,
      company: employee.company,
      leaveType: leaveTypeId,
      fromDate: from,
      toDate: to,
      halfDay,
      totalDays,
      reason,
      attachment: attachment || null,
      status: "draft",
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, message: "Đã tạo đơn nghỉ phép (draft)", data: request });
  } catch (error) {
    console.error("createLeaveRequest:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Xem số ngày phép còn lại ─────────────────────────────────────────────────
export const getMyLeaveBalance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ email: req.user.email, deletedAt: null }).lean();
    if (!employee) return res.status(200).json({ success: true, data: [] });

    const year = Number(req.query.year) || new Date().getFullYear();
    const balances = await LeaveBalance.find({ employee: employee._id, year })
      .populate("leaveType", "name code isPaid maxDaysPerYear")
      .lean();

    // Thêm remaining vào mỗi balance
    const data = balances.map((b) => ({
      ...b,
      remaining: (b.allocated || 0) + (b.carryOver || 0) + (b.adjustment || 0) - (b.used || 0) - (b.pending || 0),
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── CRUD LeaveType (HR Admin) ─────────────────────────────────────────────────
export const getLeaveTypes = async (req, res) => {
  try {
    const types = await LeaveType.find({ company: req.user.companyId, deletedAt: null }).lean();
    return res.status(200).json({ success: true, data: types });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const createLeaveType = async (req, res) => {
  try {
    const lt = await LeaveType.create({ ...req.body, company: req.user.companyId, createdBy: req.user._id });
    return res.status(201).json({ success: true, data: lt });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: "Mã loại phép đã tồn tại" });
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const updateLeaveType = async (req, res) => {
  try {
    const lt = await LeaveType.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true }
    );
    if (!lt) return res.status(404).json({ success: false, message: "Không tìm thấy" });
    return res.status(200).json({ success: true, data: lt });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Cấp phép đầu năm (HR khởi tạo LeaveBalance) ─────────────────────────────
export const initLeaveBalance = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, year, allocated, carryOver = 0 } = req.body;

    const existing = await LeaveBalance.findOne({ employee: employeeId, leaveType: leaveTypeId, year });
    if (existing) {
      return res.status(400).json({ success: false, message: "Đã có số dư phép cho năm này" });
    }

    const balance = await LeaveBalance.create({
      employee: employeeId,
      leaveType: leaveTypeId,
      year,
      allocated,
      carryOver,
      used: 0,
      pending: 0,
      updatedBy: req.user._id,
    });

    return res.status(201).json({ success: true, data: balance });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
