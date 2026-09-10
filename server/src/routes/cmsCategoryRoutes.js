import { Router } from "express";

import {
    createCmsCategory,
    deleteCmsCategory,
    getCmsCategories,
    getCmsCategoryById,
    updateCmsCategory,
} from "../controllers/cmsCategoryController.js";

const router = Router();

router.get("/", getCmsCategories);
router.get("/:id", getCmsCategoryById);
router.post("/", createCmsCategory);
router.patch("/:id", updateCmsCategory);
router.delete("/:id", deleteCmsCategory);

export default router;