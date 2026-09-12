import {
    and,
    asc,
    count,
    eq,
    ilike,
    max,
    or,
} from "drizzle-orm";

import { db } from "../config/db.js";

import {
    categories,
    faqTopics,
    subcategories,
} from "../models/schema.js";

import {
    removeHelpCenterIcon,
    uploadHelpCenterIcon,
} from "../services/iconStorageService.js";

const ICON_FOLDER = "subcategories";

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

async function cleanupIconSafely(iconPath) {
    if (!iconPath) return;

    try {
        await removeHelpCenterIcon(iconPath);
    } catch (error) {
        console.error(
            "Gagal membersihkan ikon subkategori:",
            error
        );
    }
}

function parsePositiveId(value) {
    if (
        !["string", "number"].includes(typeof value) ||
        !/^\d+$/.test(String(value))
    ) {
        return null;
    }

    const id = Number(value);

    if (
        !Number.isSafeInteger(id) ||
        id < 1 ||
        id > 2147483647
    ) {
        return null;
    }

    return id;
}

function mapSubcategoryRow(row) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        icon: row.icon,
        iconUrl: row.iconUrl,
        iconPath: row.iconPath,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        category: {
            id: row.categoryId,
            name: row.categoryName,
            slug: row.categorySlug,
        },
        topicCount: Number(row.topicCount) || 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

const listColumns = {
    id: subcategories.id,
    name: subcategories.name,
    slug: subcategories.slug,
    description: subcategories.description,
    icon: subcategories.icon,
    iconUrl: subcategories.iconUrl,
    iconPath: subcategories.iconPath,
    sortOrder: subcategories.sortOrder,
    isActive: subcategories.isActive,
    createdAt: subcategories.createdAt,
    updatedAt: subcategories.updatedAt,
    categoryId: categories.id,
    categoryName: categories.name,
    categorySlug: categories.slug,
    topicCount: count(faqTopics.id),
};

function subcategoryQuery(filter) {
    const query = db
        .select(listColumns)
        .from(subcategories)
        .innerJoin(
            categories,
            eq(subcategories.categoryId, categories.id)
        )
        .leftJoin(
            faqTopics,
            eq(faqTopics.subcategoryId, subcategories.id)
        );

    return (filter ? query.where(filter) : query).groupBy(
        subcategories.id,
        subcategories.name,
        subcategories.slug,
        subcategories.description,
        subcategories.icon,
        subcategories.iconUrl,
        subcategories.iconPath,
        subcategories.sortOrder,
        subcategories.isActive,
        subcategories.createdAt,
        subcategories.updatedAt,
        categories.id,
        categories.name,
        categories.slug,
        categories.sortOrder
    );
}

async function getSubcategoryRecord(id) {
    const [row] = await subcategoryQuery(eq(subcategories.id, id)).limit(1);

    return row ? mapSubcategoryRow(row) : null;
}

async function findCategoryById(categoryId) {
    const [category] = await db
        .select({
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
        })
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);

    return category ?? null;
}

export async function getCmsSubcategories(req, res) {
    try {
        const search = String(req.query.search ?? "").trim();
        const categorySlug = String(req.query.category ?? "").trim();
        const status = String(req.query.status ?? "").trim();
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);

        if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 50 ||
            !Number.isSafeInteger((page - 1) * limit)
        ) {
            return res.status(400).json({
                success: false,
                message: "Parameter pagination tidak valid",
            });
        }

        if (status && status !== "active" && status !== "inactive") {
            return res.status(400).json({
                success: false,
                message: "Status harus bernilai active atau inactive",
            });
        }

        const conditions = [];

        if (search) {
            conditions.push(
                or(
                    ilike(subcategories.name, `%${search}%`),
                    ilike(subcategories.description, `%${search}%`)
                )
            );
        }

        if (categorySlug) {
            conditions.push(eq(categories.slug, categorySlug));
        }

        if (status === "active") {
            conditions.push(eq(subcategories.isActive, true));
        }

        if (status === "inactive") {
            conditions.push(eq(subcategories.isActive, false));
        }

        const filter =
            conditions.length > 0 ? and(...conditions) : undefined;

        const offset = (page - 1) * limit;

        const countQuery = db
            .select({
                totalItems: count(),
            })
            .from(subcategories)
            .innerJoin(
                categories,
                eq(subcategories.categoryId, categories.id)
            );

        const [{ totalItems }] = filter
            ? await countQuery.where(filter)
            : await countQuery;

        const rows = await subcategoryQuery(filter)
            .orderBy(
                asc(categories.sortOrder),
                asc(subcategories.sortOrder),
                asc(subcategories.id)
            )
            .limit(limit)
            .offset(offset);

        const parsedTotalItems = Number(totalItems) || 0;
        const totalPages = Math.ceil(parsedTotalItems / limit);

        return res.status(200).json({
            success: true,
            message: "Data subkategori CMS berhasil diambil",
            data: rows.map(mapSubcategoryRow),
            meta: {
                page,
                limit,
                totalItems: parsedTotalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        });
    } catch (error) {
        console.error("Gagal mengambil subkategori CMS:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil subkategori",
        });
    }
}

