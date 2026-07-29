import WorkScheduleAssignment from "../models/WorkScheduleAssignment.js";
import Employee from "../models/Employee.js";
import { normalizeToStartOfDay } from "../utils/dateUtils.js";

// ── Phân ca cho nhân viên (bulk assign) ──────────────────────────────────────
export const assignShifts = async (req, res) => {
  try {
    /**
     * Body: [
     *   { employeeId, shiftTemplateId, workDate, isOff }
     * ]
     */
    const assignments = req.body;
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ success: false, message: "Cần truyền danh sách phân ca" });
    }

    const companyId = req.user.companyId;
    const ops = assignments.map(({ employeeId, shiftTemplateId, workDate, isOff, note }) => ({
      updateOne: {
        filter: { employee: employeeId, workDate: normalizeToStartOfDay(workDate) },
        update: {
          $set: {
            company: companyId,
            shiftTemplate: isOff ? null : shiftTemplateId,
            isOff: Boolean(isOff),
            note: note || "",
            updatedBy: req.user._id,
          },
          $setOnInsert: { createdBy: req.user._id },
        },
        upsert: true,
      },
    }));

    const result = await WorkScheduleAssignment.bulkWrite(ops);

    return res.status(200).json({
      success: true,
      message: `Đã phân ca ${assignments.length} bản ghi`,
      data: { upserted: result.upsertedCount, modified: result.modifiedCount },
    });
  } catch (error) {
    console.error("assignShifts:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Xem lịch ca theo tháng / phòng ban ────────────────────────────────────────
export const getSchedule = async (req, res) => {
  try {
    const { month, year, employeeId, departmentId } = req.query;

    const from = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 0);

    const filter = { workDate: { $gte: from, $lte: to } };

    if (employeeId) {
      filter.employee = employeeId;
    } else if (departmentId) {
      const employees = await Employee.find({ department: departmentId, deletedAt: null }).select("_id").lean();
      filter.employee = { $in: employees.map((e) => e._id) };
    } else {
      filter.company = req.user.companyId;
    }

    const schedule = await WorkScheduleAssignment.find(filter)
      .populate("employee", "empCode fullName department")
      .populate("shiftTemplate", "name startTime endTime color workingHours")
      .sort({ workDate: 1, employee: 1 })
      .lean();

    return res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Xem lịch ca cá nhân (ESS) ────────────────────────────────────────────────
export const getMySchedule = async (req, res) => {
  try {
    const employee = await Employee.findOne({ email: req.user.email, deletedAt: null }).lean();
    if (!employee) return res.status(200).json({ success: true, data: [] });

    const { month, year } = req.query;
    const from = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 0);

    const schedule = await WorkScheduleAssignment.find({
      employee: employee._id,
      workDate: { $gte: from, $lte: to },
    })
      .populate("shiftTemplate", "name startTime endTime color workingHours breakMinutes")
      .sort({ workDate: 1 })
      .lean();

    return res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
