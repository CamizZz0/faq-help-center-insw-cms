import { and, asc, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import {
    subcategories,
    faqTopics,
} from "../models/schema.js";

export async function getTopicsBySubcategory(req, res) {
    try {
        const { subcategorySlug } = req.params;

        const [subcategory] = await db
            .select({
                id: subcategories.id,
                name: subcategories.name,
                slug: subcategories.slug,
                description: subcategories.description,
                icon: subcategories.icon,
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

        return res.status(200).json({
            success: true,
            message: "Topik FAQ berhasil diambil",
            data: {
                subcategory,
                topics: topicData,
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