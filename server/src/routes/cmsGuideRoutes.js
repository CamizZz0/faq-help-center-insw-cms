import { Router } from "express";
import { uploadGuidePdf } from "../middleware/guideUpload.js";
import { getCmsGuides, getCmsGuideById, createCmsGuide, updateCmsGuide, deleteCmsGuide } from "../controllers/cmsGuideController.js";

const router = Router();
router.get("/", getCmsGuides);
router.get("/:id", getCmsGuideById);
router.post("/", uploadGuidePdf, createCmsGuide);
router.patch("/:id", uploadGuidePdf, updateCmsGuide);
router.delete("/:id", deleteCmsGuide);
export default router;
