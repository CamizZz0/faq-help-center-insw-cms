import {
    and,
    asc,
    count,
    eq,
    ilike,
    inArray,
    or,
} from "drizzle-orm";

import { db } from "../config/db.js";

import {
    categories,
    subcategories,
    faqTopics,
    faqs,
} from "../models/schema.js";

import {
    normalizeViewerRole,
    visibleVisibilitiesForRole,
    getLockedMetadata,
    getVisibilityCounts,
} from "../utils/faqVisibility.js";

export async function getAllFaqs(req, res) {
    try {
        const search = String(req.query.search ?? "").trim();
        const categorySlug = String(req.query.category ?? "").trim();
        const subcategorySlug = String(
            req.query.subcategory ?? "",
        ).trim();

        const popular = req.query.popular;
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 6);

        // SIMULASI DEMO (bukan autentikasi): role pembaca diambil dari
        // query param `viewerRole=guest|authenticated`.
        // TODO(auth): hapus param ini setelah login resmi tersedia dan
        // tentukan role dari sesi/JWT di backend. Jangan percaya role
        // yang dikirim frontend.
        const viewerRole = normalizeViewerRole(req.query.viewerRole);
        const allowedVisibilities =
            visibleVisibilitiesForRole(viewerRole);

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
            popular !== undefined &&
            popular !== "true" &&
            popular !== "false"
        ) {
            return res.status(400).json({
                success: false,
                message: "Parameter popular harus bernilai true atau false",
            });
        }

        const conditions = [
            eq(faqTopics.isActive, true),
            eq(subcategories.isActive, true),
            eq(categories.isActive, true),
        ];

        conditions.push(eq(faqs.isPublished, true));
        conditions.push(
            inArray(faqs.visibility, allowedVisibilities),
        );

        if (search) {
            conditions.push(
                or(
                    ilike(faqs.question, `%${search}%`),
                    ilike(faqs.answer, `%${search}%`),
                ),
            );
        }

        if (categorySlug) {
            conditions.push(eq(categories.slug, categorySlug));
        }

        if (subcategorySlug) {
            conditions.push(eq(subcategories.slug, subcategorySlug));
        }

        if (popular !== undefined) {
            conditions.push(
                eq(faqs.isPopular, popular === "true"),
            );
        }

        const filter = and(...conditions);
        const offset = (page - 1) * limit;

        const [{ totalItems }] = await db
            .select({
                totalItems: count(),
            })
            .from(faqs)
            .innerJoin(
                faqTopics,
                eq(faqs.topicId, faqTopics.id),
            )
            .innerJoin(
                subcategories,
                eq(faqTopics.subcategoryId, subcategories.id),
            )
            .innerJoin(
                categories,
                eq(subcategories.categoryId, categories.id),
            )
            .where(filter);

        const totalPages = Math.ceil(totalItems / limit);

        const faqData = await db
            .select({
                id: faqs.id,
                question: faqs.question,
                answer: faqs.answer,
                isPopular: faqs.isPopular,
                isPublished: faqs.isPublished,
                visibility: faqs.visibility,
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
                eq(faqs.topicId, faqTopics.id),
            )
            .innerJoin(
                subcategories,
                eq(faqTopics.subcategoryId, subcategories.id),
            )
            .innerJoin(
                categories,
                eq(subcategories.categoryId, categories.id),
            )
            .where(filter)
            .orderBy(
                asc(categories.sortOrder),
                asc(subcategories.sortOrder),
                asc(faqTopics.sortOrder),
                asc(faqs.sortOrder),
            )
            .limit(limit)
            .offset(offset);

        /*
         * Metadata demo: seluruh FAQ yang cocok dengan filter non-role
         * (search/kategori/popular) dipakai untuk ringkasan visibilitas
         * dan daftar terkunci. `locked` TIDAK memuat `answer`.
         * TODO(auth): pertahankan pola ini setelah autentikasi resmi tersedia.
         */
        const roleFreeConditions = [
            eq(faqTopics.isActive, true),
            eq(subcategories.isActive, true),
            eq(categories.isActive, true),
        ];

        if (search) {
            roleFreeConditions.push(
                or(
                    ilike(faqs.question, `%${search}%`),
                    ilike(faqs.answer, `%${search}%`),
                ),
            );
        }

        if (categorySlug) {
            roleFreeConditions.push(eq(categories.slug, categorySlug));
        }

        if (subcategorySlug) {
            roleFreeConditions.push(eq(subcategories.slug, subcategorySlug));
        }

        if (popular !== undefined) {
            roleFreeConditions.push(
                eq(faqs.isPopular, popular === "true"),
            );
        }

        const allMatchingFaqs = await db
            .select({
                id: faqs.id,
                question: faqs.question,
                isPublished: faqs.isPublished,
                visibility: faqs.visibility,
            })
            .from(faqs)
            .innerJoin(
                faqTopics,
                eq(faqs.topicId, faqTopics.id),
            )
            .innerJoin(
                subcategories,
                eq(faqTopics.subcategoryId, subcategories.id),
            )
            .innerJoin(
                categories,
                eq(subcategories.categoryId, categories.id),
            )
            .where(and(...roleFreeConditions));

        const visibilityCounts = getVisibilityCounts(allMatchingFaqs);
        const locked = getLockedMetadata(allMatchingFaqs, viewerRole);

        return res.status(200).json({
            success: true,
            message: "FAQ berhasil diambil",
            data: faqData,
            locked,
            meta: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
                visibilityCounts,
            },
        });
    } catch (error) {
        console.error("Gagal mengambil FAQ:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil FAQ",
        });
    }
}
