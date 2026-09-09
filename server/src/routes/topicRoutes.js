import { Router } from "express";
import { getFaqsByTopic } from "../controllers/topicController.js";

const router = Router();

router.get("/:topicSlug/faqs", getFaqsByTopic);

export default router;