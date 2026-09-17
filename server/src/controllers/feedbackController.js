import { and, desc, eq } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";

import { db } from "../config/db.js";
import {
    contentFeedback,
    faqs,
    guides,
    tutorials,
} from "../models/schema.js";
import {
    canViewerSeeFaq,
    normalizeViewerRole,
} from "../utils/faqVisibility.js";

/*
 * Feedback untuk tiga jenis konten memakai tabel yang sama
 * (content_feedback) dengan kolom content_type sebagai pembeda.
 */
export const FEEDBACK_CONTENT_TYPES = ["faq", "guide", "tutorial"];

export const FEEDBACK_LABELS = {
    faq: "FAQ",
    guide: "Panduan",
    tutorial: "Tutorial",
};

const MAKS_PANJANG_ALASAN = 1000;

/*
 * Mengambil data minimum yang dibutuhkan untuk memeriksa apakah
 * konten boleh diberi feedback.
 */
async function ambilKonten(contentType, contentId) {
    if (contentType === "faq") {
        const [row] = await db
            .select({
                id: faqs.id,
                isPublished: faqs.isPublished,
                visibility: faqs.visibility,
            })
            .from(faqs)
            .where(eq(faqs.id, contentId))
            .limit(1);

        return row ?? null;
    }

    if (contentType === "guide") {
        const [row] = await db
            .select({ id: guides.id, isPublished: guides.isPublished })
            .from(guides)
            .where(eq(guides.id, contentId))
            .limit(1);

        return row ?? null;
    }

    const [row] = await db
        .select({ id: tutorials.id, isPublished: tutorials.isPublished })
        .from(tutorials)
        .where(eq(tutorials.id, contentId))
        .limit(1);

    return row ?? null;
}

/*
 * FAQ masih memakai simulasi role pembaca (guest/authenticated),
 * sedangkan panduan dan tutorial hanya perlu sudah diterbitkan.
 */
function bolehDiberiFeedback(contentType, konten, viewerRole) {
    if (!konten) return false;

    if (contentType === "faq") {
        return canViewerSeeFaq(konten, normalizeViewerRole(viewerRole));
    }

    return konten.isPublished === true;
}

export function createContentFeedback(contentType) {
    const label = FEEDBACK_LABELS[contentType] ?? "Konten";

    return async function simpanContentFeedback(req, res) {
        const contentId = Number(req.params.id);
        const { isHelpful, reason, viewerRole } = req.body ?? {};

        if (!Number.isSafeInteger(contentId) || contentId < 1) {
            return res.status(400).json({
                success: false,
                message: `ID ${label} tidak valid.`,
            });
        }

        if (typeof isHelpful !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Pilihan feedback wajib Ya atau Tidak.",
            });
        }

        if (reason !== undefined && typeof reason !== "string") {
            return res.status(400).json({
                success: false,
                message: "Alasan feedback harus berupa teks.",
            });
        }

        let cleanedReason = String(reason ?? "").trim();

        // Sanitasi HTML untuk mencegah XSS saat ditampilkan di dashboard CMS
        if (cleanedReason) {
            cleanedReason = sanitizeHtml(cleanedReason, {
                allowedTags: [],
                allowedAttributes: {},
            }).trim();
        }

        if (cleanedReason.length > MAKS_PANJANG_ALASAN) {
            return res.status(400).json({
                success: false,
                message: `Alasan feedback maksimal ${MAKS_PANJANG_ALASAN.toLocaleString("id-ID")} karakter.`,
            });
        }

        try {
            const konten = await ambilKonten(contentType, contentId);

            if (!bolehDiberiFeedback(contentType, konten, viewerRole)) {
                return res.status(404).json({
                    success: false,
                    message: `${label} tidak ditemukan.`,
                });
            }

            await db.insert(contentFeedback).values({
                contentType,
                contentId,
                isHelpful,
                // Alasan hanya disimpan untuk penilaian negatif.
                reason: isHelpful || !cleanedReason ? null : cleanedReason,
            });

            return res.status(201).json({
                success: true,
                message: "Terima kasih atas feedback Anda.",
            });
        } catch (error) {
            console.error(`Gagal menyimpan feedback ${label}:`, error);
            return res.status(500).json({
                success: false,
                message: "Feedback belum dapat disimpan.",
            });
        }
    };
}

export const createFaqFeedback = createContentFeedback("faq");
export const createGuideFeedback = createContentFeedback("guide");
export const createTutorialFeedback = createContentFeedback("tutorial");

/*
 * Endpoint CMS untuk mengambil alasan feedback negatif per konten.
 * Dipakai dashboard dalam drawer/modal agar tidak membebani getCmsDashboard.
 */
export async function getFeedbackReasons(req, res) {
    const { contentType, contentId: rawId } = req.params;
    const contentId = Number(rawId);
    const limitParam = Number(req.query.limit ?? 10);

    if (!FEEDBACK_CONTENT_TYPES.includes(contentType)) {
        return res.status(400).json({
            success: false,
            message: `Jenis konten tidak valid. Pilih: ${FEEDBACK_CONTENT_TYPES.join(", ")}.`,
        });
    }

    if (!Number.isSafeInteger(contentId) || contentId < 1) {
        return res.status(400).json({
            success: false,
            message: "ID konten tidak valid.",
        });
    }

    const limit = Number.isSafeInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;

    try {
        const rows = await db
            .select({
                id: contentFeedback.id,
                reason: contentFeedback.reason,
                createdAt: contentFeedback.createdAt,
            })
            .from(contentFeedback)
            .where(
                and(
                    eq(contentFeedback.contentType, contentType),
                    eq(contentFeedback.contentId, contentId),
                    eq(contentFeedback.isHelpful, false)
                )
            )
            .orderBy(desc(contentFeedback.createdAt))
            .limit(limit);

        // Filter hanya yang punya reason (null diabaikan) dan sanitasi ringan
        const filtered = rows
            .filter((r) => r.reason && String(r.reason).trim().length > 0)
            .map((r) => ({
                id: r.id,
                reason: String(r.reason).trim(),
                createdAt: r.createdAt,
            }));

        return res.status(200).json({
            success: true,
            message: "Alasan feedback berhasil diambil",
            data: filtered,
        });
    } catch (error) {
        console.error("Gagal mengambil alasan feedback:", error);
        return res.status(500).json({
            success: false,
            message: "Gagal mengambil alasan feedback.",
        });
    }
}
