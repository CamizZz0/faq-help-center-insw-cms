import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";

import { pool } from "../src/config/db.js";
import faqRoutes from "../src/routes/faqRoutes.js";
import { _resetBuckets } from "../src/middleware/feedbackRateLimit.js";

test("rate-limit feedback: max 5 per 60 menit per IP+konten", { timeout: 30000 }, async (t) => {
    const client = await pool.connect();
    const originalQuery = pool.query;
    const token = `ratelimit-${Date.now()}`;
    let server;

    try {
        await client.query("BEGIN");
        pool.query = (...args) => client.query(...args);
        _resetBuckets();

        const category = (await client.query(
            "INSERT INTO categories (name, slug, sort_order, is_active) VALUES ($1,$2,1,true) RETURNING id",
            [`Kategori ${token}`, `kategori-${token}`]
        )).rows[0];
        const subcategory = (await client.query(
            "INSERT INTO subcategories (category_id, name, slug, sort_order, is_active) VALUES ($1,$2,$3,1,true) RETURNING id",
            [category.id, `Sub ${token}`, `sub-${token}`]
        )).rows[0];
        const topic = (await client.query(
            "INSERT INTO faq_topics (subcategory_id, name, slug, sort_order, is_active) VALUES ($1,$2,$3,1,true) RETURNING id",
            [subcategory.id, `Topik ${token}`, `topik-${token}`]
        )).rows[0];
        const faq = (await client.query(
            "INSERT INTO faqs (topic_id, question, answer, sort_order, is_published, visibility) VALUES ($1,$2,$3,1,true,'public') RETURNING id",
            [topic.id, `FAQ ${token}`, "Jawaban"]
        )).rows[0];

        const app = express();
        app.use(express.json());
        app.set("trust proxy", true);
        app.use("/api/faqs", faqRoutes);
        server = app.listen(0, "127.0.0.1");
        await once(server, "listening");
        const base = `http://127.0.0.1:${server.address().port}/api`;

        async function kirim(ip) {
            const res = await fetch(`${base}/faqs/${faq.id}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
                body: JSON.stringify({ isHelpful: true }),
            });
            const body = await res.json();
            return { status: res.status, body, headers: res.headers };
        }

        await t.test("5 request pertama berhasil, ke-6 tertolak 429", async () => {
            const ip = "10.0.0.1";
            for (let i = 0; i < 5; i++) {
                const r = await kirim(ip);
                assert.equal(r.status, 201, `request ${i + 1} should be 201`);
            }
            const r6 = await kirim(ip);
            assert.equal(r6.status, 429, "request ke-6 harus 429");
            assert.match(r6.body.message, /Terlalu banyak/);
            assert.ok(r6.headers.get("retry-after"), "harus ada Retry-After");
            assert.equal(r6.headers.get("x-ratelimit-limit"), "5");
            assert.equal(r6.headers.get("x-ratelimit-remaining"), "0");
        });

        await t.test("IP berbeda tidak terkena limit", async () => {
            const r = await kirim("10.0.0.99");
            assert.equal(r.status, 201);
        });

        await t.test("konten berbeda tidak terkena limit IP sama", async () => {
            const faq2 = (await client.query(
                "INSERT INTO faqs (topic_id, question, answer, sort_order, is_published, visibility) VALUES ($1,$2,$3,2,true,'public') RETURNING id",
                [topic.id, `FAQ2 ${token}`, "Jawaban2"]
            )).rows[0];
            // butuh route baru? pakai endpoint sama tapi id beda
            const r = await fetch(`${base}/faqs/${faq2.id}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.0.1" },
                body: JSON.stringify({ isHelpful: false, reason: "kurang jelas" }),
            });
            assert.equal(r.status, 201);
        });
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        _resetBuckets();
        await client.query("ROLLBACK");
        pool.query = originalQuery;
        client.release();
        await pool.end();
    }
});
