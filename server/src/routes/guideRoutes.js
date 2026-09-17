import { Router } from "express";

import {
    getGuideBySlug,
    getGuides,
} from "../controllers/guideController.js";
import { createGuideFeedback } from "../controllers/feedbackController.js";
import { feedbackRateLimit } from "../middleware/feedbackRateLimit.js";

const router = Router();

function withType(type, middleware) {
    return (req, res, next) => {
        req._feedbackContentType = type;
        return middleware(req, res, next);
    };
}

router.get("/", getGuides);
router.get("/:slug", getGuideBySlug);
router.post("/:id/feedback", withType("guide", feedbackRateLimit()), createGuideFeedback);

export default router;