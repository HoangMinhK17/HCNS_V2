import express from "express";
import { syncFromHRM } from "../controllers/hrmSyncController.js";

const router = express.Router();

// Đồng bộ từ HRM API (trigger thủ công)
router.post("/syncHRM", syncFromHRM);

export default router;