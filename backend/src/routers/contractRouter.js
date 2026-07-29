import express from "express";
import { sendContractWarning, renewContract, renewAndGenerate } from "../controllers/contractMailController.js";
import multer from "multer";
import { verifyToken, checkPermission, checkRole } from "../middleware/authMiddleware.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();
router.use(verifyToken);
router.use(checkRole(["super-admin","hr-admin"]))
router.post("/send-warning", sendContractWarning);
router.put("/renew/:id", renewContract);
router.post(
  "/renew-and-generate/:id",
  upload.fields([{ name: "template", maxCount: 1 }, { name: "cccdFront", maxCount: 1 }, { name: "cccdBack", maxCount: 1 }]),
  renewAndGenerate
);

export default router;
