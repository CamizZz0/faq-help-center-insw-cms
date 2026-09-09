import { and, asc, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { categories, subcategories } from "../models/schema.js";

export async function getAllCategories(req, res) {
    try {
        const data = await db
            .select()
            .from(categories)
            .where(eq(categories.isActive, true))
            .orderBy(asc(categories.sortOrder));

        res.status(200).json({
            success: true,
            message: "Kategori berhasil diambil",
            data,
        });
    } catch (error) {
        console.error("Gagal mengambil kategori:", error);

        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil kategori",
        });
    }
}

export async function getSubcategoriesByCategory(req, res) {
    try {
        const { categorySlug } = req.params;

        const [category] = await db
            .select({
                id: categories.id,
                name: categories.name,
                slug: categories.slug,
                description: categories.description,
                icon: categories.icon,
            })
            .from(categories)
            .where(
                and(
                    eq(categories.slug, categorySlug),
                    eq(categories.isActive, true),
                ),
            )
            .limit(1);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Kategori tidak ditemukan",
            });
        }

        const subcategoryData = await db
            .select({
                id: subcategories.id,
                name: subcategories.name,
                slug: subcategories.slug,
                description: subcategories.description,
                icon: subcategories.icon,
                sortOrder: subcategories.sortOrder,
            })
            .from(subcategories)
            .where(
                and(
                    eq(subcategories.categoryId, category.id),
                    eq(subcategories.isActive, true),
                ),
            )
            .orderBy(asc(subcategories.sortOrder));

        return res.status(200).json({
            success: true,
            message: "Subkategori berhasil diambil",
            data: {
                category,
                subcategories: subcategoryData,
            },
        });
    } catch (error) {
        console.error("Gagal mengambil subkategori:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil subkategori",
        });
    }
}