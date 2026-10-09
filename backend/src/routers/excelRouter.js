import express from "express";
import multer from "multer";
import { downloadTemplate, importPersonnel, exportPersonnel } from "../controllers/excelController.js";
import { heavyLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

// Cấu hình Multer lưu file tạm vào memory buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/template", heavyLimiter, downloadTemplate);
router.post("/import", heavyLimiter, upload.single("file"), importPersonnel);
router.get("/export", heavyLimiter, exportPersonnel);

export default router;
