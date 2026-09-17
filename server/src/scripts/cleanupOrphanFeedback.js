import "dotenv/config";
import { pool } from "../config/db.js";

/*
 * Cleanup orphan content_feedback.
 * Polimorfik (faq/guide/tutorial) tanpa FK → feedback yatim jika konten dihapus.
 *
 * Usage:
 *   node src/scripts/cleanupOrphanFeedback.js            # dry-run (default)
 *   node src/scripts/cleanupOrphanFeedback.js --execute  # hapus beneran
 *   node src/scripts/cleanupOrphanFeedback.js --dry-run
 */

const args = process.argv.slice(2);
const isExecute = args.includes("--execute");

async function findOrphans(client) {
    const queries = [
        {
            type: "faq",
            sql: `SELECT cf.id, cf.content_type, cf.content_id, cf.is_helpful, LEFT(cf.reason,80) AS reason, cf.created_at
                  FROM content_feedback cf
                  WHERE cf.content_type='faq' AND NOT EXISTS (SELECT 1 FROM faqs f WHERE f.id=cf.content_id)`,
        },
        {
            type: "guide",
            sql: `SELECT cf.id, cf.content_type, cf.content_id, cf.is_helpful, LEFT(cf.reason,80) AS reason, cf.created_at
                  FROM content_feedback cf
                  WHERE cf.content_type='guide' AND NOT EXISTS (SELECT 1 FROM guides g WHERE g.id=cf.content_id)`,
        },
        {
            type: "tutorial",
            sql: `SELECT cf.id, cf.content_type, cf.content_id, cf.is_helpful, LEFT(cf.reason,80) AS reason, cf.created_at
                  FROM content_feedback cf
                  WHERE cf.content_type='tutorial' AND NOT EXISTS (SELECT 1 FROM tutorials t WHERE t.id=cf.content_id)`,
        },
    ];
    const result = {};
    for (const q of queries) {
        const { rows } = await client.query(q.sql);
        result[q.type] = rows;
    }
    return result;
}

async function deleteOrphans(client) {
    const delSql = `
        DELETE FROM content_feedback cf
        WHERE (cf.content_type='faq' AND NOT EXISTS (SELECT 1 FROM faqs f WHERE f.id=cf.content_id))
           OR (cf.content_type='guide' AND NOT EXISTS (SELECT 1 FROM guides g WHERE g.id=cf.content_id))
           OR (cf.content_type='tutorial' AND NOT EXISTS (SELECT 1 FROM tutorials t WHERE t.id=cf.content_id))
        RETURNING id, content_type, content_id
    `;
    const { rows } = await client.query(delSql);
    return rows;
}

async function main() {
    const client = await pool.connect();
    try {
        const orphans = await findOrphans(client);
        const total = Object.values(orphans).reduce((acc, arr) => acc + arr.length, 0);
        const ringkasan = Object.entries(orphans)
            .map(([k, v]) => `${k}: ${v.length}`)
            .join(", ");

        console.log(`[cleanupOrphanFeedback] Mode: ${isExecute ? "EXECUTE" : "DRY-RUN"} — ${ringkasan} — total ${total}`);

        for (const [type, rows] of Object.entries(orphans)) {
            if (rows.length === 0) continue;
            console.log(`  ${type}:`);
            for (const r of rows.slice(0, 20)) {
                console.log(`    - id=${r.id} content_id=${r.content_id} helpful=${r.is_helpful} reason="${(r.reason ?? "").slice(0, 60)}" created=${r.created_at?.toISOString?.() ?? r.created_at}`);
            }
            if (rows.length > 20) console.log(`    ... dan ${rows.length - 20} lagi`);
        }

        if (total === 0) {
            console.log("Tidak ada orphan, selesai.");
            return;
        }

        if (!isExecute) {
            console.log("\nDry-run selesai. Jalankan dengan --execute untuk menghapus.");
            return;
        }

        await client.query("BEGIN");
        const deleted = await deleteOrphans(client);
        await client.query("COMMIT");
        const delByType = deleted.reduce((acc, r) => {
            acc[r.content_type] = (acc[r.content_type] || 0) + 1;
            return acc;
        }, {});
        console.log(`Terhapus: ${deleted.length} baris — ${Object.entries(delByType).map(([k, v]) => `${k}:${v}`).join(", ")}`);
    } catch (error) {
        try { await pool.query("ROLLBACK"); } catch {}
        console.error("Gagal cleanup orphan:", error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

main();
