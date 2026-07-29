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

// ── Leave ────────────────────────────────────────────────────────────────────
router.get("/leave/types",              verifyToken, getLeaveTypes);
router.post("/leave/types",             verifyToken, checkPermission("leavetype:manage"), createLeaveType);
router.put("/leave/types/:id",          verifyToken, checkPermission("leavetype:manage"), updateLeaveType);
router.get("/leave/balance",            verifyToken, getMyLeaveBalance);
router.post("/leave/balance/init",      verifyToken, checkPermission("leavebalance:manage"), initLeaveBalance);
router.post("/leave",                   verifyToken, checkPermission("ess:leave"), createLeaveRequest);
router.get("/leave/my-requests",        verifyToken, (req, res, next) => { req.query.requestType = "leave"; next(); }, getMyRequests);

// ── Overtime ─────────────────────────────────────────────────────────────────
router.post("/overtime",                verifyToken, checkPermission("ess:overtime"), createOvertimeRequest);
router.get("/overtime/my-requests",     verifyToken, getMyOvertimeRequests);

// ── Asset ─────────────────────────────────────────────────────────────────────
router.post("/asset",                   verifyToken, checkPermission("ess:asset"), createAssetRequest);
router.get("/asset/my-requests",        verifyToken, getMyAssetRequests);
router.put("/asset/:id/fulfill",        verifyToken, checkPermission("approval:manage"), fulfillAssetRequest);

// ── Approval actions (dùng chung cho cả 3 loại) ───────────────────────────────
router.post("/:requestType/:requestId/submit",  verifyToken, submitRequest);
router.post("/:requestType/:requestId/approve", verifyToken, checkPermission("approval:manage"), approveRequest);
router.post("/:requestType/:requestId/cancel",  verifyToken, cancelRequest);

// ── Approval Inbox ────────────────────────────────────────────────────────────
router.get("/approvals/pending",        verifyToken, checkPermission("approval:view"), getPendingApprovals);
router.get("/approvals/my-requests",    verifyToken, getMyRequests);

export default router;
