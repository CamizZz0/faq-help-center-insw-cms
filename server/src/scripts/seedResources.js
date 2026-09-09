import { db } from "../config/db.js";
import {
    categories,
    guides,
    tutorials,
} from "../models/schema.js";

const guideData = [
    {
        categorySlug: "registrasi-akun",
        title: "User Manual Registrasi Akun",
        slug: "user-manual-registrasi-akun",
        description:
            "Panduan registrasi akun bagi pengguna layanan INSW.",
        fileUrl:
            "https://api.insw.go.id/assets/upload/cms/1689301027635_cms.pdf",
        thumbnailUrl: null,
        sortOrder: 1,
    },
    {
        categorySlug: "impor-kepabeanan",
        title: "User Manual DO/SP2",
        slug: "user-manual-do-sp2",
        description:
            "Petunjuk penggunaan aplikasi Delivery Order dan Surat Penyerahan Peti Kemas.",
        fileUrl:
            "https://api.insw.go.id/assets/upload/cms/1662005234026_cms.pdf",
        thumbnailUrl: null,
        sortOrder: 2,
    },
    {
        categorySlug: "impor-kepabeanan",
        title: "Panduan Teknis SSM QC",
        slug: "panduan-teknis-ssm-qc",
        description:
            "Panduan penggunaan layanan Single Submission Quarantine Customs.",
        fileUrl:
            "https://api.insw.go.id/assets/upload/cms/1701140190562_cms.pdf",
        thumbnailUrl: null,
        sortOrder: 3,
    },
];

const tutorialData = [
    {
        categorySlug: "registrasi-akun",
        title: "Registrasi INSW",
        slug: "registrasi-insw",
        description:
            "Tutorial melakukan registrasi pengguna pada sistem INSW.",
        videoUrl:
            "https://www.youtube.com/watch?v=yy7Rit_BeeY",
        thumbnailUrl:
            "https://img.youtube.com/vi/yy7Rit_BeeY/hqdefault.jpg",
        durationSeconds: null,
        sortOrder: 1,
    },
    {
        categorySlug: "registrasi-akun",
        title: "Panduan Passkeys di SSO INSW",
        slug: "panduan-passkeys-sso-insw",
        description:
            "Tutorial penggunaan passkeys untuk akses SSO INSW.",
        videoUrl:
            "https://www.youtube.com/watch?v=TQTen3_wF3M",
        thumbnailUrl:
            "https://img.youtube.com/vi/TQTen3_wF3M/hqdefault.jpg",
        durationSeconds: null,
        sortOrder: 2,
    },
    {
        categorySlug: "impor-kepabeanan",
        title: "Penelusuran Dokumen Pabean",
        slug: "penelusuran-dokumen-pabean",
        description:
            "Tutorial melakukan tracking dokumen pabean melalui INSW.",
        videoUrl:
            "https://www.youtube.com/watch?v=QdXWQL8JZNc",
        thumbnailUrl:
            "https://img.youtube.com/vi/QdXWQL8JZNc/hqdefault.jpg",
        durationSeconds: null,
        sortOrder: 3,
    },
];

async function seedResources() {
    try {
        const categoryRows = await db
            .select({
                id: categories.id,
                slug: categories.slug,
            })
            .from(categories);

        const categoryIds = new Map(
            categoryRows.map((category) => [
                category.slug,
                category.id,
            ])
        );

        for (const guide of guideData) {
            const categoryId = categoryIds.get(
                guide.categorySlug
            );

            await db
                .insert(guides)
                .values({
                    categoryId,
                    title: guide.title,
                    slug: guide.slug,
                    description: guide.description,
                    fileUrl: guide.fileUrl,
                    thumbnailUrl: guide.thumbnailUrl,
                    sortOrder: guide.sortOrder,
                    isPublished: true,
                })
                .onConflictDoUpdate({
                    target: guides.slug,
                    set: {
                        categoryId,
                        title: guide.title,
                        description: guide.description,
                        fileUrl: guide.fileUrl,
                        thumbnailUrl: guide.thumbnailUrl,
                        sortOrder: guide.sortOrder,
                        isPublished: true,
                        updatedAt: new Date(),
                    },
                });
        }

        for (const tutorial of tutorialData) {
            const categoryId = categoryIds.get(
                tutorial.categorySlug
            );

            await db
                .insert(tutorials)
                .values({
                    categoryId,
                    title: tutorial.title,
                    slug: tutorial.slug,
                    description: tutorial.description,
                    videoUrl: tutorial.videoUrl,
                    thumbnailUrl:
                        tutorial.thumbnailUrl,
                    durationSeconds:
                        tutorial.durationSeconds,
                    sortOrder: tutorial.sortOrder,
                    isPublished: true,
                })
                .onConflictDoUpdate({
                    target: tutorials.slug,
                    set: {
                        categoryId,
                        title: tutorial.title,
                        description:
                            tutorial.description,
                        videoUrl: tutorial.videoUrl,
                        thumbnailUrl:
                            tutorial.thumbnailUrl,
                        durationSeconds:
                            tutorial.durationSeconds,
                        sortOrder: tutorial.sortOrder,
                        isPublished: true,
                        updatedAt: new Date(),
                    },
                });
        }

        console.log(
            `${guideData.length} panduan dan ${tutorialData.length} tutorial berhasil dimasukkan.`
        );

        process.exit(0);
    } catch (error) {
        console.error(
            "Seed panduan dan tutorial gagal:",
            error
        );

        process.exit(1);
    }
}

seedResources();