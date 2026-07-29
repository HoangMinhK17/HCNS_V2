import express from "express";
import { verifyToken, checkPermission } from "../middleware/authMiddleware.js";
import {
  checkIn,
  checkOut,
  getMyToday,
  getAttendanceSummary,
  registerFace,
  manualEditSummary,
} from "../controllers/attendanceController.js";

const router = express.Router();

// ESS – Nhân viên tự check-in/out và xem công
router.post("/checkin",  verifyToken, checkPermission("attendance:checkin"), checkIn);
router.post("/checkout", verifyToken, checkPermission("attendance:checkin"), checkOut);
router.get("/my-today",  verifyToken, getMyToday);

// HR/Manager – Xem bảng chấm công
router.get("/summary",   verifyToken, checkPermission("attendance:view"), getAttendanceSummary);
router.put("/summary/:summaryId/manual", verifyToken, checkPermission("attendance:manual-edit"), manualEditSummary);

// HR – Đăng ký khuôn mặt cho nhân viên
router.post("/register-face", verifyToken, checkPermission("attendance:manual-edit"), registerFace);

export default router;
