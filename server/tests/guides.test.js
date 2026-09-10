import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { readdir, access } from "node:fs/promises";
import path from "node:path";
import { GUIDE_UPLOAD_DIR, removeGuideFile } from "../src/services/guideFiles.js";
import express from "express";
import { pool } from "../src/config/db.js";
import cmsGuideRoutes from "../src/routes/cmsGuideRoutes.js";
import guideRoutes from "../src/routes/guideRoutes.js";

// Run from server: node --test tests/guides.test.js
// Every database query uses one transaction, rolled back even when a test fails.
// DELETE requests target only guides created by this test, including its legacy fixture.
test("Panduan CMS CRUD and public integration (transaction rollback)", { timeout: 30000 }, async t => {
    const client = await pool.connect();
    const originalQuery = pool.query;
    let server;
    const token = `guide-test-${Date.now()}`;
    const createdIds = new Set();
    const testFiles = new Set();
    const listFiles = async () => (await readdir(GUIDE_UPLOAD_DIR).catch(error => { if (error.code === "ENOENT") return []; throw error; })).sort();
    const baselineFiles = await listFiles();
    const pdf = new Blob(["%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"], { type: "application/pdf" });
    let failUpdate = false;
    try {
        await client.query("BEGIN");
        const baseline = (await client.query("SELECT * FROM guides ORDER BY id")).rows;
        // Drizzle uses this pool instance; route queries stay in the test transaction.
        pool.query = (...args) => {
            if (failUpdate && /^update "guides"/i.test(args[0]?.text ?? args[0])) throw new Error("Simulated database failure");
            return client.query(...args);
        };
        const app = express();
        app.use(express.json());
        app.use("/uploads/guides", express.static(GUIDE_UPLOAD_DIR));
        app.use("/api/cms/guides", cmsGuideRoutes);
        app.use("/api/guides", guideRoutes);
        server = app.listen(0, "127.0.0.1");
        await once(server, "listening");
        const base = `http://127.0.0.1:${server.address().port}/api`;
        async function request(path, { method = "GET", body, expected = 200, file = method === "POST" ? pdf : null, filename = "panduan.pdf", field = "file" } = {}) {
            if (method === "DELETE") assert.ok(createdIds.has(Number(path.split("/").at(-1))), "Delete only test-created guides");
            await client.query("SAVEPOINT guide_request");
            let form;
            if (["POST", "PATCH"].includes(method)) {
                form = new FormData();
                for (const [key, value] of Object.entries(body ?? {})) form.append(key, value ?? "");
                if (file) form.append(field, file, filename);
            }
            const response = await fetch(`${base}${path}`, { method, body: form });
            const result = await response.json();
            if (result.data?.fileUrl?.startsWith("http://127.0.0.1:")) testFiles.add(new URL(result.data.fileUrl).pathname);
            if (response.status >= 400) await client.query("ROLLBACK TO SAVEPOINT guide_request");
            await client.query("RELEASE SAVEPOINT guide_request");
            assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
            assert.equal(result.success, expected < 400);
            if (method === "POST" && response.status === 201) createdIds.add(result.data.id);
            return result;
        }
        const category = (await client.query(
            "INSERT INTO categories (name, slug, is_active) VALUES ($1, $2, false) RETURNING id, slug",
            [token, token],
        )).rows[0];
        const payload = { title: `${token} Panduan & Dokumen`, description: `${token} deskripsi khusus`, sortOrder: 3, isPublished: false };
        let guide;
        await t.test("create draft without category; automatic slug and no thumbnail", async () => {
            guide = (await request("/cms/guides", { method: "POST", body: payload, expected: 201 })).data;
            assert.equal(guide.slug, `${token}-panduan-dokumen`);
            assert.equal(guide.categoryId, null);
            assert.equal(guide.isPublished, false);
            assert.equal("thumbnailUrl" in guide, false);
            assert.equal((await request(`/cms/guides/${guide.id}`)).data.title, payload.title);
        });
        await t.test("CMS draft filter and public draft exclusion including detail", async () => {
            const result = await request(`/cms/guides?search=${token}&status=draft`);
            assert.equal(result.meta.totalItems, 1);
            assert.equal(result.data[0].id, guide.id);
            assert.equal((await request(`/cms/guides?search=${token}&status=published`)).meta.totalItems, 0);
            await request(`/guides/${guide.slug}`, { expected: 404 });
        });
        await t.test("duplicate slug returns 409", async () => {
            const before = await listFiles();
            await request("/cms/guides", { method: "POST", body: payload, expected: 409 });
            assert.deepEqual(await listFiles(), before, "Failed insert cleans the uploaded file");
        });
        await t.test("update title preserves slug; optional inactive category is accepted", async () => {
            const result = await request(`/cms/guides/${guide.id}`, { method: "PATCH", body: { title: `${token} Judul baru`, categoryId: category.id } });
            assert.equal(result.data.slug, guide.slug);
            assert.equal(result.data.categoryId, category.id);
            assert.equal(result.data.fileUrl, guide.fileUrl);
            const filtered = await request(`/cms/guides?search=${token}&category=${category.slug}&status=draft`);
            assert.equal(filtered.meta.totalItems, 1);
            assert.equal(filtered.data[0].category.slug, category.slug);
            assert.equal((await request(`/guides?category=${category.slug}`)).meta.totalItems, 0);
        });
        await t.test("reject missing, image, fake PDF, oversized file and incorrect field", async () => {
            const before = await listFiles();
            for (const options of [
                { file: null },
                { file: new Blob(["image"], { type: "image/png" }), filename: "image.png" },
                { file: new Blob(["image"], { type: "application/pdf" }) },
                { file: new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "application/pdf" }) },
                { field: "document" },
            ]) await request("/cms/guides", { method: "POST", body: payload, expected: 400, ...options });
            assert.deepEqual(await listFiles(), before);
        });
        await t.test("failed update retains old PDF and cleans new PDF", async () => {
            const before = await listFiles();
            failUpdate = true;
            try { await request(`/cms/guides/${guide.id}`, { method: "PATCH", file: pdf, expected: 500 }); }
            finally { failUpdate = false; }
            assert.deepEqual(await listFiles(), before);
            assert.equal((await request(`/cms/guides/${guide.id}`)).data.fileUrl, guide.fileUrl);
        });
        await t.test("replacement removes old local PDF after database update", async () => {
            const oldUrl = guide.fileUrl;
            const result = await request(`/cms/guides/${guide.id}`, { method: "PATCH", file: pdf });
            guide.fileUrl = result.data.fileUrl;
            assert.notEqual(guide.fileUrl, oldUrl);
            assert.equal((await fetch(oldUrl)).status, 404);
            assert.equal((await fetch(guide.fileUrl)).status, 200);
        });
        await t.test("publish appears in public list and detail", async () => {
            await request(`/cms/guides/${guide.id}`, { method: "PATCH", body: { isPublished: true } });
            const result = await request(`/guides?category=${category.slug}`);
            assert.equal(result.meta.totalItems, 1);
            assert.equal(result.data[0].id, guide.id);
            assert.equal("thumbnailUrl" in result.data[0], false);
            assert.equal((await request(`/guides/${guide.slug}`)).data.id, guide.id);
            const download = await fetch(result.data[0].fileUrl);
            assert.equal(download.status, 200);
            assert.match(download.headers.get("content-type"), /application\/pdf/);
            assert.equal(await download.text(), await pdf.text());
        });
        await t.test("search description, category/status intersection, stable pagination", async () => {
            const second = (await request("/cms/guides", { method: "POST", body: { ...payload, title: `${token} Kedua`, categoryId: category.id, sortOrder: 3 }, expected: 201 })).data;
            const firstPage = await request(`/cms/guides?search=${token}&category=${category.slug}&limit=1`);
            const secondPage = await request(`/cms/guides?search=${token}&category=${category.slug}&limit=1&page=2`);
            assert.equal(firstPage.meta.totalItems, 2);
            assert.equal(firstPage.meta.hasNextPage, true);
            assert.equal(secondPage.meta.hasPreviousPage, true);
            assert.equal(firstPage.data[0].id, guide.id);
            assert.equal(secondPage.data[0].id, second.id);
            assert.equal((await request(`/cms/guides?search=${encodeURIComponent(`${token} deskripsi khusus`)}`)).meta.totalItems, 2);
            assert.equal((await request(`/cms/guides?search=${token}&category=nonexistent-${token}`)).meta.totalItems, 0);
            assert.equal((await request(`/cms/guides?search=${token}&status=published`)).meta.totalItems, 1);
            assert.equal((await request(`/guides?category=${category.slug}`)).meta.totalItems, 1);
        });
        await t.test("invalid payloads, URL protocols, relations and immutable slug", async () => {
            for (const body of [[], {}, { title: "ab" }, { title: "a".repeat(201) }, { fileUrl: "javascript:alert(1)" }, { fileUrl: "not-a-url" }, { fileUrl: "https://user:pass@example.com/file" }, { categoryId: true }, { categoryId: 2147483647 }, { sortOrder: -1 }, { sortOrder: 1.5 }, { sortOrder: null }, { isPublished: "invalid" }, { slug: "different-slug" }]) {
                await request(`/cms/guides/${guide.id}`, { method: "PATCH", body, expected: 400 });
            }
            await request("/cms/guides", { method: "POST", body: { ...payload, title: "!!!" }, expected: 400 });
        });
        await t.test("legacy external URL is retained on edit and never deleted as a local file", async () => {
            const externalUrl = `https://example.com${new URL(guide.fileUrl).pathname}`;
            const legacy = (await client.query("INSERT INTO guides (title, slug, file_url) VALUES ($1, $2, $3) RETURNING id", [token, `${token}-legacy`, externalUrl])).rows[0];
            createdIds.add(legacy.id);
            assert.equal((await request(`/cms/guides/${legacy.id}`, { method: "PATCH", body: { title: `${token} legacy` } })).data.fileUrl, externalUrl);
            await request(`/cms/guides/${legacy.id}`, { method: "DELETE" });
            createdIds.delete(legacy.id);
            await access(path.join(GUIDE_UPLOAD_DIR, new URL(guide.fileUrl).pathname.split("/").at(-1)));
        });
        await t.test("invalid IDs, status and pagination use JSON errors", async () => {
            for (const path of ["/cms/guides/no-id", "/cms/guides/0", "/cms/guides?status=invalid", "/cms/guides?page=1.5", "/cms/guides?limit=51", "/guides?page=0", "/guides?limit=1.5"]) await request(path, { expected: 400 });
            await request("/cms/guides/2147483647", { expected: 404 });
        });
        await t.test("unpublish hides public detail; category can be cleared", async () => {
            const result = await request(`/cms/guides/${guide.id}`, { method: "PATCH", body: { isPublished: false, categoryId: null } });
            assert.equal(result.data.categoryId, null);
            await request(`/guides/${guide.slug}`, { expected: 404 });
            assert.equal((await request(`/guides?category=${category.slug}`)).meta.totalItems, 0);
        });
        await t.test("delete only newly created guides", async () => {
            for (const id of createdIds) {
                await request(`/cms/guides/${id}`, { method: "DELETE" });
                await request(`/cms/guides/${id}`, { expected: 404 });
                await request(`/cms/guides/${id}`, { method: "DELETE", expected: 404 });
            }
        });
        await client.query("ROLLBACK");
        await t.test("existing guides unchanged after rollback", async () => {
            assert.deepEqual((await client.query("SELECT * FROM guides ORDER BY id")).rows, baseline);
            assert.equal((await client.query("SELECT id FROM categories WHERE slug = $1", [token])).rowCount, 0);
            assert.deepEqual(await listFiles(), baselineFiles, "Only test uploads were removed");
        });
    } finally {
        if (server) await new Promise(resolve => server.close(resolve));
        await client.query("ROLLBACK");
        for (const fileUrl of testFiles) await removeGuideFile(fileUrl);
        pool.query = originalQuery;
        client.release();
        await pool.end();
    }
});
