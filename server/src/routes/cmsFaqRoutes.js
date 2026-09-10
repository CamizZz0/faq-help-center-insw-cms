import { Router } from "express";

import {
    createCmsFaq,
    getCmsFaqs,
    getCmsFaqById,
    updateCmsFaq,
    deleteCmsFaq,
} from "../controllers/cmsFaqController.js";

const router = Router();

router.get("/", getCmsFaqs);
router.get("/:id", getCmsFaqById);
router.post("/", createCmsFaq);
router.patch("/:id", updateCmsFaq);
router.delete("/:id", deleteCmsFaq);

export default router;