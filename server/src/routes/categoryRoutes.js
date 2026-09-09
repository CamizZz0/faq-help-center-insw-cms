import { Router } from "express";
import {
    getAllCategories,
    getSubcategoriesByCategory,
} from "../controllers/categoryController.js";

const router = Router();

router.get("/", getAllCategories);
router.get("/:categorySlug/subcategories", getSubcategoriesByCategory);

export default router;