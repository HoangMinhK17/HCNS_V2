import express from "express";
import {
  getAll, getById, create, update, remove,
} from "../controllers/positionController.js";
import { verifyToken, checkRole, checkPermission } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(verifyToken)

router.get("/", checkPermission("position:view"), getAll);
router.get("/:id", checkPermission("position:view"), getById);
router.post("/", checkPermission("position:create"), create);
router.put("/:id", checkPermission("position:edit"), update);
router.delete("/:id", checkPermission("position:delete"), remove);

export default router;
