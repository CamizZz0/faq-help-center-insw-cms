import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";

import { pool } from "../src/config/db.js";
import faqRoutes from "../src/routes/faqRoutes.js";
import guideRoutes from "../src/routes/guideRoutes.js";
import tutorialRoutes from "../src/routes/tutorialRoutes.js";

test("feedback tersimpan untuk FAQ, panduan, dan tutorial", { timeout: 30000 }, async (t) => {
    const client = await pool.connect();
    const originalQuery = pool.query;
    const token = `feedback-${Date.now()}`;
    let server;

    try {
        await client.query("BEGIN");
        pool.query = (...args) => client.query(...args);

        const category = (await client.query(
            "INSERT INTO categories (name, slug, sort_order, is_active) VALUES ($1, $2, 1, true) RETURNING id",
            [`Kategori ${token}`, `kategori-${token}`],
        )).rows[0];
        const subcategory = (await client.query(
            "INSERT INTO subcategories (category_id, name, slug, sort_order, is_active) VALUES ($1, $2, $3, 1, true) RETURNING id",
            [category.id, `Subkategori ${token}`, `subkategori-${token}`],
        )).rows[0];
        const topic = (await client.query(
            "INSERT INTO faq_topics (subcategory_id, name, slug, sort_order, is_active) VALUES ($1, $2, $3, 1, true) RETURNING id",
            [subcategory.id, `Topik ${token}`, `topik-${token}`],
        )).rows[0];
        const faq = (await client.query(
            "INSERT INTO faqs (topic_id, question, answer, sort_order, is_published) VALUES ($1, $2, $3, 1, true) RETURNING id",
            [topic.id, `FAQ ${token}`, "Jawaban"],
        )).rows[0];
        const faqDraft = (await client.query(
            "INSERT INTO faqs (topic_id, question, answer, sort_order, is_published) VALUES ($1, $2, $3, 2, false) RETURNING id",
            [topic.id, `FAQ draft ${token}`, "Jawaban"],
        )).rows[0];

        const guide = (await client.query(
            "INSERT INTO guides (title, slug, file_url, sort_order, is_published) VALUES ($1, $2, $3, 1, true) RETURNING id",
            [`Panduan ${token}`, `panduan-${token}`, "https://example.com/panduan.pdf"],
        )).rows[0];
        const guideDraft = (await client.query(
            "INSERT INTO guides (title, slug, file_url, sort_order, is_published) VALUES ($1, $2, $3, 2, false) RETURNING id",
            [`Panduan draft ${token}`, `panduan-draft-${token}`, "https://example.com/panduan-draft.pdf"],
        )).rows[0];

        const tutorial = (await client.query(
            "INSERT INTO tutorials (title, slug, video_url, thumbnail_url, sort_order, is_published) VALUES ($1, $2, $3, $4, 1, true) RETURNING id",
            [
                `Tutorial ${token}`,
                `tutorial-${token}`,
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
            ],
        )).rows[0];
        const tutorialDraft = (await client.query(
            "INSERT INTO tutorials (title, slug, video_url, sort_order, is_published) VALUES ($1, $2, $3, 2, false) RETURNING id",
            [`Tutorial draft ${token}`, `tutorial-draft-${token}`, "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
        )).rows[0];

        const app = express();
        app.use(express.json());
        app.use("/api/faqs", faqRoutes);
        app.use("/api/guides", guideRoutes);
        app.use("/api/tutorials", tutorialRoutes);
        server = app.listen(0, "127.0.0.1");
        await once(server, "listening");
        const base = `http://127.0.0.1:${server.address().port}/api`;

        async function kirim(path, body, expected = 201) {
            const response = await fetch(`${base}${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const result = await response.json();
            assert.equal(response.status, expected, `POST ${path}: ${JSON.stringify(result)}`);
            assert.equal(result.success, expected < 400);
            return result;
        }

        async function hitungFeedback(contentType, contentId) {
            const { rows } = await client.query(
                "SELECT is_helpful, reason FROM content_feedback WHERE content_type = $1 AND content_id = $2 ORDER BY id",
                [contentType, contentId],
            );
            return rows;
        }

        await t.test("FAQ menyimpan feedback dengan jenis faq", async () => {
            await kirim(`/faqs/${faq.id}/feedback`, {
                isHelpful: true,
                reason: "",
                viewerRole: "guest",
            });

            const rows = await hitungFeedback("faq", faq.id);
            assert.equal(rows.length, 1);
            assert.equal(rows[0].is_helpful, true);
        });

        await t.test("panduan menyimpan feedback dengan jenis guide", async () => {
            await kirim(`/guides/${guide.id}/feedback`, {
                isHelpful: false,
                reason: "Panduan kurang lengkap",
            });

            const rows = await hitungFeedback("guide", guide.id);
            assert.equal(rows.length, 1);
            assert.equal(rows[0].is_helpful, false);
            assert.equal(rows[0].reason, "Panduan kurang lengkap");
        });

        await t.test("tutorial menyimpan feedback dengan jenis tutorial", async () => {
            await kirim(`/tutorials/${tutorial.id}/feedback`, {
                isHelpful: true,
                reason: "Terima kasih",
            });

            const rows = await hitungFeedback("tutorial", tutorial.id);
            assert.equal(rows.length, 1);
            // Alasan tidak disimpan untuk penilaian positif.
            assert.equal(rows[0].reason, null);
        });

        await t.test("alasan hanya disimpan untuk penilaian Tidak", async () => {
            await kirim(`/faqs/${faq.id}/feedback`, {
                isHelpful: false,
                reason: "Jawaban kurang jelas",
            });

            const rows = await hitungFeedback("faq", faq.id);
            assert.equal(rows.length, 2);
            assert.equal(rows[1].reason, "Jawaban kurang jelas");
        });

        await t.test("validasi menolak masukan yang tidak sah", async () => {
            await kirim(`/guides/${guide.id}/feedback`, { isHelpful: "ya" }, 400);
            await kirim("/guides/abc/feedback", { isHelpful: true }, 400);
            await kirim("/tutorials/0/feedback", { isHelpful: true }, 400);
            await kirim(`/tutorials/${tutorial.id}/feedback`, {
                isHelpful: false,
                reason: "x".repeat(1001),
            }, 400);
            await kirim(`/guides/${guide.id}/feedback`, {
                isHelpful: false,
                reason: 123,
            }, 400);
        });

        await t.test("konten yang belum terbit tidak bisa diberi feedback", async () => {
            await kirim(`/guides/${guideDraft.id}/feedback`, { isHelpful: true }, 404);
            await kirim(`/tutorials/${tutorialDraft.id}/feedback`, { isHelpful: true }, 404);
            await kirim(`/faqs/${faqDraft.id}/feedback`, { isHelpful: true }, 404);
        });

        await t.test("konten yang tidak ada ditolak", async () => {
            await kirim("/guides/2147483647/feedback", { isHelpful: true }, 404);
            await kirim("/tutorials/2147483647/feedback", { isHelpful: true }, 404);
        });
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        await client.query("ROLLBACK");
        pool.query = originalQuery;
        client.release();
        await pool.end();
    }
});
