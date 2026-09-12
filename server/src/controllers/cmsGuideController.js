import {
    and,
    asc,
    count,
    eq,
    ilike,
    max,
} from "drizzle-orm";

import { db } from "../config/db.js";

import { guides } from "../models/schema.js";

import {
    guideForResponse,
    removeGuideFile,
} from "../services/guideFiles.js";

import {
    uploadGuidePdf,
    deleteGuidePdf,
} from "../services/guideStorageService.js";

const fields = {
    id: guides.id,
    categoryId: guides.categoryId,
    title: guides.title,
    slug: guides.slug,
    description: guides.description,
    fileUrl: guides.fileUrl,
    filePath: guides.filePath,
    sortOrder: guides.sortOrder,
    isPublished: guides.isPublished,
    createdAt: guides.createdAt,
    updatedAt: guides.updatedAt,
};

function fail(message, status = 400) {
    throw Object.assign(
        new Error(message),
        { status },
    );
}

function handleError(res, error) {
    const code =
        error?.cause?.code ??
        error?.code;

    if (code === "23505") {
        return res.status(409).json({
            success: false,
            message:
                "Slug panduan sudah digunakan. Gunakan judul lain.",
        });
    }

    if (!error.status) {
        console.error(
            "Kesalahan panduan CMS:",
            error,
        );
    }

    return res
        .status(error.status ?? 500)
        .json({
            success: false,
            message: error.status
                ? error.message
                : "Terjadi kesalahan saat mengelola panduan.",
        });
}

function validId(value) {
    if (
        !["string", "number"].includes(
            typeof value,
        )
    ) {
        fail("ID tidak valid.");
    }

    if (
        !/^\d+$/.test(String(value)) ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) < 1 ||
        Number(value) > 2147483647
    ) {
        fail("ID tidak valid.");
    }

    return Number(value);
}

function createSlug(title) {
    return title
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

async function validate(
    body,
    existing,
    file,
) {
    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        fail("Data panduan tidak valid.");
    }

    const values = {};

    if (
        !existing ||
        body.title !== undefined
    ) {
        if (
            typeof body.title !== "string" ||
            body.title.trim().length < 3 ||
            body.title.trim().length > 200
        ) {
            fail(
                "Judul harus terdiri dari 3–200 karakter.",
            );
        }

        values.title = body.title.trim();
    }

    if (!existing) {
        values.slug =
            createSlug(values.title);

        if (!values.slug) {
            fail(
                "Judul harus menghasilkan slug yang valid.",
            );
        }

        if (
            body.slug !== undefined &&
            body.slug !== values.slug
        ) {
            fail(
                "Slug harus sesuai dengan judul saat menambah panduan.",
            );
        }
    } else if (
        body.slug !== undefined &&
        body.slug !== existing.slug
    ) {
        fail(
            "Slug panduan tidak dapat diubah setelah dibuat.",
        );
    }

    if (
        !existing ||
        body.description !== undefined
    ) {
        if (
            body.description != null &&
            typeof body.description !== "string"
        ) {
            fail(
                "Deskripsi harus berupa teks.",
            );
        }

        values.description =
            body.description?.trim() || null;
    }

    if (body.fileUrl !== undefined) {
        fail(
            "Unggah PDF melalui field file, bukan URL dokumen.",
        );
    }

    if (!existing && !file) {
        fail("File PDF wajib diunggah.");
    }

    if (!existing) {
        values.categoryId = null;
    }

    /*
     * Urutan ditentukan otomatis oleh sistem, sehingga
     * sortOrder tidak lagi dibaca dari body permintaan.
     */
    if (
        !existing &&
        body.sortOrder !== undefined
    ) {
        fail(
            "Urutan ditentukan otomatis oleh sistem dan tidak boleh dikirim.",
        );
    }

    if (
        !existing ||
        body.isPublished !== undefined
    ) {
        const isPublished =
            body.isPublished === undefined
                ? false
                : body.isPublished === "true"
                  ? true
                  : body.isPublished ===
                      "false"
                    ? false
                    : body.isPublished;

        if (
            typeof isPublished !==
            "boolean"
        ) {
            fail(
                "Status publikasi harus berupa boolean.",
            );
        }

        values.isPublished =
            isPublished;
    }

    if (
        existing &&
        !file &&
        Object.keys(values).length === 0
    ) {
        fail(
            "Tidak ada data panduan yang diperbarui.",
        );
    }

    return values;
}

