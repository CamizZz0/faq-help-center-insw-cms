import { Router } from "express";

import {
    createCmsSubcategory,
    deleteCmsSubcategory,
    getCmsSubcategories,
    getCmsSubcategoryById,
    updateCmsSubcategory,
} from "../controllers/cmsSubcategoryController.js";

import { uploadHelpCenterIcon } from "../middleware/iconUpload.js";

const router = Router();

router.get("/", getCmsSubcategories);
router.get("/:id", getCmsSubcategoryById);
router.post("/", uploadHelpCenterIcon, createCmsSubcategory);
router.patch("/:id", uploadHelpCenterIcon, updateCmsSubcategory);
router.delete("/:id", deleteCmsSubcategory);

export default router;
