import express from "express";
import { verifyToken, checkPermission } from "../middleware/authMiddleware.js";
import { createWishBirth, getWishBirth, updateWishBirth, deleteWishBirth } from "../controllers/birthdayController.js";

const router = express.Router();
router.use(verifyToken);

router.post("/createWishBirth",checkPermission("birthday:create"), createWishBirth);
router.get("/getWishBirth", checkPermission("birthday:view"), getWishBirth);
router.put("/updateWishBirth/:id", checkPermission("birthday:edit"), updateWishBirth);
router.delete("/deleteWishBirth/:id", checkPermission("birthday:delete"), deleteWishBirth);

export default router;