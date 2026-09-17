import { Router } from "express";
import { getAllFaqs } from "../controllers/faqController.js";
import { createFaqFeedback } from "../controllers/feedbackController.js";
import { feedbackRateLimit } from "../middleware/feedbackRateLimit.js";

const router = Router();

function withType(type, middleware) {
    return (req, res, next) => {
        req._feedbackContentType = type;
        return middleware(req, res, next);
    };
}

router.get("/", getAllFaqs);
router.post("/:id/feedback", withType("faq", feedbackRateLimit()), createFaqFeedback);

export default router;
