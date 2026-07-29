import express from "express";
import { getAll, getById, create, update, remove, seedDefaultRoles } from "../controllers/roleController.js";
import { verifyToken, checkRole, checkPermission } from "../middleware/authMiddleware.js";
const router = express.Router();

router.use(verifyToken)
router.use(checkRole(["super-admin", "hr-admin"]))

router.get("/get-all-role-permissions", checkPermission("role:view"), getAll);
router.get("/get-by-id/:id", checkPermission("role:view"), getById);
router.post("/create", checkPermission("role:create"), create);
router.post("/seed", seedDefaultRoles);
router.put("/update/:id", checkPermission("role:edit"), update);
router.delete("/remove/:id", checkPermission("role:delete"), remove);

export default router;
