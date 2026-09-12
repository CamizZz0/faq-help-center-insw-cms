import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { pool } from "../src/config/db.js";
import cmsTutorialRoutes from "../src/routes/cmsTutorialRoutes.js";
import tutorialRoutes from "../src/routes/tutorialRoutes.js";

test("Tutorial CMS CRUD and public integration (transaction rollback)", { timeout: 30000 }, async (t) => {
    const client = await pool.connect();
    const originalQuery = pool.query;
    let server;
    const token = `tutorial-test-${Date.now()}`;
    const createdIds = new Set();
    try {
        await client.query("BEGIN");
        const baseline = (await client.query("SELECT * FROM tutorials ORDER BY id")).rows;
        pool.query = (...args) => client.query(...args);

        const app = express();
        app.use(express.json());
        app.use("/api/cms/tutorials", cmsTutorialRoutes);
        app.use("/api/tutorials", tutorialRoutes);
        server = app.listen(0, "127.0.0.1");
        await once(server, "listening");
        const base = `http://127.0.0.1:${server.address().port}/api`;

        async function request(path, { method = "GET", body, expected = 200 } = {}) {
            if (method === "DELETE") assert.ok(createdIds.has(Number(path.split("/").at(-1))), "Delete only test-created tutorials");
            await client.query("SAVEPOINT tutorial_request");
            const response = await fetch(`${base}${path}`, {
                method,
                headers: body === undefined ? undefined : { "Content-Type": "application/json" },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
            const result = await response.json();
            if (response.status >= 400) await client.query("ROLLBACK TO SAVEPOINT tutorial_request");
            await client.query("RELEASE SAVEPOINT tutorial_request");
            assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
            assert.equal(result.success, expected < 400);
            if (method === "POST" && response.status === 201) createdIds.add(result.data.id);
            return result;
        }

        const legacyCategory = (await client.query(
            "INSERT INTO categories (name, slug, is_active) VALUES ($1, $2, false) RETURNING id",
            [`Legacy ${token}`, `legacy-${token}`],
        )).rows[0];

        const basePayload = {
            title: `${token} Video`,
            description: `${token} deskripsi`,
            videoUrl: "https://youtu.be/dQw4w9WgXcQ",
            isPublished: false,
        };
        let tutorial;

        await t.test("create draft normalizes URL and creates thumbnail", async () => {
            tutorial = (await request("/cms/tutorials", { method: "POST", body: basePayload, expected: 201 })).data;
            assert.equal(tutorial.slug, `${token}-video`);
            assert.equal(tutorial.videoUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
            assert.equal(tutorial.thumbnailUrl, "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
            assert.equal(tutorial.categoryId, null);
            assert.equal(tutorial.durationSeconds, null);
            assert.equal((await request(`/cms/tutorials/${tutorial.id}`)).data.title, basePayload.title);
        });

        await t.test("draft is visible in CMS filters and hidden publicly", async () => {
            const cms = await request(`/cms/tutorials?search=${token}&category=ignored&status=draft`);
            assert.equal(cms.meta.totalItems, 1);
            assert.equal("category" in cms.data[0], false);
            const unfiltered = await request("/tutorials?limit=50");
            const withIgnoredCategory = await request("/tutorials?limit=50&category=ignored");
            assert.equal(withIgnoredCategory.meta.totalItems, unfiltered.meta.totalItems);
            await request(`/tutorials/${tutorial.slug}`, { expected: 404 });
        });

        await t.test("all supported YouTube formats normalize", async () => {
            const urls = [
                "https://www.youtube.com/watch?v=M7lc1UVf-VE",
                "https://youtu.be/M7lc1UVf-VE",
                "https://www.youtube.com/embed/M7lc1UVf-VE",
                "https://www.youtube.com/shorts/M7lc1UVf-VE",
            ];
            for (const [index, videoUrl] of urls.entries()) {
                const item = (await request("/cms/tutorials", { method: "POST", body: { ...basePayload, title: `${token} Format ${index}`, videoUrl }, expected: 201 })).data;
                assert.equal(item.videoUrl, "https://www.youtube.com/watch?v=M7lc1UVf-VE");
                assert.equal(item.thumbnailUrl, "https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg");
            }
        });

        await t.test("edit keeps slug and regenerates thumbnail from changed video", async () => {
            const result = await request(`/cms/tutorials/${tutorial.id}`, { method: "PATCH", body: {
                title: `${token} Judul Baru`, videoUrl: "https://www.youtube.com/embed/M7lc1UVf-VE", durationSeconds: 999, categoryId: 2147483647,
            } });
            assert.equal(result.data.slug, tutorial.slug);
            assert.equal(result.data.thumbnailUrl, "https://img.youtube.com/vi/M7lc1UVf-VE/hqdefault.jpg");
            assert.equal(result.data.durationSeconds, null);
            assert.equal(result.data.categoryId, null);
        });

        await t.test("publish makes tutorial available publicly", async () => {
            await request(`/cms/tutorials/${tutorial.id}`, { method: "PATCH", body: { isPublished: true } });
            const list = await request(`/tutorials?limit=50`);
            assert.ok(list.data.some((item) => item.id === tutorial.id));
            assert.equal((await request(`/tutorials/${tutorial.slug}`)).data.id, tutorial.id);
        });

        await t.test("edit preserves legacy category and duration", async () => {
            const legacy = (await client.query(
                "INSERT INTO tutorials (category_id, title, slug, video_url, duration_seconds) VALUES ($1, $2, $3, $4, 125) RETURNING id",
                [legacyCategory.id, `${token} Legacy`, `${token}-legacy`, "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
            )).rows[0];
            createdIds.add(legacy.id);
            const edited = (await request(`/cms/tutorials/${legacy.id}`, { method: "PATCH", body: {
                title: `${token} Legacy Baru`, categoryId: null, durationSeconds: null,
            } })).data;
            assert.equal(edited.categoryId, legacyCategory.id);
            assert.equal(edited.durationSeconds, 125);
        });

        await t.test("reject invalid payloads, IDs, filters, and slug conflict", async () => {
            for (const body of [
                {}, { title: "ab" }, { title: "x".repeat(201) }, { videoUrl: "http://youtu.be/dQw4w9WgXcQ" },
                { videoUrl: "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ" }, { videoUrl: "https://www.youtube.com/watch?v=short" },
                { thumbnailUrl: "https://example.com/image.jpg" },
                { sortOrder: -1 }, { isPublished: "true" }, { slug: "changed" },
            ]) await request(`/cms/tutorials/${tutorial.id}`, { method: "PATCH", body, expected: 400 });
            await request("/cms/tutorials", { method: "POST", body: basePayload, expected: 409 });
            await request("/cms/tutorials", { method: "POST", body: { ...basePayload, title: `${token} Urutan ditolak`, sortOrder: 1 }, expected: 400 });
            for (const path of ["/cms/tutorials/no-id", "/cms/tutorials/0", "/cms/tutorials?page=0", "/cms/tutorials?limit=51", "/cms/tutorials?status=other"]) await request(path, { expected: 400 });
            await request("/cms/tutorials/2147483647", { expected: 404 });
        });

        await t.test("delete is limited to records created in this test", async () => {
            for (const id of [...createdIds]) {
                await request(`/cms/tutorials/${id}`, { method: "DELETE" });
                await request(`/cms/tutorials/${id}`, { expected: 404 });
            }
        });

        await client.query("ROLLBACK");
        assert.deepEqual((await client.query("SELECT * FROM tutorials ORDER BY id")).rows, baseline);
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        await client.query("ROLLBACK");
        pool.query = originalQuery;
        client.release();
        await pool.end();
    }
});
