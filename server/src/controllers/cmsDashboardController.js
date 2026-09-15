import { count, desc, eq, sql } from "drizzle-orm";

import { db } from "../config/db.js";

import {
    categories,
    subcategories,
    faqTopics,
    faqs,
    guides,
    tutorials,
    faqFeedback,
} from "../models/schema.js";

const RECENT_LIMIT = 5;

/*
 * Menyusun query hitung jumlah baris. Filter bersifat
 * opsional agar tabel tanpa status aktif tetap terhitung.
 */
function countRows(table, condition) {
    const query = db.select({ total: count() }).from(table);

    return condition ? query.where(condition) : query;
}

async function resolveTotal(query) {
    const [row] = await query;

    return Number(row?.total ?? 0);
}

export async function getCmsDashboard(req, res) {
    try {
        /*
         * Seluruh query statistik dan konten terbaru
         * dijalankan bersamaan.
         */
        const [
            totalCategories,
            totalSubcategories,
            totalTopics,
            totalFaqs,
            publishedFaqs,
            draftFaqs,
            popularFaqs,
            totalGuides,
            publishedGuides,
            draftGuides,
            totalTutorials,
            publishedTutorials,
            draftTutorials,
            recentFaqs,
            recentGuides,
            recentTutorials,
            feedbackSummary,
            negativeFeedbackFaqs,
        ] = await Promise.all([
            resolveTotal(
                countRows(
                    categories,
                    eq(categories.isActive, true)
                )
            ),

            resolveTotal(
                countRows(
                    subcategories,
                    eq(subcategories.isActive, true)
                )
            ),

            resolveTotal(
                countRows(
                    faqTopics,
                    eq(faqTopics.isActive, true)
                )
            ),

            resolveTotal(countRows(faqs)),
            resolveTotal(
                countRows(
                    faqs,
                    eq(faqs.isPublished, true)
                )
            ),
            resolveTotal(
                countRows(
                    faqs,
                    eq(faqs.isPublished, false)
                )
            ),
            resolveTotal(
                countRows(
                    faqs,
                    eq(faqs.isPopular, true)
                )
            ),

            resolveTotal(countRows(guides)),
            resolveTotal(
                countRows(
                    guides,
                    eq(guides.isPublished, true)
                )
            ),
            resolveTotal(
                countRows(
                    guides,
                    eq(guides.isPublished, false)
                )
            ),

            resolveTotal(countRows(tutorials)),
            resolveTotal(
                countRows(
                    tutorials,
                    eq(tutorials.isPublished, true)
                )
            ),
            resolveTotal(
                countRows(
                    tutorials,
                    eq(tutorials.isPublished, false)
                )
            ),

            db
                .select({
                    id: faqs.id,
                    question: faqs.question,
                    isPublished: faqs.isPublished,
                    visibility: faqs.visibility,
                    updatedAt: faqs.updatedAt,

                    topic: {
                        name: faqTopics.name,
                        slug: faqTopics.slug,
                    },

                    subcategory: {
                        name: subcategories.name,
                        slug: subcategories.slug,
                    },

                    category: {
                        name: categories.name,
                        slug: categories.slug,
                    },
                })
                .from(faqs)
                .innerJoin(
                    faqTopics,
                    eq(faqs.topicId, faqTopics.id)
                )
                .innerJoin(
                    subcategories,
                    eq(
                        faqTopics.subcategoryId,
                        subcategories.id
                    )
                )
                .innerJoin(
                    categories,
                    eq(
                        subcategories.categoryId,
                        categories.id
                    )
                )
                .orderBy(desc(faqs.updatedAt))
                .limit(RECENT_LIMIT),

            db
                .select({
                    id: guides.id,
                    title: guides.title,
                    isPublished: guides.isPublished,
                    updatedAt: guides.updatedAt,
                })
                .from(guides)
                .orderBy(desc(guides.updatedAt))
                .limit(RECENT_LIMIT),

            db
                .select({
                    id: tutorials.id,
                    title: tutorials.title,
                    isPublished: tutorials.isPublished,
                    updatedAt: tutorials.updatedAt,
                })
                .from(tutorials)
                .orderBy(desc(tutorials.updatedAt))
                .limit(RECENT_LIMIT),

            db
                .select({
                    total: count(faqFeedback.id),
                    helpful: sql`count(*) filter (where ${faqFeedback.isHelpful} = true)`,
                    notHelpful: sql`count(*) filter (where ${faqFeedback.isHelpful} = false)`,
                })
                .from(faqFeedback),

            db
                .select({
                    faqId: faqs.id,
                    question: faqs.question,
                    total: count(faqFeedback.id),
                    notHelpful: sql`count(*) filter (where ${faqFeedback.isHelpful} = false)`,
                })
                .from(faqFeedback)
                .innerJoin(faqs, eq(faqFeedback.faqId, faqs.id))
                .groupBy(faqs.id, faqs.question)
                .orderBy(desc(sql`count(*) filter (where ${faqFeedback.isHelpful} = false)`))
                .limit(RECENT_LIMIT),
        ]);

        return res.status(200).json({
            success: true,
            message: "Ringkasan dashboard berhasil diambil",
            data: {
                statistics: {
                    categories: totalCategories,
                    subcategories: totalSubcategories,
                    topics: totalTopics,

                    faqs: {
                        total: totalFaqs,
                        published: publishedFaqs,
                        draft: draftFaqs,
                        popular: popularFaqs,
                    },

                    guides: {
                        total: totalGuides,
                        published: publishedGuides,
                        draft: draftGuides,
                    },

                    tutorials: {
                        total: totalTutorials,
                        published: publishedTutorials,
                        draft: draftTutorials,
                    },

                    feedback: {
                        total: Number(feedbackSummary?.[0]?.total ?? 0),
                        helpful: Number(feedbackSummary?.[0]?.helpful ?? 0),
                        notHelpful: Number(feedbackSummary?.[0]?.notHelpful ?? 0),
                    },
                },

                recentContent: {
                    faqs: recentFaqs,
                    guides: recentGuides,
                    tutorials: recentTutorials,
                },

                negativeFeedbackFaqs: negativeFeedbackFaqs.map((faq) => ({
                    ...faq,
                    total: Number(faq.total ?? 0),
                    notHelpful: Number(faq.notHelpful ?? 0),
                })),
            },
        });
    } catch (error) {
        console.error(
            "Gagal mengambil ringkasan dashboard:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Terjadi kesalahan saat mengambil ringkasan dashboard",
        });
    }
}
