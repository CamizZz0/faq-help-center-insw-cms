import { and, asc, count, eq, ilike, max, or } from "drizzle-orm";
import { db } from "../config/db.js";
import { categories, faqs, faqTopics, subcategories } from "../models/schema.js";

const MAX_INTEGER = 2147483647;

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

function databaseCode(error) {
    return error?.cause?.code ?? error?.code;
}

function parsePositiveId(value) {
    if (
        !["string", "number"].includes(typeof value) ||
        !/^\d+$/.test(String(value))
    ) {
        return null;
    }

    const id = Number(value);
    return Number.isSafeInteger(id) && id >= 1 && id <= MAX_INTEGER
        ? id
        : null;
}

function mapTopic(row) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        subcategory: {
            id: row.subcategoryId,
            name: row.subcategoryName,
            slug: row.subcategorySlug,
        },
        category: {
            id: row.categoryId,
            name: row.categoryName,
            slug: row.categorySlug,
        },
        faqCount: Number(row.faqCount) || 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

const topicColumns = {
    id: faqTopics.id,
    name: faqTopics.name,
    slug: faqTopics.slug,
    description: faqTopics.description,
    sortOrder: faqTopics.sortOrder,
    isActive: faqTopics.isActive,
    createdAt: faqTopics.createdAt,
    updatedAt: faqTopics.updatedAt,
    subcategoryId: subcategories.id,
    subcategoryName: subcategories.name,
    subcategorySlug: subcategories.slug,
    categoryId: categories.id,
    categoryName: categories.name,
    categorySlug: categories.slug,
    faqCount: count(faqs.id),
};

function topicQuery(filter) {
    const query = db
        .select(topicColumns)
        .from(faqTopics)
        .innerJoin(
            subcategories,
            eq(faqTopics.subcategoryId, subcategories.id),
        )
        .innerJoin(
            categories,
            eq(subcategories.categoryId, categories.id),
        )
        .leftJoin(faqs, eq(faqs.topicId, faqTopics.id));

    return (filter ? query.where(filter) : query).groupBy(
        faqTopics.id,
        faqTopics.name,
        faqTopics.slug,
        faqTopics.description,
        faqTopics.sortOrder,
        faqTopics.isActive,
        faqTopics.createdAt,
        faqTopics.updatedAt,
        subcategories.id,
        subcategories.name,
        subcategories.slug,
        subcategories.sortOrder,
        categories.id,
        categories.name,
        categories.slug,
        categories.sortOrder,
    );
}

async function getTopicRecord(id) {
    const [row] = await topicQuery(eq(faqTopics.id, id)).limit(1);
    return row ? mapTopic(row) : null;
}

async function findSubcategory(id) {
    const [row] = await db
        .select({
            id: subcategories.id,
            categoryId: categories.id,
        })
        .from(subcategories)
        .innerJoin(categories, eq(subcategories.categoryId, categories.id))
        .where(eq(subcategories.id, id))
        .limit(1);

    return row ?? null;
}

function validationResponse(res, message) {
    return res.status(400).json({ success: false, message });
}

function handleWriteError(res, error, action) {
    const code = databaseCode(error);

    if (code === "23505") {
        return res.status(409).json({
            success: false,
            message: "Slug topik sudah digunakan. Gunakan nama lain.",
        });
    }

    if (code === "23503") {
        return validationResponse(res, "Subkategori tidak ditemukan");
    }

    console.error(`Gagal ${action} topik:`, error);
    return res.status(500).json({
        success: false,
        message: `Terjadi kesalahan saat ${action} topik`,
    });
}

