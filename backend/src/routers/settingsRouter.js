import express from "express";
import multer from "multer";
import { verifyToken, checkPermission } from "../middleware/authMiddleware.js";
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getApprovalFlows,
  createApprovalFlow,
  deleteApprovalFlow,
  updateApprovalFlow,
} from "../controllers/settingsController.js";
import {
  getSettings,
  updateSettings,
  uploadDocument,
  deleteDocument,
  getOnboardingEmployees,
  sendOnboardingManual,
} from "../controllers/onboardingController.js";

// Multer: lưu file trong RAM (buffer), giới hạn 20MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const router = express.Router();

// GPS Locations
router.get("/locations",          verifyToken, checkPermission("location:manage"), getLocations);
router.post("/locations",         verifyToken, checkPermission("location:manage"), createLocation);
router.put("/locations/:id",      verifyToken, checkPermission("location:manage"), updateLocation);
router.delete("/locations/:id",   verifyToken, checkPermission("location:manage"), deleteLocation);

// Holiday Calendar
router.get("/holidays",           verifyToken, getHolidays);
router.post("/holidays",          verifyToken, checkPermission("holiday:manage"), createHoliday);
router.put("/holidays/:id",       verifyToken, checkPermission("holiday:manage"), updateHoliday);
router.delete("/holidays/:id",    verifyToken, checkPermission("holiday:manage"), deleteHoliday);

// Approval Flows
router.get("/approval-flows",     verifyToken, checkPermission("approval:manage"), getApprovalFlows);
router.post("/approval-flows",    verifyToken, checkPermission("approval:manage"), createApprovalFlow);
router.delete("/approval-flows/:id", verifyToken, checkPermission("approval:manage"), deleteApprovalFlow);
router.put("/approval-flows/:id", verifyToken, checkPermission("approval:manage"), updateApprovalFlow);

// ── Onboarding Settings ───────────────────────────────────────────────────────
router.get("/onboarding",                    verifyToken, checkPermission("onboard:get"), getSettings);
router.put("/onboarding",                    verifyToken, checkPermission("onboard:update"), updateSettings);
router.post("/onboarding/upload",            verifyToken, checkPermission("onboard:upload"), upload.single("file"), uploadDocument);
router.delete("/onboarding/documents/:docId",verifyToken, checkPermission("onboard:delete"), deleteDocument);
router.get("/onboarding/employees",          verifyToken, checkPermission("onboard:get"), getOnboardingEmployees);
router.post("/onboarding/send/:employeeId",  verifyToken, checkPermission("onboard:send"), sendOnboardingManual);

export default router;
