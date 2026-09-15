import { eq } from "drizzle-orm";

import { db } from "../config/db.js";
import { faqs, faqFeedback } from "../models/schema.js";
import {
    canViewerSeeFaq,
    normalizeViewerRole,
} from "../utils/faqVisibility.js";

export async function createFaqFeedback(req, res) {
    const faqId = Number(req.params.id);
    const { isHelpful, reason, viewerRole } = req.body ?? {};

    if (!Number.isSafeInteger(faqId) || faqId < 1) {
        return res.status(400).json({ success: false, message: "ID FAQ tidak valid." });
    }

    if (typeof isHelpful !== "boolean") {
        return res.status(400).json({ success: false, message: "Pilihan feedback wajib Ya atau Tidak." });
    }

    if (reason !== undefined && typeof reason !== "string") {
        return res.status(400).json({ success: false, message: "Alasan feedback harus berupa teks." });
    }

    const cleanedReason = String(reason ?? "").trim();
    if (cleanedReason.length > 1000) {
        return res.status(400).json({ success: false, message: "Alasan feedback maksimal 1.000 karakter." });
    }

    try {
        const [faq] = await db
            .select({
                id: faqs.id,
                isPublished: faqs.isPublished,
                visibility: faqs.visibility,
            })
            .from(faqs)
            .where(eq(faqs.id, faqId))
            .limit(1);

        if (!faq || !canViewerSeeFaq(faq, normalizeViewerRole(viewerRole))) {
            return res.status(404).json({ success: false, message: "FAQ tidak ditemukan." });
        }

        await db.insert(faqFeedback).values({
            faqId,
            isHelpful,
            reason: isHelpful || !cleanedReason ? null : cleanedReason,
        });

        return res.status(201).json({
            success: true,
            message: "Terima kasih atas feedback Anda.",
        });
    } catch (error) {
        console.error("Gagal menyimpan feedback FAQ:", error);
        return res.status(500).json({ success: false, message: "Feedback belum dapat disimpan." });
    }
}
