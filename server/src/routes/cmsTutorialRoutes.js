import { Router } from "express";
import {
    createCmsTutorial,
    deleteCmsTutorial,
    getCmsTutorialById,
    getCmsTutorials,
    updateCmsTutorial,
} from "../controllers/cmsTutorialController.js";

const router = Router();
router.get("/", getCmsTutorials);
router.get("/:id", getCmsTutorialById);
router.post("/", createCmsTutorial);
router.patch("/:id", updateCmsTutorial);
router.delete("/:id", deleteCmsTutorial);

export default router;
