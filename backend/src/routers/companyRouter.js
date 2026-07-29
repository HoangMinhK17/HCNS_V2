import express from "express";
import { getAll, getById, create, update, remove } from "../controllers/companyController.js";
import { verifyToken, checkPermission } from "../middleware/authMiddleware.js";
const router = express.Router();

router.use(verifyToken)

router.get("/", checkPermission("company:view"), getAll);
router.get("/:id", checkPermission("company:view"), getById);
router.post("/", checkPermission("company:create"), create);
router.put("/:id", checkPermission("company:edit"), update);
router.delete("/:id", checkPermission("company:delete"), remove);

export default router;
