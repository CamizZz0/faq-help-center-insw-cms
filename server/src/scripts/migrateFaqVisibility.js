import "dotenv/config";

import { pool } from "../config/db.js";

async function migrateFaqVisibility() {
    try {
        const result = await pool.query(
            "UPDATE faqs SET visibility = 'authenticated' WHERE visibility = 'admin'",
        );

        console.log(
            `Migrasi visibilitas FAQ selesai: ${result.rowCount} data diperbarui.`,
        );
    } catch (error) {
        console.error("Migrasi visibilitas FAQ gagal:", error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

migrateFaqVisibility();
