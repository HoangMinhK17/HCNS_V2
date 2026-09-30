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
router.use(verifyToken);
// ESS – Nhân viên tự check-in/out và xem công
router.post("/checkin", checkPermission("attendance:checkin"), checkIn);
router.post("/checkout", checkPermission("attendance:checkin"), checkOut);
router.get("/my-today", getMyToday);

// HR/Manager – Xem bảng chấm công
router.get("/summary", checkPermission("attendance:view"), getAttendanceSummary);
router.put("/summary/:summaryId/manual", checkPermission("attendance:manual-edit"), manualEditSummary);

// HR – Đăng ký khuôn mặt cho nhân viên
router.post("/register-face", checkPermission("attendance:manual-edit"), registerFace);

export default router;
