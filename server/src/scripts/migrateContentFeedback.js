import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pool } from "../config/db.js";

/*
 * Menjalankan drizzle/0005_add_content_feedback.sql.
 *
 * SQL-nya sudah dibuat idempoten (IF NOT EXISTS + pengecekan baris yang
 * sudah tersalin), jadi skrip ini aman dijalankan berulang.
 */
const DIR = path.dirname(fileURLToPath(import.meta.url));
const BERKAS_SQL = path.resolve(DIR, "../../drizzle/0005_add_content_feedback.sql");

async function migrateContentFeedback() {
    try {
        const sql = fs.readFileSync(BERKAS_SQL, "utf8");

        await pool.query(sql);

        const { rows } = await pool.query(
            `SELECT content_type, count(*)::int AS total
             FROM content_feedback
             GROUP BY content_type
             ORDER BY content_type`,
        );

        const ringkasan = rows
            .map((row) => `${row.content_type}: ${row.total}`)
            .join(", ");

        console.log(
            `Migrasi content_feedback selesai. Isi tabel sekarang — ${ringkasan || "belum ada data"}.`,
        );
    } catch (error) {
        console.error("Migrasi content_feedback gagal:", error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

migrateContentFeedback();
