import {
    and,
    asc,
    eq,
    ilike,
} from "drizzle-orm";

import { db } from "../config/db.js";

import {
    categories,
    faqs,
    faqTopics,
    guides,
    subcategories,
    tutorials,
} from "../models/schema.js";

import {
    guideForResponse,
} from "../services/guideFiles.js";

function validationError(res, message) {
    return res.status(400).json({
        success: false,
        message,
    });
}

export async function searchHelpCenter(req, res) {
    const rawQuery = req.query.q;

    if (typeof rawQuery !== "string") {
        return validationError(
            res,
            "Parameter q wajib berupa string.",
        );
    }

    const query = rawQuery.trim();

    if (
        query.length < 2 ||
        query.length > 100
    ) {
        return validationError(
            res,
            "Kata kunci pencarian harus terdiri dari 2–100 karakter.",
        );
    }

    const rawPage =
        req.query.page ?? "1";

    const rawLimit =
        req.query.limit ?? "6";

    if (
        typeof rawPage !== "string" ||
        !/^\d+$/.test(rawPage.trim())
    ) {
        return validationError(
            res,
            "Page harus berupa bilangan bulat minimal 1.",
        );
    }

    if (
        typeof rawLimit !== "string" ||
        !/^\d+$/.test(rawLimit.trim())
    ) {
        return validationError(
            res,
            "Limit harus berupa bilangan bulat antara 1–20.",
        );
    }

    const page = Number(rawPage);
    const limit = Number(rawLimit);

    if (
        !Number.isSafeInteger(page) ||
        page < 1
    ) {
        return validationError(
            res,
            "Page harus berupa bilangan bulat minimal 1.",
        );
    }

    if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 20
    ) {
        return validationError(
            res,
            "Limit harus berupa bilangan bulat antara 1–20.",
        );
    }

    const offset =
        (page - 1) * limit;

    if (!Number.isSafeInteger(offset)) {
        return validationError(
            res,
            "Parameter pagination tidak valid.",
        );
    }

    /*
     * Mencegah karakter %, _, dan backslash
     * dianggap sebagai wildcard pencarian SQL.
     */
    const escapedQuery = query.replace(
        /[\\%_]/g,
        "\\$&",
    );

    const pattern =
        `%${escapedQuery}%`;

    /*
     * Pencarian FAQ hanya berdasarkan judul
     * pertanyaan, yaitu faqs.question.
     */
    const faqFilter = and(
        eq(faqs.isPublished, true),
        eq(faqTopics.isActive, true),
        eq(subcategories.isActive, true),
        eq(categories.isActive, true),
        ilike(faqs.question, pattern),
    );

    /*
     * Pencarian Panduan hanya berdasarkan title.
     */
    const guideFilter = and(
        eq(guides.isPublished, true),
        ilike(guides.title, pattern),
    );

    /*
     * Pencarian Tutorial hanya berdasarkan title.
     */
    const tutorialFilter = and(
        eq(tutorials.isPublished, true),
        ilike(tutorials.title, pattern),
    );

    try {
        const [
            faqData,
            guideData,
            tutorialData,
        ] = await Promise.all([
            db
                .select({
                    id: faqs.id,
                    question: faqs.question,
                    answer: faqs.answer,
                    isPopular:
                        faqs.isPopular,

                    category: {
                        name:
                            categories.name,
                        slug:
                            categories.slug,
                    },

                    subcategory: {
                        name:
                            subcategories.name,
                        slug:
                            subcategories.slug,
                    },

                    topic: {
                        name:
                            faqTopics.name,
                        slug:
                            faqTopics.slug,
                    },
                })
                .from(faqs)
                .innerJoin(
                    faqTopics,
                    eq(
                        faqs.topicId,
                        faqTopics.id,
                    ),
                )
                .innerJoin(
                    subcategories,
                    eq(
                        faqTopics.subcategoryId,
                        subcategories.id,
                    ),
                )
                .innerJoin(
                    categories,
                    eq(
                        subcategories.categoryId,
                        categories.id,
                    ),
                )
                .where(faqFilter)
                .orderBy(
                    asc(
                        categories.sortOrder,
                    ),
                    asc(
                        subcategories.sortOrder,
                    ),
                    asc(
                        faqTopics.sortOrder,
                    ),
                    asc(faqs.sortOrder),
                    asc(faqs.id),
                ),

            db
                .select({
                    id: guides.id,
                    title: guides.title,
                    slug: guides.slug,
                    description:
                        guides.description,
                    fileUrl:
                        guides.fileUrl,
                })
                .from(guides)
                .where(guideFilter)
                .orderBy(
                    asc(guides.sortOrder),
                    asc(guides.id),
                ),

            db
                .select({
                    id: tutorials.id,
                    title:
                        tutorials.title,
                    slug:
                        tutorials.slug,
                    description:
                        tutorials.description,
                    videoUrl:
                        tutorials.videoUrl,
                    thumbnailUrl:
                        tutorials.thumbnailUrl,
                })
                .from(tutorials)
                .where(tutorialFilter)
                .orderBy(
                    asc(
                        tutorials.sortOrder,
                    ),
                    asc(tutorials.id),
                ),
        ]);

        /*
         * Mengubah URL panduan lokal atau Supabase
         * menjadi URL yang siap digunakan frontend.
         */
        const normalizedGuides =
            guideData.map((guide) =>
                guideForResponse(
                    guide,
                    req,
                ),
            );

        /*
         * Menggabungkan FAQ, Panduan, dan Tutorial
         * ke dalam satu daftar hasil pencarian.
         */
        const allResults = [
            ...faqData.map((item) => ({
                ...item,
                resultType: "faq",
            })),

            ...normalizedGuides.map(
                (item) => ({
                    ...item,
                    resultType: "guide",
                }),
            ),

            ...tutorialData.map(
                (item) => ({
                    ...item,
                    resultType:
                        "tutorial",
                }),
            ),
        ];

        const counts = {
            faqs: faqData.length,
            guides:
                normalizedGuides.length,
            tutorials:
                tutorialData.length,
        };

        const totalItems =
            allResults.length;

        const totalPages =
            Math.ceil(
                totalItems / limit,
            );

        /*
         * Pagination diterapkan setelah seluruh
         * jenis konten digabungkan.
         */
        const pageResults =
            allResults.slice(
                offset,
                offset + limit,
            );

        return res.status(200).json({
            success: true,
            message:
                "Hasil pencarian berhasil diambil",

            data: {
                results:
                    pageResults,
            },

            meta: {
                query,
                page,
                limit,
                totalItems,
                totalPages,

                hasNextPage:
                    page < totalPages,

                hasPreviousPage:
                    page > 1,

                counts,
            },
        });
    } catch (error) {
        console.error(
            "Gagal melakukan pencarian terpadu:",
            error,
        );

        return res.status(500).json({
            success: false,
            message:
                "Terjadi kesalahan saat melakukan pencarian.",
        });
    }
}
