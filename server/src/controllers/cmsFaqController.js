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
    subcategories,
    faqTopics,
    faqs,
} from "../models/schema.js";

import sanitizeHtml from "sanitize-html";

import {
    normalizeVisibility,
    FAQ_VISIBILITIES,
} from "../utils/faqVisibility.js";

function parsePositiveId(value) {
    if (!/^\d+$/.test(String(value))) return null;

    const id = Number(value);
    return Number.isSafeInteger(id) && id >= 1 && id <= 2147483647
        ? id
        : null;
}

export async function getCmsFaqs(req, res) {
    try {
        const search = String(
            req.query.search ?? ""
        ).trim();

        const categorySlug = String(
            req.query.category ?? ""
        ).trim();

        const topicParam = req.query.topic;
        const topicId =
            topicParam === undefined || topicParam === ""
                ? null
                : parsePositiveId(topicParam);

        const status = String(
            req.query.status ?? ""
        ).trim();

        const visibilityFilter = String(
            req.query.visibility ?? ""
        ).trim().toLowerCase();

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

        if (
            visibilityFilter &&
            !FAQ_VISIBILITIES.includes(visibilityFilter)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Visibility harus bernilai public atau authenticated",
            });
        }

        if (
            topicParam !== undefined &&
            topicParam !== "" &&
            topicId === null
        ) {
            return res.status(400).json({
                success: false,
                message: "Parameter topic harus berupa ID positif",
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

        if (topicId !== null) {
            conditions.push(eq(faqs.topicId, topicId));
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

        if (visibilityFilter) {
            conditions.push(
                eq(faqs.visibility, visibilityFilter)
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
                visibility: faqs.visibility,
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
                asc(faqs.sortOrder),
                asc(faqs.id)
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

function cleanAnswer(html = "") {
    return sanitizeHtml(html, {
        allowedTags: [
            "p",
            "br",
            "strong",
            "b",
            "em",
            "i",
            "ul",
            "ol",
            "li",
            "a",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
        ],

        allowedAttributes: {
            a: [
                "href",
                "target",
                "rel",
            ],

            th: [
                "colspan",
                "rowspan",
            ],

            td: [
                "colspan",
                "rowspan",
            ],
        },

        allowedSchemes: [
            "http",
            "https",
            "mailto",
        ],
    });
}

export async function createCmsFaq(req, res) {
    try {
        const {
            topicId,
            question,
            answer,
            isPopular = false,
            isPublished = false,
            visibility = "public",
        } = req.body;

        if (req.body.sortOrder !== undefined) {
            return res.status(400).json({
                success: false,
                message:
                    "Urutan ditentukan otomatis oleh sistem dan tidak boleh dikirim",
            });
        }

        const parsedTopicId = Number(topicId);

        if (
            !Number.isInteger(parsedTopicId) ||
            parsedTopicId < 1
        ) {
            return res.status(400).json({
                success: false,
                message: "Topik FAQ wajib dipilih",
            });
        }

        const cleanQuestion = String(
            question ?? ""
        ).trim();

        if (cleanQuestion.length < 5) {
            return res.status(400).json({
                success: false,
                message:
                    "Pertanyaan minimal terdiri dari 5 karakter",
            });
        }

        const sanitizedAnswer = cleanAnswer(
            String(answer ?? "")
        ).trim();

        if (!sanitizedAnswer) {
            return res.status(400).json({
                success: false,
                message: "Jawaban FAQ wajib diisi",
            });
        }

        if (typeof isPopular !== "boolean") {
            return res.status(400).json({
                success: false,
                message:
                    "isPopular harus berupa boolean",
            });
        }

        if (typeof isPublished !== "boolean") {
            return res.status(400).json({
                success: false,
                message:
                    "isPublished harus berupa boolean",
            });
        }

        if (!FAQ_VISIBILITIES.includes(String(visibility ?? "").trim().toLowerCase())) {
            return res.status(400).json({
                success: false,
                message:
                    "visibility harus bernilai public atau authenticated",
            });
        }

        const normalizedVisibility = normalizeVisibility(visibility);

        const [topic] = await db
            .select({
                id: faqTopics.id,
                name: faqTopics.name,
            })
            .from(faqTopics)
            .where(
                eq(
                    faqTopics.id,
                    parsedTopicId
                )
            )
            .limit(1);

        if (!topic) {
            return res.status(404).json({
                success: false,
                message: "Topik FAQ tidak ditemukan",
            });
        }

        const [orderRow] = await db
            .select({ maxOrder: max(faqs.sortOrder) })
            .from(faqs)
            .where(eq(faqs.topicId, parsedTopicId));

        const nextSortOrder =
            (Number(orderRow?.maxOrder) || 0) + 1;

        const [createdFaq] = await db
            .insert(faqs)
            .values({
                sourceId: null,
                topicId: parsedTopicId,
                question: cleanQuestion,
                answer: sanitizedAnswer,
                isPopular,
                isPublished,
                visibility: normalizedVisibility,
                sortOrder: nextSortOrder,
            })
            .returning({
                id: faqs.id,
                topicId: faqs.topicId,
                question: faqs.question,
                answer: faqs.answer,
                isPopular: faqs.isPopular,
                isPublished: faqs.isPublished,
                visibility: faqs.visibility,
                sortOrder: faqs.sortOrder,
                createdAt: faqs.createdAt,
                updatedAt: faqs.updatedAt,
            });

        return res.status(201).json({
            success: true,
            message: "FAQ berhasil ditambahkan",
            data: {
                ...createdFaq,
                topic,
            },
        });
    } catch (error) {
        console.error(
            "Gagal menambahkan FAQ CMS:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Terjadi kesalahan saat menambahkan FAQ",
        });
    }
}

export async function getCmsFaqById(req, res) {
    try {
        const id = parsePositiveId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID FAQ tidak valid",
            });
        }

        const [faq] = await db
            .select({
                id: faqs.id,
                question: faqs.question,
                answer: faqs.answer,
                isPopular: faqs.isPopular,
                isPublished: faqs.isPublished,
                visibility: faqs.visibility,
                sortOrder: faqs.sortOrder,

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
                eq(faqTopics.subcategoryId, subcategories.id)
            )
            .innerJoin(
                categories,
                eq(subcategories.categoryId, categories.id)
            )
            .where(eq(faqs.id, id))
            .limit(1);

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: "FAQ tidak ditemukan",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Detail FAQ berhasil diambil",
            data: faq,
        });
    } catch (error) {
        console.error("Gagal mengambil detail FAQ CMS:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat mengambil detail FAQ",
        });
    }
}

