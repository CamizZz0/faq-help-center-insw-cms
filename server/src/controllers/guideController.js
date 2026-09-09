import {
    and,
    asc,
    count,
    eq,
} from "drizzle-orm";

import { db } from "../config/db.js";
import {
    categories,
    guides,
} from "../models/schema.js";

export async function getGuides(req, res, next) {
    try {
        const page = Math.max(
            Number(req.query.page) || 1,
            1
        );

        const limit = Math.min(
            Math.max(Number(req.query.limit) || 6, 1),
            50
        );

        const offset = (page - 1) * limit;
        const categorySlug =
            req.query.category?.trim();

        const conditions = [
            eq(guides.isPublished, true),
        ];

        if (categorySlug) {
            conditions.push(
                eq(categories.slug, categorySlug)
            );
        }

        const whereCondition = and(...conditions);

        const [data, totalResult] = await Promise.all([
            db
                .select({
                    id: guides.id,
                    title: guides.title,
                    slug: guides.slug,
                    description: guides.description,
                    fileUrl: guides.fileUrl,
                    thumbnailUrl: guides.thumbnailUrl,
                    category: {
                        id: categories.id,
                        name: categories.name,
                        slug: categories.slug,
                    },
                })
                .from(guides)
                .leftJoin(
                    categories,
                    eq(guides.categoryId, categories.id)
                )
                .where(whereCondition)
                .orderBy(
                    asc(guides.sortOrder),
                    asc(guides.id)
                )
                .limit(limit)
                .offset(offset),

            db
                .select({
                    total: count(),
                })
                .from(guides)
                .leftJoin(
                    categories,
                    eq(guides.categoryId, categories.id)
                )
                .where(whereCondition),
        ]);

        const totalItems =
            Number(totalResult[0]?.total) || 0;

        const totalPages = Math.ceil(
            totalItems / limit
        );

        res.status(200).json({
            success: true,
            message: "Panduan berhasil diambil",
            data,
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
        next(error);
    }
}

export async function getGuideBySlug(
    req,
    res,
    next
) {
    try {
        const { slug } = req.params;

        const data = await db
            .select({
                id: guides.id,
                title: guides.title,
                slug: guides.slug,
                description: guides.description,
                fileUrl: guides.fileUrl,
                thumbnailUrl: guides.thumbnailUrl,
                category: {
                    id: categories.id,
                    name: categories.name,
                    slug: categories.slug,
                },
            })
            .from(guides)
            .leftJoin(
                categories,
                eq(guides.categoryId, categories.id)
            )
            .where(
                and(
                    eq(guides.slug, slug),
                    eq(guides.isPublished, true)
                )
            )
            .limit(1);

        if (!data[0]) {
            return res.status(404).json({
                success: false,
                message: "Panduan tidak ditemukan",
            });
        }

        res.status(200).json({
            success: true,
            message: "Detail panduan berhasil diambil",
            data: data[0],
        });
    } catch (error) {
        next(error);
    }
}