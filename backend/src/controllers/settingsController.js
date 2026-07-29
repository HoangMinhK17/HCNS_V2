import CompanyLocation from "../models/CompanyLocation.js";
import HolidayCalendar from "../models/HolidayCalendar.js";
import ApprovalFlow from "../models/ApprovalFlow.js";

// ── CompanyLocation CRUD ──────────────────────────────────────────────────────
export const getLocations = async (req, res) => {
  try {
    const locations = await CompanyLocation.find({ company: req.user.companyId }).sort({ isActive: -1 }).lean();
    return res.status(200).json({ success: true, data: locations });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const createLocation = async (req, res) => {
  try {
    const { name, address, latitude, longitude, allowedRadius = 100 } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: "Cần cung cấp tọa độ GPS" });
    }
    const loc = await CompanyLocation.create({
      company: req.user.companyId,
      name,
      address,
      latitude: Number(latitude),
      longitude: Number(longitude),
      allowedRadius: Number(allowedRadius),
      isActive: true,
      createdBy: req.user._id,
    });
    return res.status(201).json({ success: true, data: loc });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const loc = await CompanyLocation.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true }
    );
    if (!loc) return res.status(404).json({ success: false, message: "Không tìm thấy địa điểm" });
    return res.status(200).json({ success: true, data: loc });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const deleteLocation = async (req, res) => {
  try {
    await CompanyLocation.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.status(200).json({ success: true, message: "Đã vô hiệu hóa địa điểm" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── HolidayCalendar CRUD ──────────────────────────────────────────────────────
export const getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    const filter = { company: req.user.companyId };
    if (year) filter.$or = [{ year: Number(year) }, { isRecurringYearly: true }];

    const holidays = await HolidayCalendar.find(filter).sort({ date: 1 }).lean();
    return res.status(200).json({ success: true, data: holidays });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const createHoliday = async (req, res) => {
  try {
    const { date, name, isRecurringYearly = false, isHalfDay = false, note } = req.body;
    const d = new Date(date);
    const h = await HolidayCalendar.create({
      company: req.user.companyId,
      date: d,
      name,
      isRecurringYearly,
      year: isRecurringYearly ? null : d.getFullYear(),
      isHalfDay,
      note,
      createdBy: req.user._id,
    });
    return res.status(201).json({ success: true, data: h });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const updateHoliday = async (req, res) => {
  try {
    const h = await HolidayCalendar.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!h) return res.status(404).json({ success: false, message: "Không tìm thấy" });
    return res.status(200).json({ success: true, data: h });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    await HolidayCalendar.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "Đã xóa ngày lễ" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── CRUD ApprovalFlow ─────────────────────────────────────────────────────────
export const getApprovalFlows = async (req, res) => {
  try {
    const flows = await ApprovalFlow.find({ company: req.user.companyId, isActive: true }).lean();
    return res.status(200).json({ success: true, data: flows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const createApprovalFlow = async (req, res) => {
  try {
    const flow = await ApprovalFlow.create({
      ...req.body,
      company: req.user.companyId || req.user.company,
      createdBy: req.user._id,
    });
    return res.status(201).json({ success: true, data: flow });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

export const deleteApprovalFlow = async (req, res) => {
  try {
    await ApprovalFlow.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.status(200).json({ success: true, message: "Đã xóa luồng phê duyệt" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

export const updateApprovalFlow = async (req, res) => {
  try {
    const flow = await ApprovalFlow.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!flow) return res.status(404).json({ success: false, message: "Không tìm thấy" });
    return res.status(200).json({ success: true, data: flow });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
}
