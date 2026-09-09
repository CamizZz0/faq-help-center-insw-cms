import { Router } from "express";

import {
    getGuideBySlug,
    getGuides,
} from "../controllers/guideController.js";

const router = Router();

router.get("/", getGuides);
router.get("/:slug", getGuideBySlug);

export default router;