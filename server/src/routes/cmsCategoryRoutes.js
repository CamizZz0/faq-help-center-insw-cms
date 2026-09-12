import { Router } from "express";

import {
    createCmsCategory,
    deleteCmsCategory,
    getCmsCategories,
    getCmsCategoryById,
    updateCmsCategory,
} from "../controllers/cmsCategoryController.js";

import { uploadHelpCenterIcon } from "../middleware/iconUpload.js";

const router = Router();

router.get("/", getCmsCategories);
router.get("/:id", getCmsCategoryById);
router.post("/", uploadHelpCenterIcon, createCmsCategory);
router.patch("/:id", uploadHelpCenterIcon, updateCmsCategory);
router.delete("/:id", deleteCmsCategory);

export default router;