export async function getCmsSubcategoryById(req, res) {
    try {
        const id = parsePositiveId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID subkategori tidak valid",
            });
        }

        const subcategory = await getSubcategoryRecord(id);

        if (!subcategory) {
            return res.status(404).json({
                success: false,
                message: "Subkategori tidak ditemukan",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Detail subkategori berhasil diambil",
            data: subcategory,
        });
    } catch (error) {
        console.error("Gagal mengambil detail subkategori:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil detail subkategori",
        });
    }
}

export async function createCmsSubcategory(req, res) {
    let uploadedIcon = null;

    try {
        const body = req.body ?? {};

        if (body.sourceId !== undefined) {
            return res.status(400).json({
                success: false,
                message: "sourceId tidak dapat diatur melalui CMS",
            });
        }

        if (body.sortOrder !== undefined) {
            return res.status(400).json({
                success: false,
                message:
                    "Urutan ditentukan otomatis oleh sistem dan tidak boleh dikirim",
            });
        }

        const iconSourceError = rejectIconSourceFields(body);

        if (iconSourceError) {
            return res.status(400).json({
                success: false,
                message: iconSourceError,
            });
        }

        const categoryId = parsePositiveId(body.categoryId);
        const cleanName =
            typeof body.name === "string" ? body.name.trim() : "";
        const cleanSlug = createSlug(cleanName);
        const isActive = parseBooleanField(
            body.isActive === undefined ? true : body.isActive
        );

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: "categoryId wajib berupa ID positif",
            });
        }

        if (cleanName.length < 2 || cleanName.length > 150) {
            return res.status(400).json({
                success: false,
                message: "Nama subkategori harus terdiri dari 2–150 karakter",
            });
        }

        if (!cleanSlug) {
            return res.status(400).json({
                success: false,
                message: "Nama subkategori tidak menghasilkan slug yang valid",
            });
        }

        if (isActive === null) {
            return res.status(400).json({
                success: false,
                message: "isActive harus berupa boolean",
            });
        }

        if (
            body.description != null &&
            typeof body.description !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Deskripsi harus berupa teks",
            });
        }

        if (
            body.icon != null &&
            (typeof body.icon !== "string" || body.icon.trim().length > 100)
        ) {
            return res.status(400).json({
                success: false,
                message: "Ikon harus berupa teks maksimal 100 karakter",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Ikon subkategori wajib diunggah.",
            });
        }

        const parentCategory = await findCategoryById(categoryId);

        if (!parentCategory) {
            return res.status(400).json({
                success: false,
                message: "Kategori tidak ditemukan",
            });
        }

        const [existingSlug] = await db
            .select({ id: subcategories.id })
            .from(subcategories)
            .where(eq(subcategories.slug, cleanSlug))
            .limit(1);

        if (existingSlug) {
            return res.status(409).json({
                success: false,
                message:
                    "Slug subkategori sudah digunakan. Gunakan nama lain.",
            });
        }

        uploadedIcon = await uploadHelpCenterIcon(
            req.file,
            ICON_FOLDER
        );

        const [orderRow] = await db
            .select({ maxOrder: max(subcategories.sortOrder) })
            .from(subcategories)
            .where(eq(subcategories.categoryId, categoryId));

        const nextSortOrder = (Number(orderRow?.maxOrder) || 0) + 1;

        const [created] = await db
            .insert(subcategories)
            .values({
                categoryId,
                name: cleanName,
                slug: cleanSlug,
                description:
                    String(body.description ?? "").trim() || null,
                icon: String(body.icon ?? "").trim() || null,
                iconUrl: uploadedIcon.fileUrl,
                iconPath: uploadedIcon.filePath,
                sortOrder: nextSortOrder,
                isActive,
            })
            .returning({ id: subcategories.id });

        return res.status(201).json({
            success: true,
            message: "Subkategori berhasil ditambahkan",
            data: await getSubcategoryRecord(created.id),
        });
    } catch (error) {
        console.error("Gagal menambahkan subkategori:", error);

        /*
         * Database gagal setelah ikon terunggah: hapus ikon
         * baru agar tidak menjadi file yatim.
         */
        if (uploadedIcon?.filePath) {
            await cleanupIconSafely(uploadedIcon.filePath);
        }

        if (getDatabaseErrorCode(error) === "23505") {
            return res.status(409).json({
                success: false,
                message:
                    "Slug subkategori sudah digunakan. Gunakan nama lain.",
            });
        }

        if (getDatabaseErrorCode(error) === "23503") {
            return res.status(400).json({
                success: false,
                message: "Kategori tidak ditemukan",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat menambahkan subkategori",
        });
    }
}

