import {
    asc,
    count,
    eq,
    max,
} from "drizzle-orm";

import { db } from "../config/db.js";

import {
    categories,
    subcategories,
} from "../models/schema.js";

import {
    removeHelpCenterIcon,
    uploadHelpCenterIcon,
} from "../services/iconStorageService.js";

const ICON_FOLDER = "categories";

/*
 * Daftar kolom respons CMS. Endpoint publik memiliki
 * daftar sendiri karena iconPath tidak boleh dikirim keluar.
 */
const categoryFields = {
    id: categories.id,
    name: categories.name,
    slug: categories.slug,
    description: categories.description,
    icon: categories.icon,
    iconUrl: categories.iconUrl,
    iconPath: categories.iconPath,
    sortOrder: categories.sortOrder,
    isActive: categories.isActive,
    createdAt: categories.createdAt,
    updatedAt: categories.updatedAt,
};

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

/*
 * Body multipart selalu berupa teks, sehingga boolean
 * perlu dinormalisasi dari "true"/"false".
 */
function parseBooleanField(value) {
    if (value === undefined) return undefined;

    if (typeof value === "boolean") return value;

    if (value === "true") return true;

    if (value === "false") return false;

    return null;
}

function parsePositiveId(value) {
    if (!/^\d+$/.test(String(value))) return null;

    const id = Number(value);
    return Number.isSafeInteger(id) && id >= 1 && id <= 2147483647
        ? id
        : null;
}

/*
 * Ikon hanya boleh berasal dari upload file, bukan URL
 * yang dikirim melalui body.
 */
function rejectIconSourceFields(body) {
    for (const field of ["iconUrl", "iconPath"]) {
        if (body[field] !== undefined) {
            return (
                `Field ${field} tidak dapat diatur melalui body. ` +
                "Unggah ikon melalui file."
            );
        }
    }

    return null;
}

/*
 * Menghapus file ikon tanpa membuat request gagal saat
 * storage bermasalah.
 */
async function cleanupIconSafely(iconPath) {
    if (!iconPath) return;

    try {
        await removeHelpCenterIcon(iconPath);
    } catch (error) {
        console.error(
            "Gagal membersihkan ikon kategori:",
            error
        );
    }
}

export async function getCmsCategories(req, res) {
    try {
        const data = await db
            .select({
                ...categoryFields,
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
        const id = parsePositiveId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID kategori tidak valid",
            });
        }

        const [category] = await db
            .select(categoryFields)
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
    let uploadedIcon = null;

    try {
        const body = req.body ?? {};

        if (body.sortOrder !== undefined) {
            return res.status(400).json({
                success: false,
                message:
                    "Urutan ditentukan otomatis oleh sistem dan tidak boleh dikirim",
            });
        }

        const iconSourceError =
            rejectIconSourceFields(body);

        if (iconSourceError) {
            return res.status(400).json({
                success: false,
                message: iconSourceError,
            });
        }

        const {
            name,
            slug,
            description = "",
            icon = "",
        } = body;

        const cleanName = String(name ?? "").trim();
        const cleanSlug = createSlug(
            slug || cleanName
        );

        const isActive = parseBooleanField(
            body.isActive === undefined
                ? true
                : body.isActive
        );

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

        if (isActive === null) {
            return res.status(400).json({
                success: false,
                message: "isActive harus berupa boolean",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Ikon kategori wajib diunggah.",
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

        uploadedIcon = await uploadHelpCenterIcon(
            req.file,
            ICON_FOLDER
        );

        const [orderRow] = await db
            .select({
                maxOrder: max(categories.sortOrder),
            })
            .from(categories);

        const nextSortOrder =
            (Number(orderRow?.maxOrder) || 0) + 1;

        const [createdCategory] = await db
            .insert(categories)
            .values({
                name: cleanName,
                slug: cleanSlug,
                description:
                    String(description ?? "").trim() ||
                    null,
                icon:
                    String(icon ?? "").trim() || null,
                iconUrl: uploadedIcon.fileUrl,
                iconPath: uploadedIcon.filePath,
                sortOrder: nextSortOrder,
                isActive,
            })
            .returning(categoryFields);

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

        /*
         * Database gagal setelah ikon terunggah:
         * hapus ikon baru agar tidak menjadi file yatim.
         */
        if (uploadedIcon?.filePath) {
            await cleanupIconSafely(
                uploadedIcon.filePath
            );
        }

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
    let uploadedIcon = null;
    let databaseUpdated = false;

    try {
        const id = parsePositiveId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID kategori tidak valid",
            });
        }

        const [existingCategory] = await db
            .select(categoryFields)
            .from(categories)
            .where(eq(categories.id, id))
            .limit(1);

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: "Kategori tidak ditemukan",
            });
        }

        const body = req.body ?? {};

        const iconSourceError =
            rejectIconSourceFields(body);

        if (iconSourceError) {
            return res.status(400).json({
                success: false,
                message: iconSourceError,
            });
        }

        const updates = {};

        if (body.name !== undefined) {
            const name = String(
                body.name ?? ""
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

        if (body.slug !== undefined) {
            const slug = createSlug(body.slug);

            if (!slug) {
                return res.status(400).json({
                    success: false,
                    message: "Slug kategori tidak valid",
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

        if (body.description !== undefined) {
            updates.description =
                String(
                    body.description ?? ""
                ).trim() || null;
        }

        if (body.icon !== undefined) {
            updates.icon =
                String(
                    body.icon ?? ""
                ).trim() || null;
        }

        if (body.isActive !== undefined) {
            const isActive =
                parseBooleanField(body.isActive);

            if (isActive === null) {
                return res.status(400).json({
                    success: false,
                    message:
                        "isActive harus berupa boolean",
                });
            }

            updates.isActive = isActive;
        }

        /*
         * Ikon lama tetap dipakai bila tidak ada file baru.
         */
        if (req.file) {
            uploadedIcon =
                await uploadHelpCenterIcon(
                    req.file,
                    ICON_FOLDER
                );

            updates.iconUrl = uploadedIcon.fileUrl;
            updates.iconPath = uploadedIcon.filePath;
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
            .returning(categoryFields);

        databaseUpdated = true;

        /*
         * Ikon lama baru dihapus setelah database berhasil
         * diperbarui.
         */
        if (uploadedIcon) {
            await cleanupIconSafely(
                existingCategory.iconPath
            );
        }

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

        /*
         * Update database gagal: hapus ikon baru yang sudah
         * terunggah agar tidak menjadi file yatim.
         */
        if (
            uploadedIcon?.filePath &&
            !databaseUpdated
        ) {
            await cleanupIconSafely(
                uploadedIcon.filePath
            );
        }

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
        const id = parsePositiveId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID kategori tidak valid",
            });
        }

        const [category] = await db
            .select({
                id: categories.id,
                name: categories.name,
                iconPath: categories.iconPath,
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

        /*
         * Data database sudah terhapus, ikon dibersihkan
         * dari storage.
         */
        await cleanupIconSafely(category.iconPath);

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
