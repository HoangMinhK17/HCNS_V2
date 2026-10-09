import express from "express";
import {
  getAll, getById, create, update, remove, assignRole,
  loginUser, refreshToken, logout,
  changePassword,
} from "../controllers/userController.js";
import { verifyToken, checkRole, checkPermission } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();


router.post("/login", authLimiter, loginUser);
router.post("/refresh-token", authLimiter, refreshToken);
router.post("/logout", logout);

router.use(verifyToken);
router.put("/:id/change-password", changePassword);

router.use(checkRole(["super-admin", "hr-admin"]))

router.get("/", checkPermission("user:view"), getAll);
router.get("/:id", checkPermission("user:view"), getById);
router.post("/create-account", checkPermission("user:create"), create);
router.put("/:id", checkPermission("user:edit"), update);
router.delete("/:id", checkPermission("user:delete"), remove);
router.put("/:id/role", checkPermission("user:edit"), assignRole);

export default router;
