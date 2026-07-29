/**
 * approvalController.js – Engine phê duyệt ESS
 *
 * Luồng 2 tầng (Phase 2):
 *   Step 1: Quản lý trực tiếp (Employee.reportsTo) → approve/reject
 *   Step 2: HR (role với permission approval:manage) → notify only (tự động noted)
 *
 * Extensible: thêm step vào ApprovalFlow là mở rộng được luồng
 */

import LeaveRequest from "../models/LeaveRequest.js";
import OvertimeRequest from "../models/OvertimeRequest.js";
import AssetRequest from "../models/AssetRequest.js";
import ApprovalFlow from "../models/ApprovalFlow.js";
import Employee from "../models/Employee.js";
import LeaveBalance from "../models/LeaveBalance.js";
import Department from "../models/Department.js";
import AttendanceSummary from "../models/AttendanceSummary.js";


// ── Helper: Resolve approver theo orgchart ────────────────────────────────────
/**
 * Tìm approver của một step dựa vào cấu hình ApprovalFlow
 * @param {Object} step - ApprovalFlow step config
 * @param {Object} employee - Nhân viên gửi đơn (populated)
 * @returns {Promise<ObjectId|null>} employeeId của người cần duyệt
 */
async function resolveApprover(step, employee) {
  switch (step.approverType) {
    case "direct-manager":
      return employee.reportsTo || null;

    case "department-manager": {
      const dept = await Department
        .findById(employee.department)
        .select("manager")
        .lean();
      return dept?.manager || null;
    }

    case "specific-employee":
      return step.specificApprover || null;

    case "hr":
      // notifyOnly = true, không cần resolve người cụ thể
      return null;

    default:
      return null;
  }
}

// ── Helper: Lấy model theo requestType ───────────────────────────────────────
function getModel(requestType) {
  const map = {
    leave: LeaveRequest,
    overtime: OvertimeRequest,
    asset: AssetRequest,
  };
  return map[requestType] || null;
}

