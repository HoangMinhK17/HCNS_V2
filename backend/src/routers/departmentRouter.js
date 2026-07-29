import express from "express";
import { getAll, getById, create, update, remove } from "../controllers/departmentController.js";
import { verifyToken, checkRole, checkPermission } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(verifyToken)

router.get("/", checkPermission("department:view"), getAll);
router.get("/:id", checkPermission("department:view"), getById);
router.post("/", checkPermission("department:create"), create);
router.put("/:id", checkPermission("department:edit"), update);
router.delete("/:id", checkPermission("department:delete"), remove);


export default router;
