import {
    and,
    asc,
    count,
    eq,
} from "drizzle-orm";

import { db } from "../config/db.js";
import { guideForResponse } from "../services/guideFiles.js";
import {
    categories,
    guides,
} from "../models/schema.js";

export async function getGuides(req, res) {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 6);
        if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger((page - 1) * limit)) {
            return res.status(400).json({ success: false, message: "Parameter pagination tidak valid" });
        }

        const offset = (page - 1) * limit;
        const categorySlug =
            String(req.query.category ?? "").trim();

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
            data: data.map(guide => guideForResponse(guide, req)),
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
        console.error("Gagal mengambil panduan:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil panduan" });
    }
}

export async function getGuideBySlug(
    req,
    res
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
            data: guideForResponse(data[0], req),
        });
    } catch (error) {
        console.error("Gagal mengambil detail panduan:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan saat mengambil detail panduan" });
    }
}
