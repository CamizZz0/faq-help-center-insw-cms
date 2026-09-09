import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const db = drizzle({
    client: pool,
});

pool.on("error", (error) => {
    console.error("Koneksi PostgreSQL bermasalah:", error);
});

export { db, pool };