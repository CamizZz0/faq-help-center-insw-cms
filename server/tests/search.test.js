import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { pool } from "../src/config/db.js";
import searchRoutes from "../src/routes/searchRoutes.js";

test("Unified public search (transaction rollback)", { timeout: 30000 }, async (t) => {
    const client = await pool.connect();
    const originalQuery = pool.query;
    let server;
    const token = `unified${Date.now()}`;
    try {
        await client.query("BEGIN");
        let queryQueue = Promise.resolve();
        pool.query = (...args) => {
            const result = queryQueue.then(() => client.query(...args));
            queryQueue = result.catch(() => {});
            return result;
        };
        const app = express();
        app.use("/api/search", searchRoutes);
        server = app.listen(0, "127.0.0.1");
        await once(server, "listening");
        const base = `http://127.0.0.1:${server.address().port}/api/search`;

        const neutralCategory = (await client.query(
            "INSERT INTO categories (name, slug, sort_order, is_active) VALUES ($1, $2, 2, true) RETURNING id",
            [`Kategori ${Date.now()}`, `neutral-${token}`],
        )).rows[0];
        const matchingCategory = (await client.query(
            "INSERT INTO categories (name, slug, sort_order, is_active) VALUES ($1, $2, 1, true) RETURNING id",
            [`Kategori ${token}`, `matching-${token}`],
        )).rows[0];
        const inactiveCategory = (await client.query(
            "INSERT INTO categories (name, slug, is_active) VALUES ($1, $2, false) RETURNING id",
            [`Nonaktif ${token}`, `inactive-${token}`],
        )).rows[0];

        const subcategory = (await client.query(
            "INSERT INTO subcategories (category_id, name, slug, sort_order, is_active) VALUES ($1, $2, $3, 1, true) RETURNING id",
            [neutralCategory.id, `Sub ${token}`, `sub-${token}`],
        )).rows[0];
        const topic = (await client.query(
            "INSERT INTO faq_topics (subcategory_id, name, slug, sort_order, is_active) VALUES ($1, $2, $3, 1, true) RETURNING id",
            [subcategory.id, "Topik netral", `topic-${token}`],
        )).rows[0];
        const firstFaq = (await client.query(
            "INSERT INTO faqs (topic_id, question, answer, sort_order, is_published) VALUES ($1, $2, $3, 1, true) RETURNING id",
            [topic.id, `Pertanyaan ${token}`, "Jawaban netral"],
        )).rows[0];
        await client.query(
            "INSERT INTO faqs (topic_id, question, answer, sort_order, is_published) VALUES ($1, $2, $3, 2, true)",
            [topic.id, "Pertanyaan kedua", `Jawaban ${token}`],
        );
        const inactiveSub = (await client.query(
            "INSERT INTO subcategories (category_id, name, slug, is_active) VALUES ($1, $2, $3, true) RETURNING id",
            [inactiveCategory.id, token, `inactive-sub-${token}`],
        )).rows[0];
        const inactiveTopic = (await client.query(
            "INSERT INTO faq_topics (subcategory_id, name, slug, is_active) VALUES ($1, $2, $3, true) RETURNING id",
            [inactiveSub.id, token, `inactive-topic-${token}`],
        )).rows[0];
        await client.query("INSERT INTO faqs (topic_id, question, answer, is_published) VALUES ($1, $2, 'x', true)", [inactiveTopic.id, token]);

        const firstGuide = (await client.query(
            "INSERT INTO guides (title, slug, description, file_url, sort_order, is_published) VALUES ($1, $2, 'netral', $3, 1, true) RETURNING id",
            [`Panduan ${token}`, `guide-one-${token}`, "https://example.com/guide.pdf"],
        )).rows[0];
        await client.query(
            "INSERT INTO guides (category_id, title, slug, description, file_url, sort_order, is_published) VALUES ($1, 'Panduan netral', $2, 'netral', $3, 2, true)",
            [matchingCategory.id, `guide-two-${token}`, "https://example.com/guide-two.pdf"],
        );
        await client.query("INSERT INTO guides (title, slug, file_url, is_published) VALUES ($1, $2, $3, false)", [`Draft ${token}`, `guide-draft-${token}`, "https://example.com/draft.pdf"]);

        const firstTutorial = (await client.query(
            "INSERT INTO tutorials (title, slug, description, video_url, thumbnail_url, duration_seconds, sort_order, is_published) VALUES ($1, $2, 'netral', $3, $4, 90, 1, true) RETURNING id",
            [`Tutorial ${token}`, `tutorial-one-${token}`, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"],
        )).rows[0];
        await client.query(
            "INSERT INTO tutorials (category_id, title, slug, description, video_url, sort_order, is_published) VALUES ($1, 'Tutorial netral', $2, 'netral', $3, 2, true)",
            [matchingCategory.id, `tutorial-two-${token}`, "https://www.youtube.com/watch?v=M7lc1UVf-VE"],
        );
        await client.query("INSERT INTO tutorials (title, slug, video_url, is_published) VALUES ($1, $2, $3, false)", [`Draft ${token}`, `tutorial-draft-${token}`, "https://www.youtube.com/watch?v=M7lc1UVf-VE"]);

        async function request(queryString, expected = 200) {
            const response = await fetch(`${base}${queryString}`);
            const result = await response.json();
            assert.equal(response.status, expected, JSON.stringify(result));
            assert.equal(result.success, expected < 400);
            return result;
        }

        await t.test("searches titles only and paginates the combined result", async () => {
            const result = await request(`?q=%20${token.toUpperCase()}%20&limit=1`);
            assert.deepEqual(Object.keys(result.data), ["results"]);
            assert.deepEqual(result.meta.counts, { faqs: 1, guides: 1, tutorials: 1 });
            assert.equal(result.meta.totalItems, 3);
            assert.equal(result.meta.limit, 1);
            assert.equal(result.meta.query, token.toUpperCase());
            assert.equal(result.data.results.length, 1);
            assert.equal(result.data.results[0].id, firstFaq.id);
            assert.equal(result.data.results[0].resultType, "faq");

            const guidePage = await request(`?q=${token}&limit=1&page=2`);
            assert.equal(guidePage.data.results[0].id, firstGuide.id);
            assert.equal(guidePage.data.results[0].resultType, "guide");
            assert.equal("category" in guidePage.data.results[0], false);

            const tutorialPage = await request(`?q=${token}&limit=1&page=3`);
            assert.equal(tutorialPage.data.results[0].id, firstTutorial.id);
            assert.equal(tutorialPage.data.results[0].resultType, "tutorial");
            assert.equal("category" in tutorialPage.data.results[0], false);
            assert.equal("durationSeconds" in tutorialPage.data.results[0], false);
        });

        await t.test("validates q and limit", async () => {
            for (const queryString of ["", "?q=x", `?q=${"x".repeat(101)}`, `?q=${token}&limit=0`, `?q=${token}&limit=21`, `?q=${token}&limit=1.5`, `?q=${token}&limit=abc`, `?q=${token}&q=other`]) {
                await request(queryString, 400);
            }
            const defaultLimit = await request(`?q=${token}`);
            assert.equal(defaultLimit.meta.limit, 6);
        });

        await client.query("ROLLBACK");
        assert.equal((await client.query("SELECT id FROM categories WHERE slug LIKE $1", [`%${token}%`])).rowCount, 0);
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        await client.query("ROLLBACK");
        pool.query = originalQuery;
        client.release();
        await pool.end();
    }
});
