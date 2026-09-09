import { Router } from "express";

import {
    getTutorialBySlug,
    getTutorials,
} from "../controllers/tutorialController.js";

const router = Router();

router.get("/", getTutorials);
router.get("/:slug", getTutorialBySlug);

export default router;