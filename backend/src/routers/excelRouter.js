import express from "express";
import multer from "multer";
import { downloadTemplate, importPersonnel, exportPersonnel } from "../controllers/excelController.js";

const router = express.Router();

// Cấu hình Multer lưu file tạm vào memory buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/template", downloadTemplate);
router.post("/import", upload.single("file"), importPersonnel);
router.get("/export", exportPersonnel);

export default router;