export async function getCmsTopics(req, res) {
    try {
        const search = String(req.query.search ?? "").trim();
        const categorySlug = String(req.query.category ?? "").trim();
        const subcategorySlug = String(req.query.subcategory ?? "").trim();
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
            return validationResponse(res, "Parameter pagination tidak valid");
        }

        if (status && !["active", "inactive"].includes(status)) {
            return validationResponse(
                res,
                "Status harus bernilai active atau inactive",
            );
        }

        const conditions = [];
        if (search) {
            conditions.push(
                or(
                    ilike(faqTopics.name, `%${search}%`),
                    ilike(faqTopics.description, `%${search}%`),
                ),
            );
        }
        if (categorySlug) conditions.push(eq(categories.slug, categorySlug));
        if (subcategorySlug) {
            conditions.push(eq(subcategories.slug, subcategorySlug));
        }
        if (status) {
            conditions.push(eq(faqTopics.isActive, status === "active"));
        }

        const filter = conditions.length ? and(...conditions) : undefined;
        const totalQuery = db
            .select({ total: count() })
            .from(faqTopics)
            .innerJoin(
                subcategories,
                eq(faqTopics.subcategoryId, subcategories.id),
            )
            .innerJoin(
                categories,
                eq(subcategories.categoryId, categories.id),
            );

        const [rows, totals] = await Promise.all([
            topicQuery(filter)
                .orderBy(
                    asc(categories.sortOrder),
                    asc(subcategories.sortOrder),
                    asc(faqTopics.sortOrder),
                    asc(faqTopics.id),
                )
                .limit(limit)
                .offset((page - 1) * limit),
            filter ? totalQuery.where(filter) : totalQuery,
        ]);

        const totalItems = Number(totals[0]?.total) || 0;
        const totalPages = Math.ceil(totalItems / limit);

        return res.json({
            success: true,
            message: "Data topik CMS berhasil diambil",
            data: rows.map(mapTopic),
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
        console.error("Gagal mengambil topik CMS:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil topik",
        });
    }
}

export async function getCmsTopicById(req, res) {
    try {
        const id = parsePositiveId(req.params.id);
        if (!id) return validationResponse(res, "ID topik tidak valid");

        const topic = await getTopicRecord(id);
        if (!topic) {
            return res.status(404).json({
                success: false,
                message: "Topik tidak ditemukan",
            });
        }

        return res.json({
            success: true,
            message: "Detail topik berhasil diambil",
            data: topic,
        });
    } catch (error) {
        console.error("Gagal mengambil detail topik:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil detail topik",
        });
    }
}

export async function getCmsTopicFaqs(req, res) {
    try {
        const id = parsePositiveId(req.params.id);
        if (!id) return validationResponse(res, "ID topik tidak valid");

        const topic = await getTopicRecord(id);
        if (!topic) {
            return res.status(404).json({
                success: false,
                message: "Topik tidak ditemukan",
            });
        }

        const faqList = await db
            .select({
                id: faqs.id,
                question: faqs.question,
                isPublished: faqs.isPublished,
                visibility: faqs.visibility,
                sortOrder: faqs.sortOrder,
            })
            .from(faqs)
            .where(eq(faqs.topicId, id))
            .orderBy(asc(faqs.sortOrder), asc(faqs.id));

        return res.json({
            success: true,
            message: "Daftar FAQ topik berhasil diambil",
            data: {
                topic,
                faqs: faqList,
            },
        });
    } catch (error) {
        console.error("Gagal mengambil FAQ topik:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil FAQ topik",
        });
    }
}

export async function createCmsTopic(req, res) {
    try {
        const body = req.body ?? {};
        if (body.sourceId !== undefined) {
            return validationResponse(res, "sourceId tidak dapat diatur melalui CMS");
        }
        if (body.slug !== undefined) {
            return validationResponse(res, "Slug topik dibuat otomatis dari nama");
        }
        if (body.sortOrder !== undefined) {
            return validationResponse(
                res,
                "Urutan ditentukan otomatis oleh sistem dan tidak boleh dikirim",
            );
        }

        const subcategoryId = parsePositiveId(body.subcategoryId);
        if (!subcategoryId) {
            return validationResponse(
                res,
                "subcategoryId wajib berupa ID positif",
            );
        }

        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (name.length < 2 || name.length > 150) {
            return validationResponse(
                res,
                "Nama topik harus terdiri dari 2–150 karakter",
            );
        }

        const slug = createSlug(name);
        if (!slug) {
            return validationResponse(
                res,
                "Nama topik tidak menghasilkan slug yang valid",
            );
        }

        if (
            body.description != null &&
            typeof body.description !== "string"
        ) {
            return validationResponse(res, "Deskripsi harus berupa teks");
        }

        const isActive = body.isActive === undefined ? true : body.isActive;
        if (typeof isActive !== "boolean") {
            return validationResponse(res, "isActive harus berupa boolean");
        }

        if (!(await findSubcategory(subcategoryId))) {
            return validationResponse(res, "Subkategori tidak ditemukan");
        }

        const [slugOwner] = await db
            .select({ id: faqTopics.id })
            .from(faqTopics)
            .where(eq(faqTopics.slug, slug))
            .limit(1);
        if (slugOwner) {
            return res.status(409).json({
                success: false,
                message: "Slug topik sudah digunakan. Gunakan nama lain.",
            });
        }

        const [orderRow] = await db
            .select({ maxOrder: max(faqTopics.sortOrder) })
            .from(faqTopics)
            .where(eq(faqTopics.subcategoryId, subcategoryId));

        const nextSortOrder = (Number(orderRow?.maxOrder) || 0) + 1;

        const [created] = await db
            .insert(faqTopics)
            .values({
                subcategoryId,
                name,
                slug,
                description: body.description?.trim() || null,
                sortOrder: nextSortOrder,
                isActive,
            })
            .returning({ id: faqTopics.id });

        return res.status(201).json({
            success: true,
            message: "Topik berhasil ditambahkan",
            data: await getTopicRecord(created.id),
        });
    } catch (error) {
        return handleWriteError(res, error, "menambahkan");
    }
}