export async function updateCmsSubcategory(req, res) {
    let uploadedIcon = null;
    let databaseUpdated = false;

    try {
        const id = parsePositiveId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID subkategori tidak valid",
            });
        }

        const [existing] = await db
            .select()
            .from(subcategories)
            .where(eq(subcategories.id, id))
            .limit(1);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Subkategori tidak ditemukan",
            });
        }

        const body = req.body ?? {};

        if (body.sourceId !== undefined) {
            return res.status(400).json({
                success: false,
                message: "sourceId tidak dapat diubah melalui CMS",
            });
        }

        const iconSourceError = rejectIconSourceFields(body);

        if (iconSourceError) {
            return res.status(400).json({
                success: false,
                message: iconSourceError,
            });
        }

        if (
            body.slug !== undefined &&
            createSlug(body.slug) !== existing.slug &&
            String(body.slug).trim() !== existing.slug
        ) {
            return res.status(400).json({
                success: false,
                message: "Slug subkategori tidak dapat diubah setelah dibuat",
            });
        }

        const updates = {};

        if (body.categoryId !== undefined) {
            const categoryId = parsePositiveId(body.categoryId);

            if (!categoryId) {
                return res.status(400).json({
                    success: false,
                    message: "categoryId wajib berupa ID positif",
                });
            }

            const parentCategory = await findCategoryById(categoryId);

            if (!parentCategory) {
                return res.status(400).json({
                    success: false,
                    message: "Kategori tidak ditemukan",
                });
            }

            updates.categoryId = categoryId;
        }

        if (body.name !== undefined) {
            const name =
                typeof body.name === "string" ? body.name.trim() : "";

            if (name.length < 2 || name.length > 150) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Nama subkategori harus terdiri dari 2–150 karakter",
                });
            }

            updates.name = name;
        }

        if (body.description !== undefined) {
            if (
                body.description != null &&
                typeof body.description !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Deskripsi harus berupa teks",
                });
            }

            updates.description =
                String(body.description ?? "").trim() || null;
        }

        if (body.icon !== undefined) {
            if (
                body.icon != null &&
                (typeof body.icon !== "string" ||
                    body.icon.trim().length > 100)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Ikon harus berupa teks maksimal 100 karakter",
                });
            }

            updates.icon = String(body.icon ?? "").trim() || null;
        }

        if (body.isActive !== undefined) {
            const isActive = parseBooleanField(body.isActive);

            if (isActive === null) {
                return res.status(400).json({
                    success: false,
                    message: "isActive harus berupa boolean",
                });
            }

            updates.isActive = isActive;
        }

        /*
         * Ikon lama tetap dipakai bila tidak ada file baru.
         */
        if (req.file) {
            uploadedIcon = await uploadHelpCenterIcon(
                req.file,
                ICON_FOLDER
            );

            updates.iconUrl = uploadedIcon.fileUrl;
            updates.iconPath = uploadedIcon.filePath;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Tidak ada data subkategori yang diperbarui",
            });
        }

        updates.updatedAt = new Date();

        await db
            .update(subcategories)
            .set(updates)
            .where(eq(subcategories.id, id));

        databaseUpdated = true;

        /*
         * Ikon lama baru dihapus setelah database berhasil
         * diperbarui.
         */
        if (uploadedIcon) {
            await cleanupIconSafely(existing.iconPath);
        }

        return res.status(200).json({
            success: true,
            message: "Subkategori berhasil diperbarui",
            data: await getSubcategoryRecord(id),
        });
    } catch (error) {
        console.error("Gagal memperbarui subkategori:", error);

        /*
         * Update database gagal: hapus ikon baru yang sudah
         * terunggah agar tidak menjadi file yatim.
         */
        if (uploadedIcon?.filePath && !databaseUpdated) {
            await cleanupIconSafely(uploadedIcon.filePath);
        }

        if (getDatabaseErrorCode(error) === "23505") {
            return res.status(409).json({
                success: false,
                message:
                    "Slug subkategori sudah digunakan. Gunakan nama lain.",
            });
        }

        if (getDatabaseErrorCode(error) === "23503") {
            return res.status(400).json({
                success: false,
                message: "Kategori tidak ditemukan",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat memperbarui subkategori",
        });
    }
}

export async function deleteCmsSubcategory(req, res) {
    try {
        const id = parsePositiveId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID subkategori tidak valid",
            });
        }

        const [subcategory] = await db
            .select({
                id: subcategories.id,
                name: subcategories.name,
                iconPath: subcategories.iconPath,
            })
            .from(subcategories)
            .where(eq(subcategories.id, id))
            .limit(1);

        if (!subcategory) {
            return res.status(404).json({
                success: false,
                message: "Subkategori tidak ditemukan",
            });
        }

        const [{ topicCount }] = await db
            .select({
                topicCount: count(faqTopics.id),
            })
            .from(faqTopics)
            .where(eq(faqTopics.subcategoryId, id));

        const parsedTopicCount = Number(topicCount) || 0;

        if (parsedTopicCount > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "Subkategori tidak dapat dihapus karena masih memiliki topik.",
                data: {
                    topicCount: parsedTopicCount,
                },
            });
        }

        const [deleted] = await db
            .delete(subcategories)
            .where(eq(subcategories.id, id))
            .returning({
                id: subcategories.id,
                name: subcategories.name,
            });

        await cleanupIconSafely(subcategory.iconPath);

        return res.status(200).json({
            success: true,
            message: "Subkategori berhasil dihapus",
            data: deleted,
        });
    } catch (error) {
        console.error("Gagal menghapus subkategori:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat menghapus subkategori",
        });
    }
}
