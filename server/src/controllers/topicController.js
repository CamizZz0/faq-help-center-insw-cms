import {
    and,
    asc,
    count,
    eq,
} from "drizzle-orm";

import { db } from "../config/db.js";

import {
    categories,
    subcategories,
    faqTopics,
    faqs,
} from "../models/schema.js";

export async function getFaqsByTopic(req, res) {
    try {
        const { topicSlug } = req.params;

        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 6);

        if (
            !Number.isInteger(page) ||
            page < 1 ||
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 50
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Parameter pagination tidak valid",
                errors: [
                    {
                        field: "page",
                        message:
                            "Page harus berupa bilangan bulat minimal 1",
                    },
                    {
                        field: "limit",
                        message:
                            "Limit harus bernilai antara 1 sampai 50",
                    },
                ],
            });
        }

        /*
         * Mengambil topik beserta subkategori
         * dan kategori induknya.
         */
        const [topicContext] = await db
            .select({
                topic: {
                    id: faqTopics.id,
                    name: faqTopics.name,
                    slug: faqTopics.slug,
                    description:
                        faqTopics.description,
                },

                subcategory: {
                    id: subcategories.id,
                    name: subcategories.name,
                    slug: subcategories.slug,
                },

                category: {
                    id: categories.id,
                    name: categories.name,
                    slug: categories.slug,
                },
            })
            .from(faqTopics)
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
            .where(
                and(
                    eq(
                        faqTopics.slug,
                        topicSlug
                    ),
                    eq(
                        faqTopics.isActive,
                        true
                    ),
                    eq(
                        subcategories.isActive,
                        true
                    ),
                    eq(
                        categories.isActive,
                        true
                    )
                )
            )
            .limit(1);

        if (!topicContext) {
            return res.status(404).json({
                success: false,
                message:
                    "Topik FAQ tidak ditemukan",
            });
        }

        const filter = and(
            eq(
                faqs.topicId,
                topicContext.topic.id
            ),
            eq(faqs.isPublished, true)
        );

        /*
         * Menghitung seluruh FAQ pada topik.
         */
        const [{ totalItems }] = await db
            .select({
                totalItems: count(),
            })
            .from(faqs)
            .where(filter);

        const offset = (page - 1) * limit;
        const totalPages = Math.ceil(
            totalItems / limit
        );

        /*
         * Mengambil FAQ dan menyertakan
         * breadcrumb lengkap.
         */
        const faqData = await db
            .select({
                id: faqs.id,
                question: faqs.question,
                answer: faqs.answer,
                isPopular: faqs.isPopular,
                sortOrder: faqs.sortOrder,

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
                eq(
                    faqs.topicId,
                    faqTopics.id
                )
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
            .where(filter)
            .orderBy(asc(faqs.sortOrder))
            .limit(limit)
            .offset(offset);

        return res.status(200).json({
            success: true,
            message: "FAQ berhasil diambil",
            data: {
                topic: topicContext.topic,
                subcategory:
                    topicContext.subcategory,
                category:
                    topicContext.category,
                faqs: faqData,
            },
            meta: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNextPage:
                    page < totalPages,
                hasPreviousPage: page > 1,
            },
        });
    } catch (error) {
        console.error(
            "Gagal mengambil FAQ berdasarkan topik:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Terjadi kesalahan saat mengambil FAQ",
        });
    }
}