import express from "express";
import { verifyToken, checkPermission } from "../middleware/authMiddleware.js";
import {
  getHolidayEvents,
  createHolidayEvent,
  updateHolidayEvent,
  deleteHolidayEvent,
  triggerHolidayEventManual,
} from "../controllers/holidayEventController.js";

const router = express.Router();
router.use(verifyToken);

// CRUD
router.get("/",         checkPermission("holiday:view"),   getHolidayEvents);
router.post("/",        checkPermission("holiday:create"), createHolidayEvent);
router.put("/:id",      checkPermission("holiday:edit"),   updateHolidayEvent);
router.delete("/:id",   checkPermission("holiday:delete"), deleteHolidayEvent);

// Kích hoạt gửi thủ công (dùng để test – không cần đợi cron)
// Query: ?type=announcement | wish | both
router.post("/:id/trigger", checkPermission("holiday:edit"), triggerHolidayEventManual);

export default router;
