import { Router } from "express";

import {
    getCmsFaqs,
} from "../controllers/cmsFaqController.js";

const router = Router();

router.get("/", getCmsFaqs);

export default router;