import express from "express";

// ── Phase 1 routers ──────────────────────────────────────────
import companyRouter    from "./companyRouter.js";
import departmentRouter from "./departmentRouter.js";
import positionRouter   from "./positionRouter.js";
import employeeRouter   from "./employeeRouter.js";
import roleRouter       from "./roleRouter.js";
import userRouter       from "./userRouter.js";
import excelRouter      from "./excelRouter.js";

// ── Phase 2 routers ──────────────────────────────────────────
import attendanceRouter from "./attendanceRouter.js";
import shiftRouter      from "./shiftRouter.js";
import essRouter        from "./essRouter.js";
import settingsRouter   from "./settingsRouter.js";

// ── Legacy routers (kept for backward-compat) ────────────────
import scrapeRouter   from "./scrapeRouter.js";
import contractRouter from "./contractRouter.js";

import birthdayRouter from "./birthdayRouter.js";

const router = express.Router();

// Phase 1
router.use("/companies",   companyRouter);
router.use("/departments", departmentRouter);
router.use("/positions",   positionRouter);
router.use("/employees",   employeeRouter);
router.use("/roles",       roleRouter);
router.use("/users",       userRouter);
router.use("/excel",       excelRouter);

// Phase 2 – Operations & ESS
router.use("/attendance",  attendanceRouter);
router.use("/shifts",      shiftRouter);
router.use("/ess",         essRouter);
router.use("/settings",    settingsRouter);

// Legacy
router.use("/scrape",    scrapeRouter);
router.use("/contract",  contractRouter);

router.use("/birthday", birthdayRouter);

export default router;
