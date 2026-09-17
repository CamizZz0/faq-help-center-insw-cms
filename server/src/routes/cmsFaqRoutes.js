import { Router } from "express";

import {
    createCmsFaq,
    getCmsFaqs,
    getCmsFaqById,
    updateCmsFaq,
    deleteCmsFaq,
    getCmsFaqVersions,
} from "../controllers/cmsFaqController.js";

const router = Router();

router.get("/", getCmsFaqs);
router.get("/:id", getCmsFaqById);
router.get("/:id/versions", getCmsFaqVersions);
router.post("/", createCmsFaq);
router.patch("/:id", updateCmsFaq);
router.delete("/:id", deleteCmsFaq);

export default router;
