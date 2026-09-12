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
import searchRoutes from "./routes/searchRoutes.js";
import cmsFaqRoutes from "./routes/cmsFaqRoutes.js";
import cmsCategoryRoutes from "./routes/cmsCategoryRoutes.js";
import cmsSubcategoryRoutes from "./routes/cmsSubcategoryRoutes.js";
import cmsGuideRoutes from "./routes/cmsGuideRoutes.js";
import cmsTutorialRoutes from "./routes/cmsTutorialRoutes.js";

import { supabase } from "./config/supabase.js";

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
app.use("/api/cms/subcategories", cmsSubcategoryRoutes);
app.use("/api/cms/guides", cmsGuideRoutes);
app.use("/api/cms/tutorials", cmsTutorialRoutes);
app.use("/api/guides", guideRoutes);
app.use("/api/tutorials", tutorialRoutes);
app.use("/api/search", searchRoutes);

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

app.get("/api/health/storage", async (req, res) => {
    try {
        const bucketName =
            process.env.SUPABASE_GUIDES_BUCKET ?? "guides";

        const { data, error } =
            await supabase.storage.getBucket(bucketName);

        if (error) {
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: "Supabase Storage berhasil terhubung",
            bucket: {
                id: data.id,
                name: data.name,
                public: data.public,
            },
        });
    } catch (error) {
        console.error(
            "Gagal terhubung ke Supabase Storage:",
            error,
        );

        return res.status(500).json({
            success: false,
            message: "Supabase Storage gagal terhubung",
            error: error.message,
        });
    }
});

app.listen(PORT, () => {
    console.log(
        `Server berjalan di http://localhost:${PORT}`
    );
});
