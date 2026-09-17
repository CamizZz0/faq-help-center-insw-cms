import { Router } from "express";

import { getCmsDashboard } from "../controllers/cmsDashboardController.js";
import { getFeedbackReasons } from "../controllers/feedbackController.js";

const router = Router();

router.get("/", getCmsDashboard);
router.get("/feedback/:contentType/:contentId/reasons", getFeedbackReasons);

export default router;
