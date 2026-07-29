import express from "express";
import {
  getAll, getById, create, update, remove, assignRole,
  loginUser, refreshToken, logout,
} from "../controllers/userController.js";
import { verifyToken, checkRole, checkPermission } from "../middleware/authMiddleware.js";

const router = express.Router();


router.post("/login", loginUser);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

router.use(verifyToken);
router.use(checkRole(["super-admin", "hr-admin"]))

router.get("/", checkPermission("user:view"), getAll);
router.get("/:id", checkPermission("user:view"), getById);
router.post("/create-account", checkPermission("user:create"), create);
router.put("/:id", checkPermission("user:edit"), update);
router.delete("/:id", checkPermission("user:delete"), remove);
router.put("/:id/role", checkPermission("user:edit"), assignRole);

export default router;
