import { Router } from "express";

import {
    uploadGuidePdf,
} from "../middleware/guideUpload.js";

import {
    getCmsGuides,
    getCmsGuideById,
    createCmsGuide,
    updateCmsGuide,
    deleteCmsGuide,
} from "../controllers/cmsGuideController.js";

const router = Router();

router.get("/", getCmsGuides);

router.post(
    "/",
    uploadGuidePdf,
    createCmsGuide,
);

router.get("/:id", getCmsGuideById);

router.patch(
    "/:id",
    uploadGuidePdf,
    updateCmsGuide,
);

router.delete("/:id", deleteCmsGuide);

export default router;