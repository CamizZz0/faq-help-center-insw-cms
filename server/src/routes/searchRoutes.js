import { Router } from "express";
import { searchHelpCenter } from "../controllers/searchController.js";

const router = Router();
router.get("/", searchHelpCenter);

export default router;