export async function updateCmsTopic(req, res) {
    try {
        const id = parsePositiveId(req.params.id);
        if (!id) return validationResponse(res, "ID topik tidak valid");

        const [existing] = await db
            .select()
            .from(faqTopics)
            .where(eq(faqTopics.id, id))
            .limit(1);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Topik tidak ditemukan",
            });
        }

        const body = req.body ?? {};
        if (body.sourceId !== undefined) {
            return validationResponse(res, "sourceId tidak dapat diubah melalui CMS");
        }
        if (body.slug !== undefined && String(body.slug).trim() !== existing.slug) {
            return validationResponse(
                res,
                "Slug topik tidak dapat diubah setelah dibuat",
            );
        }

        const updates = {};
        if (body.subcategoryId !== undefined) {
            const subcategoryId = parsePositiveId(body.subcategoryId);
            if (!subcategoryId) {
                return validationResponse(
                    res,
                    "subcategoryId wajib berupa ID positif",
                );
            }
            if (!(await findSubcategory(subcategoryId))) {
                return validationResponse(res, "Subkategori tidak ditemukan");
            }
            updates.subcategoryId = subcategoryId;
        }

        if (body.name !== undefined) {
            const name =
                typeof body.name === "string" ? body.name.trim() : "";
            if (name.length < 2 || name.length > 150) {
                return validationResponse(
                    res,
                    "Nama topik harus terdiri dari 2–150 karakter",
                );
            }
            updates.name = name;
        }

        if (body.description !== undefined) {
            if (
                body.description != null &&
                typeof body.description !== "string"
            ) {
                return validationResponse(res, "Deskripsi harus berupa teks");
            }
            updates.description = body.description?.trim() || null;
        }

        if (body.isActive !== undefined) {
            if (typeof body.isActive !== "boolean") {
                return validationResponse(res, "isActive harus berupa boolean");
            }
            updates.isActive = body.isActive;
        }

        if (Object.keys(updates).length === 0) {
            return validationResponse(
                res,
                "Tidak ada data topik yang diperbarui",
            );
        }

        const [updated] = await db
            .update(faqTopics)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(faqTopics.id, id))
            .returning({ id: faqTopics.id });

        return res.json({
            success: true,
            message: "Topik berhasil diperbarui",
            data: await getTopicRecord(updated.id),
        });
    } catch (error) {
        return handleWriteError(res, error, "memperbarui");
    }
}

export async function deleteCmsTopic(req, res) {
    try {
        const id = parsePositiveId(req.params.id);
        if (!id) return validationResponse(res, "ID topik tidak valid");

        const [topic] = await db
            .select({ id: faqTopics.id, name: faqTopics.name })
            .from(faqTopics)
            .where(eq(faqTopics.id, id))
            .limit(1);
        if (!topic) {
            return res.status(404).json({
                success: false,
                message: "Topik tidak ditemukan",
            });
        }

        const [total] = await db
            .select({ faqCount: count(faqs.id) })
            .from(faqs)
            .where(eq(faqs.topicId, id));
        const faqCount = Number(total?.faqCount) || 0;

        if (faqCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Topik tidak dapat dihapus karena masih memiliki FAQ.",
                data: { faqCount },
            });
        }

        const [deleted] = await db
            .delete(faqTopics)
            .where(eq(faqTopics.id, id))
            .returning({ id: faqTopics.id, name: faqTopics.name });

        return res.json({
            success: true,
            message: "Topik berhasil dihapus",
            data: deleted,
        });
    } catch (error) {
        console.error("Gagal menghapus topik:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat menghapus topik",
        });
    }
}
