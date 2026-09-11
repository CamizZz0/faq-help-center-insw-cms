import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { db } from "../config/db.js";
import { categories, tutorials } from "../models/schema.js";

const fields = {
    id: tutorials.id,
    sourceId: tutorials.sourceId,
    categoryId: tutorials.categoryId,
    title: tutorials.title,
    slug: tutorials.slug,
    description: tutorials.description,
    videoUrl: tutorials.videoUrl,
    thumbnailUrl: tutorials.thumbnailUrl,
    durationSeconds: tutorials.durationSeconds,
    sortOrder: tutorials.sortOrder,
    isPublished: tutorials.isPublished,
    createdAt: tutorials.createdAt,
    updatedAt: tutorials.updatedAt,
};

function fail(message, status = 400) {
    throw Object.assign(new Error(message), { status });
}

function handleError(res, error) {
    const code = error?.cause?.code ?? error?.code;
    if (code === "23505") return res.status(409).json({ success: false, message: "Slug tutorial sudah digunakan. Gunakan judul lain." });
    if (code === "23503") return res.status(400).json({ success: false, message: "Kategori tidak valid." });
    if (!error.status) console.error("Kesalahan tutorial CMS:", error);
    return res.status(error.status ?? 500).json({
        success: false,
        message: error.status ? error.message : "Terjadi kesalahan saat mengelola tutorial.",
    });
}

function validId(value) {
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 2147483647) {
        fail("ID tidak valid.");
    }
    return Number(value);
}

function createSlug(title) {
    return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseYouTubeUrl(value) {
    if (typeof value !== "string" || !value.trim()) fail("URL YouTube wajib diisi.");
    let url;
    try { url = new URL(value.trim()); } catch { fail("URL video YouTube tidak valid."); }
    if (url.protocol !== "https:" || url.username || url.password || url.port) fail("URL video YouTube tidak valid.");

    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    let videoId;
    if ((host === "youtube.com" || host === "www.youtube.com") && url.pathname === "/watch") videoId = url.searchParams.get("v");
    else if (host === "youtu.be" && parts.length === 1) [videoId] = parts;
    else if ((host === "youtube.com" || host === "www.youtube.com") && parts.length === 2 && ["embed", "shorts"].includes(parts[0])) videoId = parts[1];
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId ?? "")) fail("URL video YouTube tidak valid.");
    return {
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
}

async function validate(body, existing) {
    if (!body || typeof body !== "object" || Array.isArray(body)) fail("Data tutorial tidak valid.");
    const values = {};
    if (!existing || body.title !== undefined) {
        if (typeof body.title !== "string" || body.title.trim().length < 3 || body.title.trim().length > 200) fail("Judul harus terdiri dari 3–200 karakter.");
        values.title = body.title.trim();
    }
    if (!existing) {
        values.slug = createSlug(values.title);
        if (!values.slug) fail("Judul harus menghasilkan slug yang valid.");
        if (body.slug !== undefined && body.slug !== values.slug) fail("Slug harus sesuai dengan judul saat menambah tutorial.");
    } else if (body.slug !== undefined && body.slug !== existing.slug) fail("Slug tutorial tidak dapat diubah setelah dibuat.");

    if (!existing || body.categoryId !== undefined) {
        values.categoryId = body.categoryId == null || body.categoryId === "" ? null : validId(body.categoryId);
        if (values.categoryId !== null) {
            const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, values.categoryId)).limit(1);
            if (!category) fail("Kategori tidak ditemukan.");
        }
    }
    if (!existing || body.description !== undefined) {
        if (body.description != null && typeof body.description !== "string") fail("Deskripsi harus berupa teks.");
        values.description = body.description?.trim() || null;
    }
    if (!existing || body.videoUrl !== undefined) Object.assign(values, parseYouTubeUrl(body.videoUrl));
    if (body.thumbnailUrl !== undefined) fail("Thumbnail tutorial dibuat otomatis dari URL YouTube.");
    if (!existing || body.durationSeconds !== undefined) {
        const duration = body.durationSeconds;
        if (duration == null || duration === "") values.durationSeconds = null;
        else if (!["number", "string"].includes(typeof duration) || !Number.isInteger(Number(duration)) || Number(duration) < 0 || Number(duration) > 2147483647) fail("Durasi harus berupa bilangan bulat minimal 0.");
        else values.durationSeconds = Number(duration);
    }
    if (!existing || body.sortOrder !== undefined) {
        const order = body.sortOrder == null || body.sortOrder === "" ? 0 : body.sortOrder;
        if (!["number", "string"].includes(typeof order) || !Number.isInteger(Number(order)) || Number(order) < 0 || Number(order) > 2147483647) fail("Urutan harus berupa bilangan bulat minimal 0.");
        values.sortOrder = Number(order);
    }
    if (!existing || body.isPublished !== undefined) {
        const published = body.isPublished === undefined ? false : body.isPublished;
        if (typeof published !== "boolean") fail("Status publikasi harus berupa boolean.");
        values.isPublished = published;
    }
    if (existing && Object.keys(values).length === 0) fail("Tidak ada data tutorial yang diperbarui.");
    return values;
}

