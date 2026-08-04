import express from "express";
import { verifyToken, checkPermission } from "../middleware/authMiddleware.js";
import { createWishBirth, getWishBirth, updateWishBirth, deleteWishBirth } from "../controllers/birthdayController.js";

const router = express.Router();
router.use(verifyToken);
// router.use(checkPermission("birthday:manage"));

router.post("/createWishBirth", createWishBirth);
router.get("/getWishBirth", getWishBirth);
router.put("/updateWishBirth/:id", updateWishBirth);
router.delete("/deleteWishBirth/:id", deleteWishBirth);

export default router;