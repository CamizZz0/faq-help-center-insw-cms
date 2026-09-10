import { Router } from "express";

import {
    createCmsFaq,
    getCmsFaqs,
    getCmsFaqById,
    updateCmsFaq,
} from "../controllers/cmsFaqController.js";

const router = Router();

router.get("/", getCmsFaqs);
router.get("/:id", getCmsFaqById);
router.post("/", createCmsFaq);
router.patch("/:id", updateCmsFaq);

export default router;