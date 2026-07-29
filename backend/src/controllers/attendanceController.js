import Employee from "../models/Employee.js";
import AttendanceLog from "../models/AttendanceLog.js";
import AttendanceSummary from "../models/AttendanceSummary.js";
import WorkScheduleAssignment from "../models/WorkScheduleAssignment.js";
import CompanyLocation from "../models/CompanyLocation.js";
import ShiftTemplate from "../models/ShiftTemplate.js";
import { findNearestLocation } from "../utils/gpsUtils.js";
import { verifyFace, isValidDescriptor } from "../utils/faceUtils.js";
import { normalizeToStartOfDay, timeToMinutes } from "../utils/dateUtils.js";

// ── Check-in ─────────────────────────────────────────────────────────────────
export const checkIn = async (req, res) => {
  try {
    const { latitude, longitude, gpsAccuracy, faceDescriptor, deviceInfo } = req.body;
    const userId = req.user._id;

    // Tìm Employee từ User
    const employee = await Employee.findOne({ _id: req.user.employeeId || null })
      .select("faceEmbedding faceRegisteredAt company defaultShift")
      .lean();

    // Fallback: tìm employee liên kết với user này
    const emp = employee || await Employee.findOne({
      email: req.user.email,
      deletedAt: null,
    }).select("faceEmbedding faceRegisteredAt company defaultShift _id").lean();

    if (!emp) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thông tin nhân viên" });
    }

    const companyId = emp.company;
    const workDate = normalizeToStartOfDay(new Date());

    // Kiểm tra đã check-in chưa
    const existingCheckin = await AttendanceLog.findOne({
      employee: emp._id,
      workDate,
      type: "check-in",
    });
    if (existingCheckin) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã check-in hôm nay rồi",
        data: { checkInTime: existingCheckin.timestamp },
      });
    }

    // ── GPS Validation ──────────────────────────────────────────────
    let gpsResult = { location: null, distance: null, isWithin: false, allowedRadius: 100 };
    if (latitude != null && longitude != null) {
      const locations = await CompanyLocation.find({
        company: companyId,
        isActive: true,
      }).lean();
      gpsResult = findNearestLocation(latitude, longitude, locations);
    }

    // ── Face Validation ─────────────────────────────────────────────
    let faceResult = { verified: false, distance: null, score: 0, reason: "Chưa xác thực khuôn mặt" };
    if (faceDescriptor && isValidDescriptor(faceDescriptor)) {
      faceResult = verifyFace(faceDescriptor, emp.faceEmbedding);
    }

    // ── Xác định hợp lệ tổng hợp ───────────────────────────────────
    const gpsOk = gpsResult.isWithin;
    const faceOk = faceResult.verified;
    const isValid = gpsOk && faceOk; // Cả 2 phải đạt

    const invalidReasons = [];
    if (!gpsOk) {
      invalidReasons.push(
        gpsResult.distance != null
          ? `GPS ngoài vùng (${gpsResult.distance}m > ${gpsResult.allowedRadius}m)`
          : "Không có dữ liệu GPS"
      );
    }
    if (!faceOk) invalidReasons.push(faceResult.reason || "Xác thực khuôn mặt thất bại");

    // ── Tạo AttendanceLog ───────────────────────────────────────────
    const log = await AttendanceLog.create({
      employee: emp._id,
      company: companyId,
      workDate,
      type: "check-in",
      timestamp: new Date(),
      method: "gps-face",
      latitude,
      longitude,
      gpsAccuracy,
      officeLocation: gpsResult.location?._id,
      distanceFromOffice: gpsResult.distance,
      allowedRadius: gpsResult.allowedRadius,
      isWithinAllowedRadius: gpsOk,
      faceDistance: faceResult.distance,
      faceMatchScore: faceResult.score,
      faceVerified: faceOk,
      isValid,
      invalidReason: invalidReasons.length > 0 ? invalidReasons.join("; ") : null,
      ipAddress: req.ip,
      deviceInfo: deviceInfo || req.headers["user-agent"],
      createdBy: userId,
    });

    // ── Khởi tạo/cập nhật AttendanceSummary ────────────────────────
    const schedule = await WorkScheduleAssignment.findOne({
      employee: emp._id,
      workDate,
    }).populate("shiftTemplate").lean();

    await AttendanceSummary.findOneAndUpdate(
      { employee: emp._id, workDate },
      {
        $setOnInsert: {
          employee: emp._id,
          company: companyId,
          workDate,
          shiftTemplate: schedule?.shiftTemplate?._id || emp.defaultShift,
          plannedWorkMinutes: schedule?.shiftTemplate?.workingHours
            ? schedule.shiftTemplate.workingHours * 60
            : 0,
        },
        $set: { checkInTime: log.timestamp },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: isValid ? "Check-in thành công" : "Check-in ghi nhận nhưng có cảnh báo",
      data: {
        checkInTime: log.timestamp,
        isValid,
        gps: {
          distance: gpsResult.distance,
          allowedRadius: gpsResult.allowedRadius,
          isWithin: gpsOk,
          officeName: gpsResult.location?.name,
        },
        face: {
          verified: faceOk,
          score: faceResult.score,
        },
        warnings: invalidReasons,
      },
    });
  } catch (error) {
    console.error("checkIn error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Check-out ────────────────────────────────────────────────────────────────
export const checkOut = async (req, res) => {
  try {
    const { latitude, longitude, gpsAccuracy, faceDescriptor, deviceInfo } = req.body;

    const emp = await Employee.findOne({
      email: req.user.email,
      deletedAt: null,
    }).select("faceEmbedding company defaultShift _id").lean();

    if (!emp) {
      return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    const workDate = normalizeToStartOfDay(new Date());

    // Kiểm tra đã check-in chưa
    const checkInLog = await AttendanceLog.findOne({
      employee: emp._id,
      workDate,
      type: "check-in",
    });
    if (!checkInLog) {
      return res.status(400).json({ success: false, message: "Chưa check-in hôm nay" });
    }

    // Kiểm tra đã check-out chưa
    const existing = await AttendanceLog.findOne({
      employee: emp._id,
      workDate,
      type: "check-out",
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Đã check-out hôm nay",
        data: { checkOutTime: existing.timestamp },
      });
    }

    // GPS + Face validation (tương tự check-in)
    let gpsResult = { location: null, distance: null, isWithin: false, allowedRadius: 100 };
    if (latitude != null && longitude != null) {
      const locations = await CompanyLocation.find({ company: emp.company, isActive: true }).lean();
      gpsResult = findNearestLocation(latitude, longitude, locations);
    }

    let faceResult = { verified: false, distance: null, score: 0 };
    if (faceDescriptor && isValidDescriptor(faceDescriptor)) {
      faceResult = verifyFace(faceDescriptor, emp.faceEmbedding);
    }

    const isValid = gpsResult.isWithin && faceResult.verified;

    // Log check-out
    const log = await AttendanceLog.create({
      employee: emp._id,
      company: emp.company,
      workDate,
      type: "check-out",
      timestamp: new Date(),
      method: "gps-face",
      latitude,
      longitude,
      gpsAccuracy,
      officeLocation: gpsResult.location?._id,
      distanceFromOffice: gpsResult.distance,
      allowedRadius: gpsResult.allowedRadius,
      isWithinAllowedRadius: gpsResult.isWithin,
      faceDistance: faceResult.distance,
      faceMatchScore: faceResult.score,
      faceVerified: faceResult.verified,
      isValid,
      ipAddress: req.ip,
      deviceInfo: deviceInfo || req.headers["user-agent"],
      createdBy: req.user._id,
    });

    // ── Cập nhật AttendanceSummary ──────────────────────────────────
    await updateSummaryOnCheckout(emp._id, workDate, checkInLog.timestamp, log.timestamp);

    return res.status(200).json({
      success: true,
      message: "Check-out thành công",
      data: {
        checkOutTime: log.timestamp,
        isValid,
        gps: { distance: gpsResult.distance, isWithin: gpsResult.isWithin },
        face: { verified: faceResult.verified, score: faceResult.score },
      },
    });
  } catch (error) {
    console.error("checkOut error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Helper: Tổng hợp AttendanceSummary sau checkout ──────────────────────────
async function updateSummaryOnCheckout(employeeId, workDate, checkInTime, checkOutTime) {
  const summary = await AttendanceSummary.findOne({ employee: employeeId, workDate });
  if (!summary || summary.lockedAt) return;

  const actualMinutes = Math.round((checkOutTime - checkInTime) / 60000);

  // Tính đi muộn / về sớm nếu có ca
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let status = "present";

  if (summary.shiftTemplate) {
    const shift = await ShiftTemplate.findById(summary.shiftTemplate).lean();
    if (shift) {
      const scheduledStartMins = timeToMinutes(shift.startTime);
      const scheduledEndMins = timeToMinutes(shift.endTime);
      const actualStartMins =
        checkInTime.getHours() * 60 + checkInTime.getMinutes();
      const actualEndMins =
        checkOutTime.getHours() * 60 + checkOutTime.getMinutes();

      const rawLate = actualStartMins - scheduledStartMins;
      const rawEarly = scheduledEndMins - actualEndMins;

      lateMinutes = rawLate > (shift.allowedLateMins || 0) ? rawLate : 0;
      earlyLeaveMinutes = rawEarly > (shift.allowedEarlyMins || 0) ? rawEarly : 0;

      if (lateMinutes > 0 && earlyLeaveMinutes > 0) status = "late-early";
      else if (lateMinutes > 0) status = "late";
      else if (earlyLeaveMinutes > 0) status = "early-leave";
      else status = "present";
    }
  }

  await AttendanceSummary.findOneAndUpdate(
    { employee: employeeId, workDate },
    {
      $set: {
        checkOutTime,
        actualWorkMinutes: actualMinutes,
        lateMinutes,
        earlyLeaveMinutes,
        status,
      },
    }
  );
}

// ── Xem chấm công hôm nay (ESS) ──────────────────────────────────────────────
export const getMyToday = async (req, res) => {
  try {
    const emp = await Employee.findOne({ email: req.user.email, deletedAt: null }).lean();
    if (!emp) return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });

    const workDate = normalizeToStartOfDay(new Date());

    const [checkInLog, checkOutLog, summary] = await Promise.all([
      AttendanceLog.findOne({ employee: emp._id, workDate, type: "check-in" }).lean(),
      AttendanceLog.findOne({ employee: emp._id, workDate, type: "check-out" }).lean(),
      AttendanceSummary.findOne({ employee: emp._id, workDate })
        .populate("shiftTemplate", "name startTime endTime")
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        workDate,
        checkIn: checkInLog ? { time: checkInLog.timestamp, isValid: checkInLog.isValid } : null,
        checkOut: checkOutLog ? { time: checkOutLog.timestamp, isValid: checkOutLog.isValid } : null,
        summary: summary || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Xem lịch sử chấm công (HR/Manager) ───────────────────────────────────────
export const getAttendanceSummary = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      departmentId,
      page = 1,
      limit = 50,
    } = req.query;

    const fromDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
    const toDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0);

    const filter = {
      workDate: { $gte: fromDate, $lte: toDate },
    };
    if (employeeId) filter.employee = employeeId;

    // Nếu filter theo phòng ban → tìm danh sách employee trước
    if (departmentId && !employeeId) {
      const employees = await Employee.find({ department: departmentId, deletedAt: null }).select("_id").lean();
      filter.employee = { $in: employees.map((e) => e._id) };
    }

    const [data, total] = await Promise.all([
      AttendanceSummary.find(filter)
        .populate("employee", "empCode fullName department")
        .populate("shiftTemplate", "name startTime endTime")
        .sort({ workDate: -1, employee: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      AttendanceSummary.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("getAttendanceSummary error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Đăng ký khuôn mặt (HR thực hiện cho nhân viên) ───────────────────────────
export const registerFace = async (req, res) => {
  try {
    const { employeeId, faceDescriptor, faceImageUrl } = req.body;

    if (!isValidDescriptor(faceDescriptor)) {
      return res.status(400).json({
        success: false,
        message: "Descriptor khuôn mặt không hợp lệ (phải là mảng 128 số)",
      });
    }

    const updated = await Employee.findByIdAndUpdate(
      employeeId,
      {
        faceEmbedding: faceDescriptor,
        faceRegisteredAt: new Date(),
        faceImageUrl: faceImageUrl || null,
        updatedBy: req.user._id,
      },
      { new: true, select: "fullName empCode faceRegisteredAt faceImageUrl" }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Không tìm thấy nhân viên" });
    }

    return res.status(200).json({
      success: true,
      message: "Đăng ký khuôn mặt thành công",
      data: updated,
    });
  } catch (error) {
    console.error("registerFace error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Manual edit (HR override) ─────────────────────────────────────────────────
export const manualEditSummary = async (req, res) => {
  try {
    const { summaryId } = req.params;
    const { checkInTime, checkOutTime, status, note } = req.body;

    const summary = await AttendanceSummary.findById(summaryId);
    if (!summary) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi" });
    if (summary.lockedAt) {
      return res.status(400).json({ success: false, message: "Bản ghi đã được khóa, không thể sửa" });
    }

    if (checkInTime) summary.checkInTime = new Date(checkInTime);
    if (checkOutTime) summary.checkOutTime = new Date(checkOutTime);
    if (status) summary.status = status;
    if (note) summary.note = note;
    summary.manuallyEdited = true;
    summary.editedBy = req.user._id;
    summary.editedAt = new Date();

    if (checkInTime && checkOutTime) {
      summary.actualWorkMinutes = Math.round(
        (new Date(checkOutTime) - new Date(checkInTime)) / 60000
      );
    }

    await summary.save();

    return res.status(200).json({ success: true, message: "Cập nhật thành công", data: summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
