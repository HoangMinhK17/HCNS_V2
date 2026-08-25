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

router.get("/",         checkPermission("holiday:view"),   getHolidayEvents);
router.post("/",        checkPermission("holiday:create"), createHolidayEvent);
router.put("/:id",      checkPermission("holiday:edit"),   updateHolidayEvent);
router.delete("/:id",   checkPermission("holiday:delete"), deleteHolidayEvent);

router.post("/:id/trigger", checkPermission("holiday:edit"), triggerHolidayEventManual);

export default router;
