import { Router } from "express";

import {
    createCmsFaq,
    getCmsFaqs,
} from "../controllers/cmsFaqController.js";

const router = Router();

router.get("/", getCmsFaqs);
router.post("/", createCmsFaq);

export default router;