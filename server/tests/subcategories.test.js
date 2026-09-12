import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { pool } from "../src/config/db.js";
import { removeHelpCenterIcon } from "../src/services/iconStorageService.js";
import categoryRoutes from "../src/routes/categoryRoutes.js";
import cmsSubcategoryRoutes from "../src/routes/cmsSubcategoryRoutes.js";

/*
 * Delapan byte pertama sudah cukup untuk lolos pemeriksaan
 * signature PNG di middleware upload.
 */
const PNG_BYTES = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

function iconBlob(type = "image/png", name = "icon.png") {
    return [
        new Blob([PNG_BYTES], { type }),
        name,
    ];
}

function toForm(fields, { withIcon = true } = {}) {
    const form = new FormData();

    Object.entries(fields).forEach(([key, value]) => {
        if (value === undefined) return;

        form.append(key, String(value));
    });

    if (withIcon) {
        form.append("icon", ...iconBlob());
    }

    return form;
}

test("Subcategory CMS CRUD and public integration (transaction rollback)", { timeout: 60000 }, async (t) => {
    const client = await pool.connect();
    const originalQuery = pool.query;
    let server;
    const token = `subcategory-test-${Date.now()}`;
    const createdIds = new Set();
    const uploadedIconPaths = new Set();

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

        async function request(path, { method = "GET", body, form, expected = 200 } = {}) {
            if (method === "DELETE") {
                assert.ok(createdIds.has(Number(path.split("/").at(-1))), "Delete only test-created subcategories");
            }

            const isForm = form instanceof FormData;

            await client.query("SAVEPOINT subcategory_request");
            const response = await fetch(`${base}${path}`, {
                method,
                headers: isForm || body === undefined
                    ? undefined
                    : { "Content-Type": "application/json" },
                body: isForm
                    ? form
                    : body === undefined
                        ? undefined
                        : JSON.stringify(body),
            });
            const result = await response.json();

            if (response.status >= 400) {
                await client.query("ROLLBACK TO SAVEPOINT subcategory_request");
            }
            await client.query("RELEASE SAVEPOINT subcategory_request");

            assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
            assert.equal(result.success, expected < 400);
            if (method === "POST" && response.status === 201) createdIds.add(result.data.id);
            if (result?.data?.iconPath) uploadedIconPaths.add(result.data.iconPath);
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
            isActive: false,
        };
        let subcategory;

        await t.test("create generates a slug, stores the icon, and returns complete relations", async () => {
            subcategory = (await request("/cms/subcategories", {
                method: "POST",
                form: toForm(payload),
                expected: 201,
            })).data;

            assert.equal(subcategory.slug, `layanan-${token}`);
            assert.equal(subcategory.category.id, firstCategory.id);
            assert.equal(subcategory.sortOrder, 1);
            assert.equal(subcategory.isActive, false);
            assert.equal(subcategory.topicCount, 0);
            assert.equal(typeof subcategory.iconUrl, "string");
            assert.match(subcategory.iconUrl, /^https?:\/\//);
            assert.match(subcategory.iconPath, /^subcategories\//);
            assert.equal((await request(`/cms/subcategories/${subcategory.id}`)).data.id, subcategory.id);
        });

        await t.test("icon is required on create and only raster images are accepted", async () => {
            await request("/cms/subcategories", {
                method: "POST",
                form: toForm({ ...payload, name: `Tanpa ikon ${token}` }, { withIcon: false }),
                expected: 400,
            });

            const svgForm = new FormData();
            svgForm.append("categoryId", String(firstCategory.id));
            svgForm.append("name", `Ikon svg ${token}`);
            svgForm.append(
                "icon",
                ...iconBlob("image/svg+xml", "icon.svg"),
            );

            await request("/cms/subcategories", {
                method: "POST",
                form: svgForm,
                expected: 400,
            });

            await request("/cms/subcategories", {
                method: "POST",
                form: toForm({ ...payload, name: `Ikon url ${token}`, iconUrl: "https://example.com/a.png" }),
                expected: 400,
            });
        });

        await t.test("list supports title search, category/status filters, and pagination", async () => {
            const second = (await request("/cms/subcategories", {
                method: "POST",
                form: toForm({ ...payload, name: `Layanan kedua ${token}` }),
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
                form: toForm({
                    categoryId: secondCategory.id,
                    name: `Nama baru ${token}`,
                    description: "Deskripsi baru",
                    icon: "folder-tree",
                    sortOrder: 7,
                    isActive: true,
                }, { withIcon: false }),
            });

            assert.equal(result.data.slug, subcategory.slug);
            assert.equal(result.data.category.id, secondCategory.id);
            assert.equal(result.data.name, `Nama baru ${token}`);
            assert.equal(result.data.description, "Deskripsi baru");
            assert.equal(result.data.icon, "folder-tree");
            assert.equal(result.data.sortOrder, subcategory.sortOrder);
            assert.equal(result.data.isActive, true);
            assert.equal(result.data.iconPath, subcategory.iconPath);
        });

        await t.test("edit without a new file keeps the old icon and a new file replaces it", async () => {
            const replaced = (await request(`/cms/subcategories/${subcategory.id}`, {
                method: "PATCH",
                form: toForm({ name: `Ikon baru ${token}` }),
            })).data;

            assert.notEqual(replaced.iconPath, subcategory.iconPath);
            assert.equal(replaced.icon, "folder-tree");
            assert.equal(replaced.name, `Ikon baru ${token}`);

            subcategory = replaced;
        });

        await t.test("public endpoint only returns active subcategories in their category", async () => {
            const active = await request(`/categories/${secondCategory.slug}/subcategories`);
            const publicSubcategory = active.data.subcategories.find((item) => item.id === subcategory.id);

            assert.ok(publicSubcategory);
            assert.equal(typeof publicSubcategory.iconUrl, "string");
            assert.equal(publicSubcategory.iconPath, undefined);

            await request(`/cms/subcategories/${subcategory.id}`, {
                method: "PATCH",
                form: toForm({ isActive: false }, { withIcon: false }),
            });
            const inactive = await request(`/categories/${secondCategory.slug}/subcategories`);
            assert.equal(inactive.data.subcategories.some((item) => item.id === subcategory.id), false);
        });

        await t.test("rejects invalid payloads, immutable fields, IDs, and filters", async () => {
            for (const body of [
                {},
                { ...payload, categoryId: true },
                { ...payload, categoryId: "0" },
                { ...payload, categoryId: 2147483648 },
                { ...payload, name: "x" },
                { ...payload, name: "x".repeat(151) },
                { ...payload, icon: "x".repeat(101) },
                { ...payload, sortOrder: -1 },
                { ...payload, sortOrder: 2147483648 },
                { ...payload, sourceId: 123 },
            ]) {
                await request("/cms/subcategories", { method: "POST", form: toForm(body), expected: 400 });
            }

            for (const body of [
                { slug: "slug-baru" },
                { sourceId: 123 },
                { categoryId: 2147483647 },
                { icon: "x".repeat(101) },
                { sortOrder: -1 },
                { iconUrl: "https://example.com/a.png" },
                { iconPath: "subcategories/a.png" },
            ]) {
                await request(`/cms/subcategories/${subcategory.id}`, {
                    method: "PATCH",
                    form: toForm(body, { withIcon: false }),
                    expected: 400,
                });
            }

            await request("/cms/subcategories", {
                method: "POST",
                form: toForm(payload),
                expected: 409,
            });

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
                form: toForm({ ...payload, name: `Boleh dihapus ${token}` }),
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

        /*
         * Rollback database tidak menghapus file di Supabase,
         * jadi ikon uji dibersihkan di sini.
         */
        for (const iconPath of uploadedIconPaths) {
            await removeHelpCenterIcon(iconPath).catch((error) => {
                console.error("Gagal membersihkan ikon uji:", error.message);
            });
        }

        client.release();
        await pool.end();
    }
});
