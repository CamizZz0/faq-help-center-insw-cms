import { Router } from "express";

import { getCmsDashboard } from "../controllers/cmsDashboardController.js";

const router = Router();

router.get("/", getCmsDashboard);

export default router;
