import express from "express";
import { syncFromHRM, getLatestSyncLog } from "../controllers/hrmSyncController.js";
import { heavyLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// Đồng bộ từ HRM API (trigger thủ công)
router.post("/syncHRM", heavyLimiter, syncFromHRM);

// Lấy thông tin lần đồng bộ gần nhất
router.get("/latest-sync", getLatestSyncLog);

export default router;