export async function updateCmsFaq(req, res) {
    try {
        const id = parsePositiveId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID FAQ tidak valid",
            });
        }

        const [existingFaq] = await db
            .select({ id: faqs.id })
            .from(faqs)
            .where(eq(faqs.id, id))
            .limit(1);

        if (!existingFaq) {
            return res.status(404).json({
                success: false,
                message: "FAQ tidak ditemukan",
            });
        }

        const body = req.body;

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return res.status(400).json({
                success: false,
                message: "Body harus berupa objek JSON",
            });
        }

        const updates = {};

        if (body.topicId !== undefined) {
            const topicId = Number(body.topicId);

            if (
                !["string", "number"].includes(typeof body.topicId) ||
                !Number.isInteger(topicId) ||
                topicId < 1
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Topik FAQ tidak valid",
                });
            }

            const [topic] = await db
                .select({ id: faqTopics.id })
                .from(faqTopics)
                .where(eq(faqTopics.id, topicId))
                .limit(1);

            if (!topic) {
                return res.status(404).json({
                    success: false,
                    message: "Topik FAQ tidak ditemukan",
                });
            }

            updates.topicId = topicId;
        }

        if (body.question !== undefined) {
            if (
                typeof body.question !== "string" ||
                body.question.trim().length < 5
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Pertanyaan minimal 5 karakter",
                });
            }

            updates.question = body.question.trim();
        }

        if (body.answer !== undefined) {
            if (typeof body.answer !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Jawaban harus berupa teks",
                });
            }

            const sanitizedAnswer = cleanAnswer(body.answer).trim();

            // Memastikan HTML seperti <p><br></p> tidak dianggap jawaban.
            const answerText = sanitizeHtml(sanitizedAnswer, {
                allowedTags: [],
                allowedAttributes: {},
            })
                .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
                .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, " ")
                .trim();

            if (!answerText) {
                return res.status(400).json({
                    success: false,
                    message: "Jawaban FAQ wajib diisi",
                });
            }

            updates.answer = sanitizedAnswer;
        }

        for (const field of ["isPopular", "isPublished"]) {
            if (body[field] !== undefined) {
                if (typeof body[field] !== "boolean") {
                    return res.status(400).json({
                        success: false,
                        message: `${field} harus berupa boolean`,
                    });
                }

                updates[field] = body[field];
            }
        }

        if (body.visibility !== undefined) {
            if (
                typeof body.visibility !== "string" ||
                !FAQ_VISIBILITIES.includes(body.visibility.trim().toLowerCase())
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "visibility harus bernilai public atau authenticated",
                });
            }

            updates.visibility = normalizeVisibility(body.visibility);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Tidak ada field FAQ yang dikirim untuk diperbarui",
            });
        }

        updates.updatedAt = new Date();

        const [updatedFaq] = await db
            .update(faqs)
            .set(updates)
            .where(eq(faqs.id, id))
            .returning({
                id: faqs.id,
                topicId: faqs.topicId,
                question: faqs.question,
                answer: faqs.answer,
                isPopular: faqs.isPopular,
                isPublished: faqs.isPublished,
                visibility: faqs.visibility,
                sortOrder: faqs.sortOrder,
                updatedAt: faqs.updatedAt,
            });

        if (!updatedFaq) {
            return res.status(404).json({
                success: false,
                message: "FAQ tidak ditemukan",
            });
        }

        return res.status(200).json({
            success: true,
            message: "FAQ berhasil diperbarui",
            data: updatedFaq,
        });
    } catch (error) {
        console.error("Gagal memperbarui FAQ CMS:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat memperbarui FAQ",
        });
    }
}

export async function deleteCmsFaq(req, res) {
    try {
        const id = parsePositiveId(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID FAQ tidak valid",
            });
        }

        const [deletedFaq] = await db
            .delete(faqs)
            .where(eq(faqs.id, id))
            .returning({
                id: faqs.id,
            });

        if (!deletedFaq) {
            return res.status(404).json({
                success: false,
                message: "FAQ tidak ditemukan",
            });
        }

        return res.status(200).json({
            success: true,
            message: "FAQ berhasil dihapus",
            data: deletedFaq,
        });
    } catch (error) {
        console.error("Gagal menghapus FAQ CMS:", error);

        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan saat menghapus FAQ",
        });
    }
}
