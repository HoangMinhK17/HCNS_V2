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
router.use(verifyToken);

// GPS Locations
router.get("/locations",          checkPermission("location:manage"), getLocations);
router.post("/locations",         checkPermission("location:manage"), createLocation);
router.put("/locations/:id",      checkPermission("location:manage"), updateLocation);
router.delete("/locations/:id",   checkPermission("location:manage"), deleteLocation);

// Holiday Calendar
router.get("/holidays",           getHolidays);
router.post("/holidays",          checkPermission("holiday:manage"), createHoliday);
router.put("/holidays/:id",       checkPermission("holiday:manage"), updateHoliday);
router.delete("/holidays/:id",    checkPermission("holiday:manage"), deleteHoliday);

// Approval Flows
router.get("/approval-flows",     checkPermission("approval:manage"), getApprovalFlows);
router.post("/approval-flows",    checkPermission("approval:manage"), createApprovalFlow);
router.delete("/approval-flows/:id", checkPermission("approval:manage"), deleteApprovalFlow);
router.put("/approval-flows/:id", checkPermission("approval:manage"), updateApprovalFlow);

// ── Onboarding Settings ───────────────────────────────────────────────────────
router.get("/onboarding",                    checkPermission("onboard:get"), getSettings);
router.put("/onboarding",                    checkPermission("onboard:update"), updateSettings);
router.post("/onboarding/upload",            checkPermission("onboard:upload"), upload.single("file"), uploadDocument);
router.delete("/onboarding/documents/:docId",checkPermission("onboard:delete"), deleteDocument);
router.get("/onboarding/employees",          checkPermission("onboard:get"), getOnboardingEmployees);
router.post("/onboarding/send/:employeeId",  checkPermission("onboard:send"), sendOnboardingManual);

export default router;
