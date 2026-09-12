import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { pool } from "../src/config/db.js";
import categoryRoutes from "../src/routes/categoryRoutes.js";
import cmsSubcategoryRoutes from "../src/routes/cmsSubcategoryRoutes.js";

test("Subcategory CMS CRUD and public integration (transaction rollback)", { timeout: 30000 }, async (t) => {
    const client = await pool.connect();
    const originalQuery = pool.query;
    let server;
    const token = `subcategory-test-${Date.now()}`;
    const createdIds = new Set();

    try {
        await client.query("BEGIN");
        const baseline = (await client.query("SELECT * FROM subcategories ORDER BY id")).rows;
        pool.query = (...args) => client.query(...args);

        const app = express();
        app.use(express.json());
        app.use("/api/cms/subcategories", cmsSubcategoryRoutes);
        app.use("/api/categories", categoryRoutes);
        server = app.listen(0, "127.0.0.1");
        await once(server, "listening");
        const base = `http://127.0.0.1:${server.address().port}/api`;

        async function request(path, { method = "GET", body, expected = 200 } = {}) {
            if (method === "DELETE") {
                assert.ok(createdIds.has(Number(path.split("/").at(-1))), "Delete only test-created subcategories");
            }

            await client.query("SAVEPOINT subcategory_request");
            const response = await fetch(`${base}${path}`, {
                method,
                headers: body === undefined ? undefined : { "Content-Type": "application/json" },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
            const result = await response.json();

            if (response.status >= 400) {
                await client.query("ROLLBACK TO SAVEPOINT subcategory_request");
            }
            await client.query("RELEASE SAVEPOINT subcategory_request");

            assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
            assert.equal(result.success, expected < 400);
            if (method === "POST" && response.status === 201) createdIds.add(result.data.id);
            return result;
        }

        const firstCategory = (await client.query(
            "INSERT INTO categories (name, slug, sort_order, is_active) VALUES ($1, $2, 1, true) RETURNING id, slug",
            [`Kategori A ${token}`, `category-a-${token}`],
        )).rows[0];
        const secondCategory = (await client.query(
            "INSERT INTO categories (name, slug, sort_order, is_active) VALUES ($1, $2, 2, true) RETURNING id, slug",
            [`Kategori B ${token}`, `category-b-${token}`],
        )).rows[0];

        const payload = {
            categoryId: firstCategory.id,
            name: `Layanan ${token}`,
            description: `Deskripsi ${token}`,
            icon: "file-text",
            sortOrder: "",
            isActive: false,
        };
        let subcategory;

        await t.test("create generates a slug and returns complete relations", async () => {
            subcategory = (await request("/cms/subcategories", {
                method: "POST",
                body: payload,
                expected: 201,
            })).data;

            assert.equal(subcategory.slug, `layanan-${token}`);
            assert.equal(subcategory.category.id, firstCategory.id);
            assert.equal(subcategory.sortOrder, 0);
            assert.equal(subcategory.isActive, false);
            assert.equal(subcategory.topicCount, 0);
            assert.equal((await request(`/cms/subcategories/${subcategory.id}`)).data.id, subcategory.id);
        });

        await t.test("list supports title search, category/status filters, and pagination", async () => {
            const second = (await request("/cms/subcategories", {
                method: "POST",
                body: { ...payload, name: `Layanan kedua ${token}`, sortOrder: 2 },
                expected: 201,
            })).data;

            const firstPage = await request(
                `/cms/subcategories?search=${token}&category=${firstCategory.slug}&status=inactive&limit=1`,
            );
            const secondPage = await request(
                `/cms/subcategories?search=${token}&category=${firstCategory.slug}&status=inactive&limit=1&page=2`,
            );

            assert.equal(firstPage.meta.totalItems, 2);
            assert.equal(typeof firstPage.meta.totalItems, "number");
            assert.equal(firstPage.meta.hasNextPage, true);
            assert.equal(secondPage.meta.hasPreviousPage, true);
            assert.deepEqual([firstPage.data[0].id, secondPage.data[0].id], [subcategory.id, second.id]);
        });

        await t.test("edit preserves slug and updates all editable fields", async () => {
            const result = await request(`/cms/subcategories/${subcategory.id}`, {
                method: "PATCH",
                body: {
                    categoryId: secondCategory.id,
                    name: `Nama baru ${token}`,
                    description: "Deskripsi baru",
                    icon: "folder-tree",
                    sortOrder: 7,
                    isActive: true,
                },
            });

            assert.equal(result.data.slug, subcategory.slug);
            assert.equal(result.data.category.id, secondCategory.id);
            assert.equal(result.data.name, `Nama baru ${token}`);
            assert.equal(result.data.description, "Deskripsi baru");
            assert.equal(result.data.icon, "folder-tree");
            assert.equal(result.data.sortOrder, 7);
            assert.equal(result.data.isActive, true);
        });

        await t.test("public endpoint only returns active subcategories in their category", async () => {
            const active = await request(`/categories/${secondCategory.slug}/subcategories`);
            assert.ok(active.data.subcategories.some((item) => item.id === subcategory.id));

            await request(`/cms/subcategories/${subcategory.id}`, {
                method: "PATCH",
                body: { isActive: false },
            });
            const inactive = await request(`/categories/${secondCategory.slug}/subcategories`);
            assert.equal(inactive.data.subcategories.some((item) => item.id === subcategory.id), false);
        });

        await t.test("rejects invalid payloads, immutable fields, IDs, and filters", async () => {
            for (const body of [
                {},
                { ...payload, categoryId: true },
                { ...payload, categoryId: 2147483648 },
                { ...payload, name: "x" },
                { ...payload, name: "x".repeat(151) },
                { ...payload, description: {} },
                { ...payload, icon: "x".repeat(101) },
                { ...payload, sortOrder: -1 },
                { ...payload, sortOrder: 2147483648 },
                { ...payload, isActive: "true" },
                { ...payload, sourceId: 123 },
            ]) {
                await request("/cms/subcategories", { method: "POST", body, expected: 400 });
            }

            for (const body of [
                { slug: "slug-baru" },
                { sourceId: 123 },
                { categoryId: 2147483647 },
                { description: {} },
                { icon: "x".repeat(101) },
            ]) {
                await request(`/cms/subcategories/${subcategory.id}`, { method: "PATCH", body, expected: 400 });
            }

            await request("/cms/subcategories", { method: "POST", body: payload, expected: 409 });
            for (const path of [
                "/cms/subcategories/no-id",
                "/cms/subcategories/0",
                "/cms/subcategories/2147483648",
                "/cms/subcategories?page=0",
                "/cms/subcategories?page=1.5",
                "/cms/subcategories?limit=51",
                "/cms/subcategories?status=other",
            ]) {
                await request(path, { expected: 400 });
            }
            await request("/cms/subcategories/2147483647", { expected: 404 });
        });

        await t.test("delete protection keeps topics and FAQs intact", async () => {
            const topic = (await client.query(
                "INSERT INTO faq_topics (subcategory_id, name, slug, is_active) VALUES ($1, $2, $3, true) RETURNING id",
                [subcategory.id, `Topik ${token}`, `topic-${token}`],
            )).rows[0];
            const faq = (await client.query(
                "INSERT INTO faqs (topic_id, question, answer, is_published) VALUES ($1, $2, 'Jawaban', true) RETURNING id",
                [topic.id, `Pertanyaan ${token}`],
            )).rows[0];

            const result = await request(`/cms/subcategories/${subcategory.id}`, {
                method: "DELETE",
                expected: 409,
            });
            assert.deepEqual(result.data, { topicCount: 1 });
            assert.equal((await client.query("SELECT id FROM faq_topics WHERE id = $1", [topic.id])).rowCount, 1);
            assert.equal((await client.query("SELECT id FROM faqs WHERE id = $1", [faq.id])).rowCount, 1);
        });

        await t.test("delete removes a test subcategory without topics", async () => {
            const deletable = (await request("/cms/subcategories", {
                method: "POST",
                body: { ...payload, name: `Boleh dihapus ${token}` },
                expected: 201,
            })).data;

            await request(`/cms/subcategories/${deletable.id}`, { method: "DELETE" });
            createdIds.delete(deletable.id);
            await request(`/cms/subcategories/${deletable.id}`, { expected: 404 });
        });

        await client.query("ROLLBACK");
        assert.deepEqual((await client.query("SELECT * FROM subcategories ORDER BY id")).rows, baseline);
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        await client.query("ROLLBACK");
        pool.query = originalQuery;
        client.release();
        await pool.end();
    }
});