export async function getCmsTutorials(req, res) {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);
        if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger((page - 1) * limit)) fail("Parameter pagination tidak valid.");
        const search = String(req.query.search ?? "").trim();
        const category = String(req.query.category ?? "").trim();
        const status = String(req.query.status ?? "").trim();
        if (status && !["published", "draft"].includes(status)) fail("Status harus bernilai published atau draft.");
        const conditions = [];
        if (search) conditions.push(or(ilike(tutorials.title, `%${search}%`), ilike(tutorials.description, `%${search}%`), ilike(tutorials.videoUrl, `%${search}%`)));
        if (category) conditions.push(eq(categories.slug, category));
        if (status) conditions.push(eq(tutorials.isPublished, status === "published"));
        const filter = conditions.length ? and(...conditions) : undefined;
        const [data, totals] = await Promise.all([
            db.select({ ...fields, category: { id: categories.id, name: categories.name, slug: categories.slug } })
                .from(tutorials).leftJoin(categories, eq(tutorials.categoryId, categories.id)).where(filter)
                .orderBy(asc(tutorials.sortOrder), asc(tutorials.id)).limit(limit).offset((page - 1) * limit),
            db.select({ total: count() }).from(tutorials).leftJoin(categories, eq(tutorials.categoryId, categories.id)).where(filter),
        ]);
        const totalItems = Number(totals[0]?.total ?? 0);
        const totalPages = Math.ceil(totalItems / limit);
        return res.json({ success: true, message: "Data tutorial CMS berhasil diambil", data,
            meta: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } });
    } catch (error) { return handleError(res, error); }
}

export async function getCmsTutorialById(req, res) {
    try {
        const id = validId(req.params.id);
        const [data] = await db.select(fields).from(tutorials).where(eq(tutorials.id, id)).limit(1);
        if (!data) fail("Tutorial tidak ditemukan.", 404);
        return res.json({ success: true, message: "Detail tutorial berhasil diambil", data });
    } catch (error) { return handleError(res, error); }
}

export async function createCmsTutorial(req, res) {
    try {
        const values = await validate(req.body);
        const [data] = await db.insert(tutorials).values(values).returning(fields);
        return res.status(201).json({ success: true, message: "Tutorial berhasil ditambahkan", data });
    } catch (error) { return handleError(res, error); }
}

export async function updateCmsTutorial(req, res) {
    try {
        const id = validId(req.params.id);
        const [existing] = await db.select(fields).from(tutorials).where(eq(tutorials.id, id)).limit(1);
        if (!existing) fail("Tutorial tidak ditemukan.", 404);
        const values = await validate(req.body, existing);
        const [data] = await db.update(tutorials).set({ ...values, updatedAt: new Date() }).where(eq(tutorials.id, id)).returning(fields);
        return res.json({ success: true, message: "Tutorial berhasil diperbarui", data });
    } catch (error) { return handleError(res, error); }
}

export async function deleteCmsTutorial(req, res) {
    try {
        const id = validId(req.params.id);
        const [data] = await db.delete(tutorials).where(eq(tutorials.id, id)).returning({ id: tutorials.id, title: tutorials.title });
        if (!data) fail("Tutorial tidak ditemukan.", 404);
        return res.json({ success: true, message: "Tutorial berhasil dihapus", data });
    } catch (error) { return handleError(res, error); }
}
