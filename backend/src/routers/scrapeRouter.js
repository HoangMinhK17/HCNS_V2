import express from "express";
import { syncFromHRM, getLatestSyncLog } from "../controllers/hrmSyncController.js";

const router = express.Router();

// Đồng bộ từ HRM API (trigger thủ công)
router.post("/syncHRM", syncFromHRM);

// Lấy thông tin lần đồng bộ gần nhất
router.get("/latest-sync", getLatestSyncLog);

export default router;