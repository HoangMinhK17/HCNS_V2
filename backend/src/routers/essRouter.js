import express from "express";
import { verifyToken, checkPermission } from "../middleware/authMiddleware.js";

// Leave
import {
  createLeaveRequest,
  getMyLeaveBalance,
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  initLeaveBalance,
} from "../controllers/leaveController.js";

// Overtime
import {
  createOvertimeRequest,
  getMyOvertimeRequests,
} from "../controllers/overtimeController.js";

// Asset
import {
  createAssetRequest,
  getMyAssetRequests,
  fulfillAssetRequest,
} from "../controllers/assetRequestController.js";

// Approval engine
import {
  submitRequest,
  approveRequest,
  cancelRequest,
  getPendingApprovals,
  getMyRequests,
} from "../controllers/approvalController.js";

const router = express.Router();
router.use(verifyToken);

// ── Leave ────────────────────────────────────────────────────────────────────
router.get("/leave/types",              getLeaveTypes);
router.post("/leave/types",             checkPermission("leavetype:manage"), createLeaveType);
router.put("/leave/types/:id",          checkPermission("leavetype:manage"), updateLeaveType);
router.get("/leave/balance",            getMyLeaveBalance);
router.post("/leave/balance/init",      checkPermission("leavebalance:manage"), initLeaveBalance);
router.post("/leave",                   checkPermission("ess:leave"), createLeaveRequest);
router.get("/leave/my-requests",        (req, res, next) => { req.query.requestType = "leave"; next(); }, getMyRequests);

// ── Overtime ─────────────────────────────────────────────────────────────────
router.post("/overtime",                checkPermission("ess:overtime"), createOvertimeRequest);
router.get("/overtime/my-requests",     getMyOvertimeRequests);

// ── Asset ─────────────────────────────────────────────────────────────────────
router.post("/asset",                   checkPermission("ess:asset"), createAssetRequest);
router.get("/asset/my-requests",        getMyAssetRequests);
router.put("/asset/:id/fulfill",        checkPermission("approval:manage"), fulfillAssetRequest);

// ── Approval actions (dùng chung cho cả 3 loại) ───────────────────────────────
router.post("/:requestType/:requestId/submit",  submitRequest);
router.post("/:requestType/:requestId/approve", checkPermission("approval:manage"), approveRequest);
router.post("/:requestType/:requestId/cancel",  cancelRequest);

// ── Approval Inbox ────────────────────────────────────────────────────────────
router.get("/approvals/pending",        checkPermission("approval:view"), getPendingApprovals);
router.get("/approvals/my-requests",    getMyRequests);

export default router;