// ── Submit đơn (chuyển draft → pending) ──────────────────────────────────────
export const submitRequest = async (req, res) => {
  try {
    const { requestType, requestId } = req.params;
    const Model = getModel(requestType);
    if (!Model) return res.status(400).json({ success: false, message: "Loại đề xuất không hợp lệ" });

    const request = await Model.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: "Không tìm thấy đề xuất" });
    if (request.status !== "draft") {
      return res.status(400).json({ success: false, message: "Chỉ có thể gửi đề xuất ở trạng thái draft" });
    }

    // Kiểm tra quyền: chỉ chủ đơn mới submit được
    const employee = await Employee.findOne({ email: req.user.email, deletedAt: null })
      .populate("reportsTo", "_id fullName")
      .lean();

    if (!employee || String(request.employee) !== String(employee._id)) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền gửi đề xuất này" });
    }

    // Tìm ApprovalFlow mặc định cho loại request này
    let flow = await ApprovalFlow.findOne({
      company: employee.company,
      requestType,
      isDefault: true,
      isActive: true,
    }).lean();

    // Fallback: Nếu không có luồng mặc định, lấy luồng đầu tiên đang active
    if (!flow) {
      flow = await ApprovalFlow.findOne({
        company: employee.company,
        requestType,
        isActive: true,
      }).lean();
    }

    if (!flow || !flow.steps?.length) {
      return res.status(400).json({
        success: false,
        message: "Chưa cấu hình luồng phê duyệt cho loại đề xuất này",
      });
    }

    // Resolve approver của Step 1
    const step1 = flow.steps.find((s) => s.step === 1);
    const step1ApproverId = step1 ? await resolveApprover(step1, employee) : null;

    // Cập nhật LeaveBalance.pending nếu là leave request
    if (requestType === "leave" && request.totalDays > 0) {
      await LeaveBalance.findOneAndUpdate(
        { employee: employee._id, leaveType: request.leaveType, year: new Date().getFullYear() },
        { $inc: { pending: request.totalDays } }
      );
    }

    // Cập nhật request
    request.status = "pending";
    request.approvalFlow = flow._id;
    request.currentStep = 1;
    request.currentApprover = step1ApproverId;
    request.submittedAt = new Date();
    await request.save();

    return res.status(200).json({
      success: true,
      message: "Đề xuất đã được gửi đi, đang chờ phê duyệt",
      data: {
        status: request.status,
        currentStep: request.currentStep,
        approverName: employee.reportsTo?.fullName || "Chưa xác định quản lý",
      },
    });
  } catch (error) {
    console.error("submitRequest error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Phê duyệt / Từ chối ──────────────────────────────────────────────────────
export const approveRequest = async (req, res) => {
  try {
    const { requestType, requestId } = req.params;
    const { action, comment } = req.body; // action: 'approved' | 'rejected'

    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action phải là 'approved' hoặc 'rejected'" });
    }

    const Model = getModel(requestType);
    if (!Model) return res.status(400).json({ success: false, message: "Loại đề xuất không hợp lệ" });

    const request = await Model.findById(requestId).populate("approvalFlow");
    if (!request) return res.status(404).json({ success: false, message: "Không tìm thấy đề xuất" });
    if (request.status !== "pending") {
      return res.status(400).json({ success: false, message: "Đề xuất không ở trạng thái chờ duyệt" });
    }

    // Xác định approver hiện tại có phải user này không
    const currentApproverEmployee = await Employee.findById(request.currentApprover).lean();
    const isApprover = currentApproverEmployee &&
      String(currentApproverEmployee.email) === String(req.user.email);

    if (!isApprover) {
      return res.status(403).json({ success: false, message: "Bạn không phải người phê duyệt ở bước này" });
    }

    // Ghi lịch sử
    const historyEntry = {
      step: request.currentStep,
      approver: currentApproverEmployee._id,
      approverUser: req.user._id,
      action,
      comment: comment || "",
      actionAt: new Date(),
      notifyOnly: false,
    };
    request.approvalHistory.push(historyEntry);

    const flow = request.approvalFlow;
    const currentStepConfig = flow?.steps?.find((s) => s.step === request.currentStep);
    const nextStepConfig = flow?.steps?.find((s) => s.step === request.currentStep + 1);

    if (action === "rejected") {
      // Reject: dừng luồng ngay
      request.status = "rejected";
      request.rejectedAt = new Date();
      request.currentApprover = null;

      // Hoàn trả LeaveBalance.pending
      if (requestType === "leave" && request.totalDays > 0) {
        await LeaveBalance.findOneAndUpdate(
          { employee: request.employee, leaveType: request.leaveType, year: new Date().getFullYear() },
          { $inc: { pending: -request.totalDays } }
        );
      }
    } else if (action === "approved") {
      if (nextStepConfig) {
        // Chuyển sang bước tiếp theo
        request.currentStep += 1;

        if (nextStepConfig.notifyOnly) {
          // Step notifyOnly (HR theo dõi): tự động noted, kết thúc luồng
          request.approvalHistory.push({
            step: nextStepConfig.step,
            approver: null,
            approverUser: null,
            action: "noted",
            comment: "Tự động ghi nhận (HR theo dõi)",
            actionAt: new Date(),
            notifyOnly: true,
          });
          request.status = "approved";
          request.approvedAt = new Date();
          request.currentApprover = null;
          await finalizeApproval(requestType, request);
        } else {
          // Tiếp tục sang approver tiếp theo
          const requester = await Employee.findById(request.employee)
            .populate("reportsTo", "_id")
            .lean();
          const nextApproverId = await resolveApprover(nextStepConfig, requester);
          request.currentApprover = nextApproverId;
        }
      } else {
        // Đây là bước cuối cùng → approved
        request.status = "approved";
        request.approvedAt = new Date();
        request.currentApprover = null;
        await finalizeApproval(requestType, request);
      }
    }

    await request.save();

    return res.status(200).json({
      success: true,
      message: action === "approved" ? "Đã phê duyệt thành công" : "Đã từ chối đề xuất",
      data: { status: request.status, currentStep: request.currentStep },
    });
  } catch (error) {
    console.error("approveRequest error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Helper: Xử lý sau khi approved ───────────────────────────────────────────
async function finalizeApproval(requestType, request) {
  if (requestType === "leave") {
    // Cập nhật LeaveBalance: pending → used
    await LeaveBalance.findOneAndUpdate(
      {
        employee: request.employee,
        leaveType: request.leaveType,
        year: new Date(request.fromDate).getFullYear(),
      },
      {
        $inc: {
          pending: -(request.totalDays || 0),
          used: request.totalDays || 0,
        },
      }
    );

    // Đánh dấu các ngày nghỉ trong AttendanceSummary
    const current = new Date(request.fromDate);
    while (current <= new Date(request.toDate)) {
      await AttendanceSummary.findOneAndUpdate(
        { employee: request.employee, workDate: new Date(current) },
        {
          $set: {
            isOnLeave: true,
            leaveRequest: request._id,
            status: "on-leave",
          },
        },
        { upsert: true }
      );
      current.setDate(current.getDate() + 1);
    }
  } else if (requestType === "overtime") {
    // Đánh dấu AttendanceSummary có OT được duyệt
    await AttendanceSummary.findOneAndUpdate(
      { employee: request.employee, workDate: request.workDate },
      {
        $set: {
          hasOvertimeApproved: true,
          overtimeRequest: request._id,
          overtimeMinutes: Math.round(request.totalHours * 60),
        },
      },
      { upsert: true }
    );
  }
}

// ── Hủy đề xuất (chủ đơn tự hủy) ────────────────────────────────────────────
export const cancelRequest = async (req, res) => {
  try {
    const { requestType, requestId } = req.params;
    const { cancelReason } = req.body;

    const Model = getModel(requestType);
    const request = await Model.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: "Không tìm thấy" });
    if (!["draft", "pending"].includes(request.status)) {
      return res.status(400).json({ success: false, message: "Không thể hủy đề xuất đã xử lý" });
    }

    if (request.status === "pending" && requestType === "leave" && request.totalDays > 0) {
      await LeaveBalance.findOneAndUpdate(
        { employee: request.employee, leaveType: request.leaveType, year: new Date().getFullYear() },
        { $inc: { pending: -request.totalDays } }
      );
    }

    request.status = "cancelled";
    request.cancelledAt = new Date();
    request.cancelledBy = req.user._id;
    request.cancelReason = cancelReason || "";
    await request.save();

    return res.status(200).json({ success: true, message: "Đã hủy đề xuất" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Lấy danh sách pending của approver hiện tại (Approval Inbox) ──────────────
export const getPendingApprovals = async (req, res) => {
  try {
    const employee = await Employee.findOne({ email: req.user.email, deletedAt: null }).lean();
    if (!employee) return res.status(200).json({ success: true, data: { leave: [], overtime: [], asset: [], totalPending: 0 } });

    const [leaves, overtimes, assets] = await Promise.all([
      LeaveRequest.find({ currentApprover: employee._id, status: "pending" })
        .populate("employee", "empCode fullName department")
        .populate("leaveType", "name code")
        .sort({ submittedAt: 1 })
        .lean(),
      OvertimeRequest.find({ currentApprover: employee._id, status: "pending" })
        .populate("employee", "empCode fullName department")
        .sort({ submittedAt: 1 })
        .lean(),
      AssetRequest.find({ currentApprover: employee._id, status: "pending" })
        .populate("employee", "empCode fullName department")
        .sort({ submittedAt: 1 })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        leave: leaves,
        overtime: overtimes,
        asset: assets,
        totalPending: leaves.length + overtimes.length + assets.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ── Lấy lịch sử đề xuất của nhân viên (ESS My Requests) ──────────────────────
export const getMyRequests = async (req, res) => {
  try {
    const employee = await Employee.findOne({ email: req.user.email, deletedAt: null }).lean();
    if (!employee) return res.status(200).json({ success: true, data: [], pagination: { total: 0, page: 1 } });

    const { requestType = "leave", status, page = 1, limit = 20 } = req.query;
    const Model = getModel(requestType);
    if (!Model) return res.status(400).json({ success: false, message: "Loại không hợp lệ" });

    const filter = { employee: employee._id };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      Model.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate(requestType === "leave" ? "leaveType" : undefined, "name code")
        .lean(),
      Model.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
