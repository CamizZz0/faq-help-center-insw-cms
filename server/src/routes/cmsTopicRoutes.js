import { Router } from "express";
import {
    createCmsTopic,
    deleteCmsTopic,
    getCmsTopicById,
    getCmsTopicFaqs,
    getCmsTopics,
    updateCmsTopic,
} from "../controllers/cmsTopicController.js";

const router = Router();

router.get("/", getCmsTopics);
router.get("/:id/faqs", getCmsTopicFaqs);
router.get("/:id", getCmsTopicById);
router.post("/", createCmsTopic);
router.patch("/:id", updateCmsTopic);
router.delete("/:id", deleteCmsTopic);

export default router;
