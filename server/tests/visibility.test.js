import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";

import { pool } from "../src/config/db.js";
import categoryRoutes from "../src/routes/categoryRoutes.js";
import subcategoryRoutes from "../src/routes/subcategoryRoutes.js";
import topicRoutes from "../src/routes/topicRoutes.js";
import faqRoutes from "../src/routes/faqRoutes.js";
import guideRoutes from "../src/routes/guideRoutes.js";
import tutorialRoutes from "../src/routes/tutorialRoutes.js";
import cmsCategoryRoutes from "../src/routes/cmsCategoryRoutes.js";
import cmsSubcategoryRoutes from "../src/routes/cmsSubcategoryRoutes.js";
import cmsTopicRoutes from "../src/routes/cmsTopicRoutes.js";
import cmsFaqRoutes from "../src/routes/cmsFaqRoutes.js";
import cmsGuideRoutes from "../src/routes/cmsGuideRoutes.js";
import cmsTutorialRoutes from "../src/routes/cmsTutorialRoutes.js";

test("CMS visibility actions update status and public availability", { timeout: 30000 }, async (t) => {
    const client = await pool.connect();
    const originalQuery = pool.query;
    const token = `visibility-${Date.now()}`;
    let server;

    try {
        await client.query("BEGIN");
        pool.query = (...args) => client.query(...args);

        const category = (await client.query(
            "INSERT INTO categories (name, slug, sort_order, is_active) VALUES ($1, $2, 1, true) RETURNING id, slug",
            [`Kategori ${token}`, `category-${token}`],
        )).rows[0];
        const subcategory = (await client.query(
            "INSERT INTO subcategories (category_id, name, slug, sort_order, is_active) VALUES ($1, $2, $3, 1, true) RETURNING id, slug",
            [category.id, `Subkategori ${token}`, `subcategory-${token}`],
        )).rows[0];
        const topic = (await client.query(
            "INSERT INTO faq_topics (subcategory_id, name, slug, sort_order, is_active) VALUES ($1, $2, $3, 1, true) RETURNING id, slug",
            [subcategory.id, `Topik ${token}`, `topic-${token}`],
        )).rows[0];
        const faq = (await client.query(
            "INSERT INTO faqs (topic_id, question, answer, sort_order, is_published) VALUES ($1, $2, $3, 1, true) RETURNING id",
            [topic.id, `FAQ ${token}`, "Jawaban"],
        )).rows[0];
        const guide = (await client.query(
            "INSERT INTO guides (title, slug, file_url, sort_order, is_published) VALUES ($1, $2, $3, 1, true) RETURNING id",
            [`Panduan ${token}`, `guide-${token}`, "https://example.com/guide.pdf"],
        )).rows[0];
        const tutorial = (await client.query(
            "INSERT INTO tutorials (title, slug, video_url, thumbnail_url, sort_order, is_published) VALUES ($1, $2, $3, $4, 1, true) RETURNING id",
            [`Tutorial ${token}`, `tutorial-${token}`, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"],
        )).rows[0];

        const app = express();
        app.use(express.json());
        app.use("/api/categories", categoryRoutes);
        app.use("/api/subcategories", subcategoryRoutes);
        app.use("/api/topics", topicRoutes);
        app.use("/api/faqs", faqRoutes);
        app.use("/api/guides", guideRoutes);
        app.use("/api/tutorials", tutorialRoutes);
        app.use("/api/cms/categories", cmsCategoryRoutes);
        app.use("/api/cms/subcategories", cmsSubcategoryRoutes);
        app.use("/api/cms/topics", cmsTopicRoutes);
        app.use("/api/cms/faqs", cmsFaqRoutes);
        app.use("/api/cms/guides", cmsGuideRoutes);
        app.use("/api/cms/tutorials", cmsTutorialRoutes);
        server = app.listen(0, "127.0.0.1");
        await once(server, "listening");
        const base = `http://127.0.0.1:${server.address().port}/api`;

        async function request(path, { method = "GET", body, expected = 200 } = {}) {
            const isFormData = body instanceof FormData;
            const response = await fetch(`${base}${path}`, {
                method,
                headers: body === undefined || isFormData
                    ? undefined
                    : { "Content-Type": "application/json" },
                body: body === undefined || isFormData
                    ? body
                    : JSON.stringify(body),
            });
            const result = await response.json();
            assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
            assert.equal(result.success, expected < 400);
            return result;
        }

        async function setMultipartStatus(path, field, value) {
            const body = new FormData();
            body.set(field, String(value));
            return request(path, { method: "PATCH", body });
        }

        await t.test("category visibility hides and restores its public entry", async () => {
            await setMultipartStatus(`/cms/categories/${category.id}`, "isActive", false);
            const inactive = await request("/categories");
            assert.equal(inactive.data.some((item) => item.id === category.id), false);
            await setMultipartStatus(`/cms/categories/${category.id}`, "isActive", true);
            const active = await request("/categories");
            assert.equal(active.data.some((item) => item.id === category.id), true);
        });

        await t.test("subcategory visibility hides and restores its public entry", async () => {
            await setMultipartStatus(`/cms/subcategories/${subcategory.id}`, "isActive", false);
            const inactive = await request(`/categories/${category.slug}/subcategories`);
            assert.equal(inactive.data.subcategories.some((item) => item.id === subcategory.id), false);
            await setMultipartStatus(`/cms/subcategories/${subcategory.id}`, "isActive", true);
            const active = await request(`/categories/${category.slug}/subcategories`);
            assert.equal(active.data.subcategories.some((item) => item.id === subcategory.id), true);
        });

        await t.test("topic visibility hides and restores its public entry", async () => {
            await request(`/cms/topics/${topic.id}`, { method: "PATCH", body: { isActive: false } });
            const inactive = await request(`/subcategories/${subcategory.slug}/topics`);
            assert.equal(inactive.data.topics.some((item) => item.id === topic.id), false);
            await request(`/cms/topics/${topic.id}`, { method: "PATCH", body: { isActive: true } });
            const active = await request(`/subcategories/${subcategory.slug}/topics`);
            assert.equal(active.data.topics.some((item) => item.id === topic.id), true);
        });

        await t.test("FAQ publication hides and restores it in the public chain", async () => {
            await request(`/cms/faqs/${faq.id}`, { method: "PATCH", body: { isPublished: false } });
            const inactive = await request(`/faqs?search=${encodeURIComponent(token)}`);
            assert.equal(inactive.data.some((item) => item.id === faq.id), false);
            await request(`/cms/faqs/${faq.id}`, { method: "PATCH", body: { isPublished: true } });
            const active = await request(`/faqs?search=${encodeURIComponent(token)}`);
            assert.equal(active.data.some((item) => item.id === faq.id), true);
        });

        await t.test("CMS FAQ topic filter returns only the selected topic", async () => {
            const result = await request(`/cms/faqs?topic=${topic.id}`);
            assert.equal(result.meta.totalItems, 1);
            assert.equal(result.data[0].id, faq.id);
            await request("/cms/faqs?topic=invalid", { expected: 400 });
        });

        await t.test("guide publication hides and restores it publicly", async () => {
            await setMultipartStatus(`/cms/guides/${guide.id}`, "isPublished", false);
            const inactive = await request("/guides?limit=50");
            assert.equal(inactive.data.some((item) => item.id === guide.id), false);
            await setMultipartStatus(`/cms/guides/${guide.id}`, "isPublished", true);
            const active = await request("/guides?limit=50");
            assert.equal(active.data.some((item) => item.id === guide.id), true);
        });

        await t.test("tutorial publication hides and restores it publicly", async () => {
            await request(`/cms/tutorials/${tutorial.id}`, { method: "PATCH", body: { isPublished: false } });
            const inactive = await request("/tutorials?limit=50");
            assert.equal(inactive.data.some((item) => item.id === tutorial.id), false);
            await request(`/cms/tutorials/${tutorial.id}`, { method: "PATCH", body: { isPublished: true } });
            const active = await request("/tutorials?limit=50");
            assert.equal(active.data.some((item) => item.id === tutorial.id), true);
        });
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        await client.query("ROLLBACK");
        pool.query = originalQuery;
        client.release();
        await pool.end();
    }
});
