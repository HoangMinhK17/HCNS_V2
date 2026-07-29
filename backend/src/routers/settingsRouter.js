import express from "express";
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

export default router;