/**
 * Menghapus file berdasarkan jenis penyimpanannya.
 *
 * Panduan baru menggunakan Supabase dan memiliki filePath.
 * Panduan lama masih mungkin menggunakan file lokal.
 */
async function removeStoredGuideFile(
    guide,
) {
    if (!guide) return;

    if (guide.filePath) {
        await deleteGuidePdf(
            guide.filePath,
        );

        return;
    }

    if (guide.fileUrl) {
        await removeGuideFile(
            guide.fileUrl,
        );
    }
}

/**
 * Penghapusan file dibuat aman agar error storage
 * tidak membuat server berhenti.
 */
async function cleanupFileSafely(guide) {
    try {
        await removeStoredGuideFile(
            guide,
        );
    } catch (error) {
        console.error(
            "Gagal membersihkan file panduan:",
            error,
        );
    }
}

export async function getCmsGuides(
    req,
    res,
) {
    try {
        const page = Number(
            req.query.page ?? 1,
        );

        const limit = Number(
            req.query.limit ?? 10,
        );

        if (
            !Number.isSafeInteger(page) ||
            page < 1 ||
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 50 ||
            !Number.isSafeInteger(
                (page - 1) * limit,
            )
        ) {
            fail(
                "Parameter pagination tidak valid.",
            );
        }

        const search = String(
            req.query.search ?? "",
        ).trim();

        const status = String(
            req.query.status ?? "",
        ).trim();

        if (
            status &&
            ![
                "published",
                "draft",
            ].includes(status)
        ) {
            fail(
                "Status harus bernilai published atau draft.",
            );
        }

        const conditions = [];

        if (search) {
            conditions.push(
                ilike(
                    guides.title,
                    `%${search}%`,
                ),
            );
        }

        if (status) {
            conditions.push(
                eq(
                    guides.isPublished,
                    status === "published",
                ),
            );
        }

        const filter =
            conditions.length > 0
                ? and(...conditions)
                : undefined;

        const [data, totals] =
            await Promise.all([
                db
                    .select(fields)
                    .from(guides)
                    .where(filter)
                    .orderBy(
                        asc(
                            guides.sortOrder,
                        ),
                        asc(guides.id),
                    )
                    .limit(limit)
                    .offset(
                        (page - 1) *
                            limit,
                    ),

                db
                    .select({
                        total: count(),
                    })
                    .from(guides)
                    .where(filter),
            ]);

        const totalItems = Number(
            totals[0].total,
        );

        const totalPages = Math.ceil(
            totalItems / limit,
        );

        return res.json({
            success: true,
            message:
                "Data panduan CMS berhasil diambil",

            data: data.map((guide) =>
                guideForResponse(
                    guide,
                    req,
                ),
            ),

            meta: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNextPage:
                    page < totalPages,
                hasPreviousPage:
                    page > 1,
            },
        });
    } catch (error) {
        return handleError(
            res,
            error,
        );
    }
}

export async function getCmsGuideById(
    req,
    res,
) {
    try {
        const id = validId(
            req.params.id,
        );

        const [data] = await db
            .select(fields)
            .from(guides)
            .where(
                eq(guides.id, id),
            )
            .limit(1);

        if (!data) {
            fail(
                "Panduan tidak ditemukan.",
                404,
            );
        }

        return res.json({
            success: true,
            message:
                "Detail panduan berhasil diambil",
            data: guideForResponse(
                data,
                req,
            ),
        });
    } catch (error) {
        return handleError(
            res,
            error,
        );
    }
}

