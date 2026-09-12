import { Router } from "express";

import {
    createCmsSubcategory,
    deleteCmsSubcategory,
    getCmsSubcategories,
    getCmsSubcategoryById,
    updateCmsSubcategory,
} from "../controllers/cmsSubcategoryController.js";

const router = Router();

router.get("/", getCmsSubcategories);
router.get("/:id", getCmsSubcategoryById);
router.post("/", createCmsSubcategory);
router.patch("/:id", updateCmsSubcategory);
router.delete("/:id", deleteCmsSubcategory);

export default router;
