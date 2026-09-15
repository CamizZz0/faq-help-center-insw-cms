import { Router } from "express";
import { getAllFaqs } from "../controllers/faqController.js";
import { createFaqFeedback } from "../controllers/feedbackController.js";

const router = Router();

router.get("/", getAllFaqs);
router.post("/:id/feedback", createFaqFeedback);

export default router;
