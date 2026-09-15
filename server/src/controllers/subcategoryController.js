import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../config/db.js";
import {
    subcategories,
    faqTopics,
    faqs,
} from "../models/schema.js";
import {
    normalizeViewerRole,
    canViewerSeeFaq,
} from "../utils/faqVisibility.js";

export async function getTopicsBySubcategory(req, res) {
    try {
        const { subcategorySlug } = req.params;

        // SIMULASI DEMO (bukan autentikasi): hitungan FAQ per topik
        // mengikuti role agar badge sidebar berubah saat role diganti.
        // TODO(auth): hapus viewerRole, gunakan identitas terautentikasi.
        const viewerRole = normalizeViewerRole(req.query.viewerRole);

        const [subcategory] = await db
            .select({
                id: subcategories.id,
                name: subcategories.name,
                slug: subcategories.slug,
                description: subcategories.description,
                icon: subcategories.icon,
                iconUrl: subcategories.iconUrl,
            })
            .from(subcategories)
            .where(
                and(
                    eq(subcategories.slug, subcategorySlug),
                    eq(subcategories.isActive, true),
                ),
            )
            .limit(1);

        if (!subcategory) {
            return res.status(404).json({
                success: false,
                message: "Subkategori tidak ditemukan",
            });
        }

        const topicData = await db
            .select({
                id: faqTopics.id,
                name: faqTopics.name,
                slug: faqTopics.slug,
                description: faqTopics.description,
                sortOrder: faqTopics.sortOrder,
            })
            .from(faqTopics)
            .where(
                and(
                    eq(faqTopics.subcategoryId, subcategory.id),
                    eq(faqTopics.isActive, true),
                ),
            )
            .orderBy(asc(faqTopics.sortOrder));

        /*
         * Hitungan FAQ per topik untuk badge sidebar demo.
         * Dikelompokkan per (visibility, isPublished) lalu dinilai dengan
         * aturan simulasi yang sama seperti endpoint lain — tanpa mengirim
         * jawaban FAQ apa pun.
         */
        const topicIds = topicData.map((topic) => topic.id);

        let faqCountByTopic = {};
        let restrictedByTopic = {};

        if (topicIds.length > 0) {
            const groups = await db
                .select({
                    topicId: faqs.topicId,
                    visibility: faqs.visibility,
                    isPublished: faqs.isPublished,
                    total: count(),
                })
                .from(faqs)
                .where(inArray(faqs.topicId, topicIds))
                .groupBy(
                    faqs.topicId,
                    faqs.visibility,
                    faqs.isPublished,
                );

            for (const row of groups) {
                const key = row.topicId;
                const total = Number(row.total ?? 0);
                const probe = {
                    visibility: row.visibility,
                    isPublished: row.isPublished,
                };

                faqCountByTopic[key] =
                    (faqCountByTopic[key] ?? 0) +
                    (canViewerSeeFaq(probe, viewerRole) ? total : 0);

                if (!canViewerSeeFaq(probe, viewerRole) && total > 0) {
                    restrictedByTopic[key] = true;
                }
            }
        }

        const topicsWithCounts = topicData.map((topic) => ({
            ...topic,
            faqCount: faqCountByTopic[topic.id] ?? 0,
            hasRestricted: Boolean(restrictedByTopic[topic.id]),
        }));

        return res.status(200).json({
            success: true,
            message: "Topik FAQ berhasil diambil",
            data: {
                subcategory,
                topics: topicsWithCounts,
            },
        });
    } catch (error) {
        console.error("Gagal mengambil topik FAQ:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil topik FAQ",
        });
    }
}