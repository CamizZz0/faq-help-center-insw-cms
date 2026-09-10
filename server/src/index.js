import "dotenv/config";
import express from "express";
import cors from "cors";

import { pool } from "./config/db.js";
import { GUIDE_UPLOAD_DIR } from "./services/guideFiles.js";

import categoryRoutes from "./routes/categoryRoutes.js";
import subcategoryRoutes from "./routes/subcategoryRoutes.js";
import topicRoutes from "./routes/topicRoutes.js";
import faqRoutes from "./routes/faqRoutes.js";
import guideRoutes from "./routes/guideRoutes.js";
import tutorialRoutes from "./routes/tutorialRoutes.js";
import cmsFaqRoutes from "./routes/cmsFaqRoutes.js";
import cmsCategoryRoutes from "./routes/cmsCategoryRoutes.js";
import cmsGuideRoutes from "./routes/cmsGuideRoutes.js";

const app = express();

const PORT = process.env.PORT || 5001;

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "http://localhost:5174",
        ],

        methods: [
            "GET",
            "POST",
            "PATCH",
            "PUT",
            "DELETE",
            "OPTIONS",
        ],

        allowedHeaders: [
            "Content-Type",
        ],
    })
);

app.use(express.json());
app.use("/uploads/guides", express.static(GUIDE_UPLOAD_DIR, {
    dotfiles: "deny",
    index: false,
    setHeaders(res) { res.setHeader("X-Content-Type-Options", "nosniff"); },
}));

app.use("/api/categories", categoryRoutes);
app.use("/api/subcategories", subcategoryRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/cms/categories", cmsCategoryRoutes);
app.use("/api/cms/guides", cmsGuideRoutes);
app.use("/api/guides", guideRoutes);
app.use("/api/tutorials", tutorialRoutes);

app.use("/api/cms/faqs", cmsFaqRoutes);

app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT NOW() AS database_time"
        );

        res.status(200).json({
            success: true,
            message:
                "API dan PostgreSQL berhasil terhubung",
            databaseTime:
                result.rows[0].database_time,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message:
                "Gagal terhubung ke PostgreSQL",
        });
    }
});

app.listen(PORT, () => {
    console.log(
        `Server berjalan di http://localhost:${PORT}`
    );
});
