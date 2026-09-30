import express from "express";
import { verifyToken, checkPermission } from "../middleware/authMiddleware.js";
import { assignShifts, getSchedule, getMySchedule } from "../controllers/shiftController.js";

const router = express.Router();

router.use(verifyToken);

router.get("/schedule",    checkPermission("shift:view"), getSchedule);
router.get("/my-schedule", getMySchedule);
router.post("/assign",     checkPermission("shift:assign"), assignShifts);

export default router;
