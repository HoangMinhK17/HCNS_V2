import express from "express";
import multer from "multer";
import {
  getAll,
  getAllNoPagination,
  getById,
  create,
  update,
  remove,
  addWorkHistory,
  getExpiringContracts,
  getEmployeesByIds,
  importExcel,
  exportExcel,
  downloadTemplate,
  getOrgChart,
  getBirthdays,
} from "../controllers/employeeController.js";
import { verifyToken, checkRole, checkPermission } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
router.use(verifyToken)

router.get("/org-chart",checkPermission("orgchart:view"), getOrgChart);
router.get("/", checkPermission("employee:view"),getAll);
router.get("/all-employees-for-dropdown", checkPermission("employee:view"), getAllNoPagination);
router.get("/expiring", checkPermission("employee:view"), getExpiringContracts);
router.get("/export", checkPermission("employee:view"), exportExcel);
router.get("/template", checkPermission("employee:view"), downloadTemplate);
router.post("/import", checkPermission("employee:import"), upload.single("file"), importExcel);
router.post("/get-by-ids", checkPermission("employee:view"), getEmployeesByIds);
router.get("/birthday", checkPermission("birthday:view"), getBirthdays);
router.get("/:id", checkPermission("employee:view"), getById);
router.post("/", checkPermission("employee:create"), create);
router.put("/:id", checkPermission("employee:edit"), update);
router.delete("/:id", checkPermission("employee:delete"), remove);
router.post("/:id/work-history", checkPermission("employee:edit"), addWorkHistory);

export default router;
