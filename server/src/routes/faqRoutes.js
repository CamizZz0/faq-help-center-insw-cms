import { Router } from "express";
import { getAllFaqs } from "../controllers/faqController.js";

const router = Router();

router.get("/", getAllFaqs);

export default router;