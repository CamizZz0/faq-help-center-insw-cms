import { Router } from "express";
import { getTopicsBySubcategory } from "../controllers/subcategoryController.js";

const router = Router();

router.get("/:subcategorySlug/topics", getTopicsBySubcategory);

export default router;