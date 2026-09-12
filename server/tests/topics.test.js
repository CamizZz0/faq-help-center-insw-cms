import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";

import { pool } from "../src/config/db.js";
import cmsTopicRoutes from "../src/routes/cmsTopicRoutes.js";
import subcategoryRoutes from "../src/routes/subcategoryRoutes.js";

test(
    "Topic CMS CRUD and public integration (transaction rollback)",
    { timeout: 30000 },
    async (t) => {
        const client = await pool.connect();
        const originalQuery = pool.query;
        const token = `topic-test-${Date.now()}`;
        const createdIds = new Set();
        let server;

        try {
            await client.query("BEGIN");
            const baseline = (
                await client.query("SELECT * FROM faq_topics ORDER BY id")
            ).rows;
            pool.query = (...args) => client.query(...args);

            const app = express();
            app.use(express.json());
            app.use("/api/cms/topics", cmsTopicRoutes);
            app.use("/api/subcategories", subcategoryRoutes);
            server = app.listen(0, "127.0.0.1");
            await once(server, "listening");
            const base = `http://127.0.0.1:${server.address().port}/api`;

            async function request(
                path,
                { method = "GET", body, expected = 200 } = {},
            ) {
                if (method === "DELETE") {
                    assert.ok(
                        createdIds.has(Number(path.split("/").at(-1))),
                        "Delete only test-created topics",
                    );
                }

                await client.query("SAVEPOINT topic_request");
                const response = await fetch(`${base}${path}`, {
                    method,
                    headers:
                        body === undefined
                            ? undefined
                            : { "Content-Type": "application/json" },
                    body: body === undefined ? undefined : JSON.stringify(body),
                });
                const result = await response.json();

                if (response.status >= 400) {
                    await client.query("ROLLBACK TO SAVEPOINT topic_request");
                }
                await client.query("RELEASE SAVEPOINT topic_request");

                assert.equal(
                    response.status,
                    expected,
                    `${method} ${path}: ${JSON.stringify(result)}`,
                );
                assert.equal(result.success, expected < 400);
                if (method === "POST" && response.status === 201) {
                    createdIds.add(result.data.id);
                }
                return result;
            }

            const firstCategory = (
                await client.query(
                    "INSERT INTO categories (name, slug, sort_order, is_active) VALUES ($1, $2, 1, true) RETURNING id, slug",
                    [`Kategori A ${token}`, `category-a-${token}`],
                )
            ).rows[0];
            const secondCategory = (
                await client.query(
                    "INSERT INTO categories (name, slug, sort_order, is_active) VALUES ($1, $2, 2, true) RETURNING id, slug",
                    [`Kategori B ${token}`, `category-b-${token}`],
                )
            ).rows[0];
            const firstSubcategory = (
                await client.query(
                    "INSERT INTO subcategories (category_id, name, slug, sort_order, is_active) VALUES ($1, $2, $3, 1, true) RETURNING id, slug",
                    [
                        firstCategory.id,
                        `Subkategori A ${token}`,
                        `subcategory-a-${token}`,
                    ],
                )
            ).rows[0];
            const secondSubcategory = (
                await client.query(
                    "INSERT INTO subcategories (category_id, name, slug, sort_order, is_active) VALUES ($1, $2, $3, 2, true) RETURNING id, slug",
                    [
                        secondCategory.id,
                        `Subkategori B ${token}`,
                        `subcategory-b-${token}`,
                    ],
                )
            ).rows[0];

            const payload = {
                subcategoryId: firstSubcategory.id,
                name: `Pendahuluan ${token}`,
                description: `Deskripsi khusus ${token}`,
                isActive: false,
            };
            let topic;

            await t.test(
                "create generates slug and detail has complete relations",
                async () => {
                    topic = (
                        await request("/cms/topics", {
                            method: "POST",
                            body: payload,
                            expected: 201,
                        })
                    ).data;

                    assert.equal(topic.slug, `pendahuluan-${token}`);
                    assert.equal(topic.subcategory.id, firstSubcategory.id);
                    assert.equal(topic.category.id, firstCategory.id);
                    assert.equal(topic.sortOrder, 1);
                    assert.equal(topic.isActive, false);
                    assert.equal(topic.faqCount, 0);
                    assert.equal(
                        (await request(`/cms/topics/${topic.id}`)).data.id,
                        topic.id,
                    );
                },
            );

            await t.test(
                "list supports search, all filters, and pagination",
                async () => {
                    const second = (
                        await request("/cms/topics", {
                            method: "POST",
                            body: {
                                ...payload,
                                name: `Kedua ${token}`,
                            },
                            expected: 201,
                        })
                    ).data;

                    const firstPage = await request(
                        `/cms/topics?search=${token}&category=${firstCategory.slug}&subcategory=${firstSubcategory.slug}&status=inactive&limit=1`,
                    );
                    const secondPage = await request(
                        `/cms/topics?search=${token}&category=${firstCategory.slug}&subcategory=${firstSubcategory.slug}&status=inactive&limit=1&page=2`,
                    );
                    const descriptionSearch = await request(
                        `/cms/topics?search=${encodeURIComponent(`DESKRIPSI KHUSUS ${token}`)}`,
                    );

                    assert.equal(firstPage.meta.totalItems, 2);
                    assert.equal(typeof firstPage.meta.totalItems, "number");
                    assert.equal(firstPage.meta.hasNextPage, true);
                    assert.equal(secondPage.meta.hasPreviousPage, true);
                    assert.deepEqual(
                        [firstPage.data[0].id, secondPage.data[0].id],
                        [topic.id, second.id],
                    );
                    assert.equal(descriptionSearch.meta.totalItems, 2);
                },
            );

            await t.test(
                "edit moves parent and preserves slug",
                async () => {
                    const result = await request(`/cms/topics/${topic.id}`, {
                        method: "PATCH",
                        body: {
                            subcategoryId: secondSubcategory.id,
                            name: `Nama baru ${token}`,
                            description: "Deskripsi baru",
                            sortOrder: 7,
                            isActive: true,
                        },
                    });

                    assert.equal(result.data.slug, topic.slug);
                    assert.equal(
                        result.data.subcategory.id,
                        secondSubcategory.id,
                    );
                    assert.equal(result.data.category.id, secondCategory.id);
                    assert.equal(result.data.name, `Nama baru ${token}`);
                    assert.equal(result.data.description, "Deskripsi baru");
                    assert.equal(result.data.sortOrder, topic.sortOrder);
                    assert.equal(result.data.isActive, true);
                },
            );

            await t.test(
                "public endpoint only returns active topics",
                async () => {
                    const active = await request(
                        `/subcategories/${secondSubcategory.slug}/topics`,
                    );
                    assert.ok(
                        active.data.topics.some((item) => item.id === topic.id),
                    );

                    await request(`/cms/topics/${topic.id}`, {
                        method: "PATCH",
                        body: { isActive: false },
                    });
                    const inactive = await request(
                        `/subcategories/${secondSubcategory.slug}/topics`,
                    );
                    assert.equal(
                        inactive.data.topics.some(
                            (item) => item.id === topic.id,
                        ),
                        false,
                    );
                },
            );

            await t.test(
                "rejects invalid payloads, immutable fields, IDs and filters",
                async () => {
                    for (const body of [
                        {},
                        { ...payload, subcategoryId: true },
                        { ...payload, subcategoryId: 2147483648 },
                        { ...payload, name: "x" },
                        { ...payload, name: "x".repeat(151) },
                        { ...payload, description: {} },
                        { ...payload, sortOrder: -1 },
                        { ...payload, sortOrder: 1.5 },
                        { ...payload, sortOrder: 2147483648 },
                        { ...payload, isActive: "true" },
                        { ...payload, sourceId: 123 },
                        { ...payload, slug: "manual" },
                    ]) {
                        await request("/cms/topics", {
                            method: "POST",
                            body,
                            expected: 400,
                        });
                    }

                    for (const body of [
                        { slug: "slug-baru" },
                        { sourceId: 123 },
                        { subcategoryId: 2147483647 },
                        { description: {} },
                        { sortOrder: -1 },
                        { isActive: "false" },
                        {},
                    ]) {
                        await request(`/cms/topics/${topic.id}`, {
                            method: "PATCH",
                            body,
                            expected: 400,
                        });
                    }

                    await request("/cms/topics", {
                        method: "POST",
                        body: payload,
                        expected: 409,
                    });
                    for (const path of [
                        "/cms/topics/no-id",
                        "/cms/topics/0",
                        "/cms/topics/2147483648",
                        "/cms/topics?page=0",
                        "/cms/topics?page=1.5",
                        "/cms/topics?limit=51",
                        "/cms/topics?status=other",
                    ]) {
                        await request(path, { expected: 400 });
                    }
                    await request("/cms/topics/2147483647", { expected: 404 });
                },
            );

            await t.test("delete protection retains its FAQ", async () => {
                const faq = (
                    await client.query(
                        "INSERT INTO faqs (topic_id, question, answer, is_published) VALUES ($1, $2, 'Jawaban', true) RETURNING id",
                        [topic.id, `Pertanyaan ${token}`],
                    )
                ).rows[0];
                const result = await request(`/cms/topics/${topic.id}`, {
                    method: "DELETE",
                    expected: 409,
                });

                assert.deepEqual(result.data, { faqCount: 1 });
                assert.equal(
                    (
                        await client.query(
                            "SELECT id FROM faq_topics WHERE id = $1",
                            [topic.id],
                        )
                    ).rowCount,
                    1,
                );
                assert.equal(
                    (
                        await client.query("SELECT id FROM faqs WHERE id = $1", [
                            faq.id,
                        ])
                    ).rowCount,
                    1,
                );
            });

            await t.test("delete removes only a test topic without FAQs", async () => {
                const deletable = (
                    await request("/cms/topics", {
                        method: "POST",
                        body: {
                            ...payload,
                            name: `Boleh dihapus ${token}`,
                        },
                        expected: 201,
                    })
                ).data;

                await request(`/cms/topics/${deletable.id}`, {
                    method: "DELETE",
                });
                createdIds.delete(deletable.id);
                await request(`/cms/topics/${deletable.id}`, { expected: 404 });
            });

            await client.query("ROLLBACK");
            assert.deepEqual(
                (await client.query("SELECT * FROM faq_topics ORDER BY id"))
                    .rows,
                baseline,
            );
        } finally {
            if (server) {
                await new Promise((resolve) => server.close(resolve));
            }
            await client.query("ROLLBACK");
            pool.query = originalQuery;
            client.release();
            await pool.end();
        }
    },
);
