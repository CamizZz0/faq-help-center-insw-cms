import { Router } from "express";

import {
    getTutorialBySlug,
    getTutorials,
} from "../controllers/tutorialController.js";
import { createTutorialFeedback } from "../controllers/feedbackController.js";
import { feedbackRateLimit } from "../middleware/feedbackRateLimit.js";

const router = Router();

function withType(type, middleware) {
    return (req, res, next) => {
        req._feedbackContentType = type;
        return middleware(req, res, next);
    };
}

router.get("/", getTutorials);
router.get("/:slug", getTutorialBySlug);
router.post("/:id/feedback", withType("tutorial", feedbackRateLimit()), createTutorialFeedback);

export default router;