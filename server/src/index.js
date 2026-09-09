import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./config/db.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import subcategoryRoutes from "./routes/subcategoryRoutes.js";
import topicRoutes from "./routes/topicRoutes.js";
import faqRoutes from "./routes/faqRoutes.js";
import guideRoutes from "./routes/guideRoutes.js";
import tutorialRoutes from "./routes/tutorialRoutes.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(
    cors({
        origin: process.env.CLIENT_URL,
    }),
);

app.use(express.json());
app.use("/api/categories", categoryRoutes);
app.use("/api/subcategories", subcategoryRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/guides", guideRoutes);
app.use("/api/tutorials", tutorialRoutes);

app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS database_time");

        res.status(200).json({
            success: true,
            message: "API dan PostgreSQL berhasil terhubung",
            databaseTime: result.rows[0].database_time,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Gagal terhubung ke PostgreSQL",
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});