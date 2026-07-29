import express from "express";
import { verifyToken, checkPermission } from "../middleware/authMiddleware.js";
import { assignShifts, getSchedule, getMySchedule } from "../controllers/shiftController.js";

const router = express.Router();

router.get("/schedule",    verifyToken, checkPermission("shift:view"), getSchedule);
router.get("/my-schedule", verifyToken, getMySchedule);
router.post("/assign",     verifyToken, checkPermission("shift:assign"), assignShifts);

export default router;
