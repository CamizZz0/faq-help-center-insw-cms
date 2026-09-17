import { count, desc, eq, sql } from "drizzle-orm";

import { db } from "../config/db.js";

import {
    categories,
    subcategories,
    faqTopics,
    faqs,
    guides,
    tutorials,
    contentFeedback,
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

/*
 * Mengubah hasil query feedback yang dikelompokkan per content_type
 * menjadi angka siap pakai, lengkap dengan rincian per jenis konten.
 */
function ringkasFeedback(rows) {
    const jenisBaru = () => ({ total: 0, helpful: 0, notHelpful: 0 });
    const byType = { faq: jenisBaru(), guide: jenisBaru(), tutorial: jenisBaru() };

    const total = { total: 0, helpful: 0, notHelpful: 0 };

    for (const row of rows) {
        const jenis = byType[row.contentType];
        if (!jenis) continue;

        jenis.total = Number(row.total ?? 0);
        jenis.helpful = Number(row.helpful ?? 0);
        jenis.notHelpful = Number(row.notHelpful ?? 0);

        total.total += jenis.total;
        total.helpful += jenis.helpful;
        total.notHelpful += jenis.notHelpful;
    }

    return { ...total, byType };
}

/*
 * Menyeragamkan daftar konten dengan feedback negatif terbanyak.
 */
function rapikanDaftarNegatif(rows) {
    return rows.map((row) => ({
        contentId: row.contentId,
        title: row.title,
        total: Number(row.total ?? 0),
        notHelpful: Number(row.notHelpful ?? 0),
    }));
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
            negativeFeedbackGuides,
            negativeFeedbackTutorials,
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
                    contentType: contentFeedback.contentType,
                    total: count(contentFeedback.id),
                    helpful: sql`count(*) filter (where ${contentFeedback.isHelpful} = true)`,
                    notHelpful: sql`count(*) filter (where ${contentFeedback.isHelpful} = false)`,
                })
                .from(contentFeedback)
                .groupBy(contentFeedback.contentType),

            db
                .select({
                    contentId: faqs.id,
                    title: faqs.question,
                    total: count(contentFeedback.id),
                    notHelpful: sql`count(*) filter (where ${contentFeedback.isHelpful} = false)`,
                })
                .from(contentFeedback)
                .innerJoin(faqs, eq(contentFeedback.contentId, faqs.id))
                .where(eq(contentFeedback.contentType, "faq"))
                .groupBy(faqs.id, faqs.question)
                .orderBy(desc(sql`count(*) filter (where ${contentFeedback.isHelpful} = false)`))
                .limit(RECENT_LIMIT),

            db
                .select({
                    contentId: guides.id,
                    title: guides.title,
                    total: count(contentFeedback.id),
                    notHelpful: sql`count(*) filter (where ${contentFeedback.isHelpful} = false)`,
                })
                .from(contentFeedback)
                .innerJoin(guides, eq(contentFeedback.contentId, guides.id))
                .where(eq(contentFeedback.contentType, "guide"))
                .groupBy(guides.id, guides.title)
                .orderBy(desc(sql`count(*) filter (where ${contentFeedback.isHelpful} = false)`))
                .limit(RECENT_LIMIT),

            db
                .select({
                    contentId: tutorials.id,
                    title: tutorials.title,
                    total: count(contentFeedback.id),
                    notHelpful: sql`count(*) filter (where ${contentFeedback.isHelpful} = false)`,
                })
                .from(contentFeedback)
                .innerJoin(tutorials, eq(contentFeedback.contentId, tutorials.id))
                .where(eq(contentFeedback.contentType, "tutorial"))
                .groupBy(tutorials.id, tutorials.title)
                .orderBy(desc(sql`count(*) filter (where ${contentFeedback.isHelpful} = false)`))
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

                    feedback: ringkasFeedback(feedbackSummary),
                },

                recentContent: {
                    faqs: recentFaqs,
                    guides: recentGuides,
                    tutorials: recentTutorials,
                },

                negativeFeedbackFaqs: rapikanDaftarNegatif(negativeFeedbackFaqs),
                negativeFeedbackGuides: rapikanDaftarNegatif(negativeFeedbackGuides),
                negativeFeedbackTutorials: rapikanDaftarNegatif(negativeFeedbackTutorials),
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
