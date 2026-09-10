import {
    asc,
    count,
    eq,
} from "drizzle-orm";

import { db } from "../config/db.js";

import {
    categories,
    subcategories,
} from "../models/schema.js";

function createSlug(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/&/g, " ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getDatabaseErrorCode(error) {
    return error?.cause?.code ?? error?.code;
}

export async function getCmsCategories(req, res) {
    try {
        const data = await db
            .select({
                id: categories.id,
                name: categories.name,
                slug: categories.slug,
                description: categories.description,
                icon: categories.icon,
                sortOrder: categories.sortOrder,
                isActive: categories.isActive,
                createdAt: categories.createdAt,
                updatedAt: categories.updatedAt,
                subcategoryCount: count(subcategories.id),
            })
            .from(categories)
            .leftJoin(
                subcategories,
                eq(subcategories.categoryId, categories.id)
            )
            .groupBy(categories.id)
            .orderBy(
                asc(categories.sortOrder),
                asc(categories.name)
            );

        return res.status(200).json({
            success: true,
            message: "Data kategori CMS berhasil diambil",
            data,
        });
    } catch (error) {
        console.error(
            "Gagal mengambil kategori CMS:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Terjadi kesalahan saat mengambil kategori",
        });
    }
}

export async function getCmsCategoryById(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "ID kategori tidak valid",
            });
        }

        const [category] = await db
            .select({
                id: categories.id,
                name: categories.name,
                slug: categories.slug,
                description: categories.description,
                icon: categories.icon,
                sortOrder: categories.sortOrder,
                isActive: categories.isActive,
                createdAt: categories.createdAt,
                updatedAt: categories.updatedAt,
            })
            .from(categories)
            .where(eq(categories.id, id))
            .limit(1);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Kategori tidak ditemukan",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Detail kategori berhasil diambil",
            data: category,
        });
    } catch (error) {
        console.error(
            "Gagal mengambil detail kategori:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Terjadi kesalahan saat mengambil detail kategori",
        });
    }
}

export async function createCmsCategory(req, res) {
    try {
        const {
            name,
            slug,
            description = "",
            icon = "",
            sortOrder = 0,
            isActive = true,
        } = req.body;

        const cleanName = String(name ?? "").trim();
        const cleanSlug = createSlug(
            slug || cleanName
        );

        const parsedSortOrder = Number(sortOrder);

        if (cleanName.length < 3) {
            return res.status(400).json({
                success: false,
                message:
                    "Nama kategori minimal 3 karakter",
            });
        }

        if (!cleanSlug) {
            return res.status(400).json({
                success: false,
                message: "Slug kategori tidak valid",
            });
        }

        if (
            !Number.isInteger(parsedSortOrder) ||
            parsedSortOrder < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Urutan harus berupa bilangan bulat minimal 0",
            });
        }

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                message:
                    "isActive harus berupa boolean",
            });
        }

        const [existingCategory] = await db
            .select({
                id: categories.id,
            })
            .from(categories)
            .where(eq(categories.slug, cleanSlug))
            .limit(1);

        if (existingCategory) {
            return res.status(409).json({
                success: false,
                message:
                    "Slug kategori sudah digunakan",
            });
        }

        const [createdCategory] = await db
            .insert(categories)
            .values({
                name: cleanName,
                slug: cleanSlug,
                description:
                    String(description ?? "").trim() ||
                    null,
                icon:
                    String(icon ?? "").trim() ||
                    null,
                sortOrder: parsedSortOrder,
                isActive,
            })
            .returning();

        return res.status(201).json({
            success: true,
            message: "Kategori berhasil ditambahkan",
            data: createdCategory,
        });
    } catch (error) {
        console.error(
            "Gagal menambahkan kategori:",
            error
        );

        if (getDatabaseErrorCode(error) === "23505") {
            return res.status(409).json({
                success: false,
                message:
                    "Slug kategori sudah digunakan",
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Terjadi kesalahan saat menambahkan kategori",
        });
    }
}

export async function updateCmsCategory(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "ID kategori tidak valid",
            });
        }

        const [existingCategory] = await db
            .select()
            .from(categories)
            .where(eq(categories.id, id))
            .limit(1);

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: "Kategori tidak ditemukan",
            });
        }

        const updates = {};

        if (req.body.name !== undefined) {
            const name = String(
                req.body.name ?? ""
            ).trim();

            if (name.length < 3) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Nama kategori minimal 3 karakter",
                });
            }

            updates.name = name;
        }

        if (req.body.slug !== undefined) {
            const slug = createSlug(req.body.slug);

            if (!slug) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Slug kategori tidak valid",
                });
            }

            const [slugOwner] = await db
                .select({
                    id: categories.id,
                })
                .from(categories)
                .where(eq(categories.slug, slug))
                .limit(1);

            if (
                slugOwner &&
                slugOwner.id !== id
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Slug kategori sudah digunakan",
                });
            }

            updates.slug = slug;
        }

        if (req.body.description !== undefined) {
            updates.description =
                String(
                    req.body.description ?? ""
                ).trim() || null;
        }

        if (req.body.icon !== undefined) {
            updates.icon =
                String(
                    req.body.icon ?? ""
                ).trim() || null;
        }

        if (req.body.sortOrder !== undefined) {
            const sortOrder = Number(
                req.body.sortOrder
            );

            if (
                String(req.body.sortOrder).trim() === "" ||
                !Number.isInteger(sortOrder) ||
                sortOrder < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Urutan harus berupa bilangan bulat minimal 0",
                });
            }

            updates.sortOrder = sortOrder;
        }

        if (req.body.isActive !== undefined) {
            if (
                typeof req.body.isActive !==
                "boolean"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "isActive harus berupa boolean",
                });
            }

            updates.isActive = req.body.isActive;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Tidak ada data kategori yang diperbarui",
            });
        }

        updates.updatedAt = new Date();

        const [updatedCategory] = await db
            .update(categories)
            .set(updates)
            .where(eq(categories.id, id))
            .returning();

        return res.status(200).json({
            success: true,
            message: "Kategori berhasil diperbarui",
            data: updatedCategory,
        });
    } catch (error) {
        console.error(
            "Gagal memperbarui kategori:",
            error
        );

        if (getDatabaseErrorCode(error) === "23505") {
            return res.status(409).json({
                success: false,
                message:
                    "Slug kategori sudah digunakan",
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Terjadi kesalahan saat memperbarui kategori",
        });
    }
}

export async function deleteCmsCategory(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                success: false,
                message: "ID kategori tidak valid",
            });
        }

        const [category] = await db
            .select({
                id: categories.id,
                name: categories.name,
            })
            .from(categories)
            .where(eq(categories.id, id))
            .limit(1);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Kategori tidak ditemukan",
            });
        }

        const [{ totalSubcategories }] = await db
            .select({
                totalSubcategories:
                    count(subcategories.id),
            })
            .from(subcategories)
            .where(
                eq(subcategories.categoryId, id)
            );

        if (totalSubcategories > 0) {
            return res.status(409).json({
                success: false,
                message:
                    `Kategori masih memiliki ${totalSubcategories} subkategori. ` +
                    "Hapus atau pindahkan subkategori terlebih dahulu.",
            });
        }

        const [deletedCategory] = await db
            .delete(categories)
            .where(eq(categories.id, id))
            .returning({
                id: categories.id,
                name: categories.name,
            });

        return res.status(200).json({
            success: true,
            message: "Kategori berhasil dihapus",
            data: deletedCategory,
        });
    } catch (error) {
        console.error(
            "Gagal menghapus kategori:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Terjadi kesalahan saat menghapus kategori",
        });
    }
}