export async function createCmsGuide(
    req,
    res,
) {
    let uploadedFile = null;

    try {
        const values = await validate(
            req.body,
            undefined,
            req.file,
        );

        const [orderRow] = await db
            .select({
                maxOrder: max(guides.sortOrder),
            })
            .from(guides);

        values.sortOrder =
            (Number(orderRow?.maxOrder) || 0) + 1;

        uploadedFile =
            await uploadGuidePdf(
                req.file,
            );

        values.fileUrl =
            uploadedFile.fileUrl;

        values.filePath =
            uploadedFile.filePath;

        const [data] = await db
            .insert(guides)
            .values(values)
            .returning(fields);

        return res.status(201).json({
            success: true,
            message:
                "Panduan berhasil ditambahkan",
            data: guideForResponse(
                data,
                req,
            ),
        });
    } catch (error) {
        /*
         * Jika PDF berhasil masuk Supabase tetapi
         * penyimpanan database gagal, PDF baru
         * dibersihkan kembali.
         */
        if (
            uploadedFile?.filePath
        ) {
            await cleanupFileSafely({
                filePath:
                    uploadedFile.filePath,
            });
        }

        return handleError(
            res,
            error,
        );
    }
}

export async function updateCmsGuide(
    req,
    res,
) {
    let uploadedFile = null;
    let databaseUpdated = false;

    try {
        const id = validId(
            req.params.id,
        );

        const [existing] = await db
            .select(fields)
            .from(guides)
            .where(
                eq(guides.id, id),
            )
            .limit(1);

        if (!existing) {
            fail(
                "Panduan tidak ditemukan.",
                404,
            );
        }

        const values = await validate(
            req.body,
            existing,
            req.file,
        );

        if (req.file) {
            uploadedFile =
                await uploadGuidePdf(
                    req.file,
                );

            values.fileUrl =
                uploadedFile.fileUrl;

            values.filePath =
                uploadedFile.filePath;
        }

        const [data] = await db
            .update(guides)
            .set({
                ...values,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(guides.id, id),
                    eq(
                        guides.fileUrl,
                        existing.fileUrl,
                    ),
                ),
            )
            .returning(fields);

        if (!data) {
            fail(
                "Panduan telah berubah. Muat ulang sebelum menyimpan.",
                409,
            );
        }

        databaseUpdated = true;

        /*
         * Setelah database berhasil diperbarui,
         * hapus file lama.
         */
        if (uploadedFile) {
            await cleanupFileSafely(
                existing,
            );
        }

        return res.json({
            success: true,
            message:
                "Panduan berhasil diperbarui",
            data: guideForResponse(
                data,
                req,
            ),
        });
    } catch (error) {
        /*
         * Jika upload PDF baru berhasil tetapi
         * database gagal diperbarui, hapus kembali
         * file PDF yang baru.
         */
        if (
            uploadedFile?.filePath &&
            !databaseUpdated
        ) {
            await cleanupFileSafely({
                filePath:
                    uploadedFile.filePath,
            });
        }

        return handleError(
            res,
            error,
        );
    }
}

export async function deleteCmsGuide(
    req,
    res,
) {
    try {
        const id = validId(
            req.params.id,
        );

        const [data] = await db
            .delete(guides)
            .where(
                eq(guides.id, id),
            )
            .returning({
                id: guides.id,
                title: guides.title,
                fileUrl: guides.fileUrl,
                filePath: guides.filePath,
            });

        if (!data) {
            fail(
                "Panduan tidak ditemukan.",
                404,
            );
        }

        /*
         * Setelah data database dihapus,
         * bersihkan file dari Supabase atau
         * penyimpanan lokal lama.
         */
        await cleanupFileSafely(data);

        return res.json({
            success: true,
            message:
                "Panduan berhasil dihapus",
            data: {
                id: data.id,
                title: data.title,
            },
        });
    } catch (error) {
        return handleError(
            res,
            error,
        );
    }
}
