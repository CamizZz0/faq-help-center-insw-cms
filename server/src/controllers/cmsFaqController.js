import {
    and,
    asc,
    count,
    desc,
    eq,
    ilike,
    or,
} from "drizzle-orm";

import { db } from "../config/db.js";

import {
    categories,
    subcategories,
    faqTopics,
    faqs,
} from "../models/schema.js";

export async function getCmsFaqs(req, res) {
    try {
        const search = String(
            req.query.search ?? ""
        ).trim();

        const categorySlug = String(
            req.query.category ?? ""
        ).trim();

        const status = String(
            req.query.status ?? ""
        ).trim();

        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);

        if (
            !Number.isInteger(page) ||
            page < 1 ||
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 50
        ) {
            return res.status(400).json({
                success: false,
                message: "Parameter pagination tidak valid",
            });
        }

        if (
            status &&
            status !== "published" &&
            status !== "draft"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Status harus bernilai published atau draft",
            });
        }

        const conditions = [];

        if (search) {
            conditions.push(
                or(
                    ilike(
                        faqs.question,
                        `%${search}%`
                    ),
                    ilike(
                        faqs.answer,
                        `%${search}%`
                    )
                )
            );
        }

        if (categorySlug) {
            conditions.push(
                eq(
                    categories.slug,
                    categorySlug
                )
            );
        }

        if (status === "published") {
            conditions.push(
                eq(faqs.isPublished, true)
            );
        }

        if (status === "draft") {
            conditions.push(
                eq(faqs.isPublished, false)
            );
        }

        const filter =
            conditions.length > 0
                ? and(...conditions)
                : undefined;

        const offset = (page - 1) * limit;

        const countQuery = db
            .select({
                totalItems: count(),
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
            );

        const [{ totalItems }] = filter
            ? await countQuery.where(filter)
            : await countQuery;

        const dataQuery = db
            .select({
                id: faqs.id,
                question: faqs.question,
                answer: faqs.answer,
                isPopular: faqs.isPopular,
                isPublished: faqs.isPublished,
                sortOrder: faqs.sortOrder,
                createdAt: faqs.createdAt,
                updatedAt: faqs.updatedAt,

                topic: {
                    id: faqTopics.id,
                    name: faqTopics.name,
                    slug: faqTopics.slug,
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
            );

        const faqData = await (
            filter
                ? dataQuery.where(filter)
                : dataQuery
        )
            .orderBy(
                desc(faqs.updatedAt),
                asc(faqs.sortOrder)
            )
            .limit(limit)
            .offset(offset);

        const totalPages =
            Math.ceil(totalItems / limit);

        return res.status(200).json({
            success: true,
            message: "Data FAQ CMS berhasil diambil",
            data: faqData,
            meta: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        });
    } catch (error) {
        console.error(
            "Gagal mengambil FAQ CMS:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Terjadi kesalahan saat mengambil FAQ CMS",
        });
    }
}