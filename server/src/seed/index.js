import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../config/db.js";
import { categories, subcategories, faqTopics } from "../models/schema.js";

const categoryData = [
    {
        name: "Impor & Kepabeanan",
        slug: "impor-kepabeanan",
        description: "Informasi terkait proses impor dan kepabeanan.",
        icon: "package-import",
        sortOrder: 1,
    },
    {
        name: "Ekspor",
        slug: "ekspor",
        description: "Informasi terkait proses dan dokumen ekspor.",
        icon: "package-export",
        sortOrder: 2,
    },
    {
        name: "Registrasi & Akun",
        slug: "registrasi",
        description: "Informasi registrasi dan pengelolaan akun INSW.",
        icon: "user-round-plus",
        sortOrder: 3,
    },
    {
        name: "Portal INSW",
        slug: "portal-nsw",
        description: "Informasi penggunaan layanan dan fitur Portal INSW.",
        icon: "monitor-globe",
        sortOrder: 4,
    },
    {
        name: "Perizinan & Rekomendasi",
        slug: "perizinan-rekomendasi",
        description: "Informasi perizinan dan rekomendasi perdagangan.",
        icon: "clipboard-check",
        sortOrder: 5,
    },
    {
        name: "Fasilitas & Kawasan",
        slug: "fasilitas-kawasan",
        description: "Informasi fasilitas perdagangan dan kawasan.",
        icon: "building",
        sortOrder: 6,
    },
    {
        name: "Layanan Lainnya",
        slug: "layanan-lainnya",
        description: "Informasi layanan INSW lainnya.",
        icon: "layout-grid",
        sortOrder: 7,
    },
];

async function seedCategories() {
    for (const category of categoryData) {
        await db
            .insert(categories)
            .values(category)
            .onConflictDoUpdate({
                target: categories.slug,
                set: {
                    name: category.name,
                    description: category.description,
                    icon: category.icon,
                    sortOrder: category.sortOrder,
                    updatedAt: new Date(),
                },
            });
    }

    console.log("Seed kategori berhasil.");
}

async function seedImportSubcategories() {
    const [importCategory] = await db
        .select({
            id: categories.id,
        })
        .from(categories)
        .where(eq(categories.slug, "impor-kepabeanan"))
        .limit(1);

    if (!importCategory) {
        throw new Error("Kategori Impor & Kepabeanan tidak ditemukan.");
    }

    const importSubcategoryData = [
        {
            categoryId: importCategory.id,
            name: "PIB",
            slug: "pib",
            description: "Informasi mengenai Pemberitahuan Impor Barang.",
            icon: "file-text",
            sortOrder: 1,
        },
        {
            categoryId: importCategory.id,
            name: "DO Online/SP2",
            slug: "do-online-sp2",
            description: "Informasi layanan Delivery Order Online dan SP2.",
            icon: "file-check",
            sortOrder: 2,
        },
        {
            categoryId: importCategory.id,
            name: "SSM QC (Impor–Ekspor)",
            slug: "ssm-qc-impor-ekspor",
            description: "Informasi layanan SSM Quarantine Customs.",
            icon: "globe",
            sortOrder: 3,
        },
        {
            categoryId: importCategory.id,
            name: "BTKI 2022",
            slug: "btki-2022",
            description: "Informasi Buku Tarif Kepabeanan Indonesia 2022.",
            icon: "clipboard-check",
            sortOrder: 4,
        },
        {
            categoryId: importCategory.id,
            name: "Modul Pertek/Rekom",
            slug: "modul-pertek-rekom",
            description: "Informasi modul pertimbangan teknis dan rekomendasi.",
            icon: "folder",
            sortOrder: 5,
        },
    ];

    for (const subcategory of importSubcategoryData) {
        await db
            .insert(subcategories)
            .values(subcategory)
            .onConflictDoUpdate({
                target: subcategories.slug,
                set: {
                    categoryId: subcategory.categoryId,
                    name: subcategory.name,
                    description: subcategory.description,
                    icon: subcategory.icon,
                    sortOrder: subcategory.sortOrder,
                    updatedAt: new Date(),
                },
            });
    }

    console.log("Seed subkategori Impor berhasil.");
}

async function seedPibTopics() {
    const [pibSubcategory] = await db
        .select({
            id: subcategories.id,
        })
        .from(subcategories)
        .where(eq(subcategories.slug, "pib"))
        .limit(1);

    if (!pibSubcategory) {
        throw new Error("Subkategori PIB tidak ditemukan.");
    }

    const pibTopicData = [
        {
            subcategoryId: pibSubcategory.id,
            name: "Pendahuluan PIB",
            slug: "pendahuluan-pib",
            description: "Informasi dasar dan pengenalan mengenai PIB.",
            sortOrder: 1,
        },
        {
            subcategoryId: pibSubcategory.id,
            name: "Tracking PIB",
            slug: "tracking-pib",
            description: "Informasi pemantauan proses dan status pengajuan PIB.",
            sortOrder: 2,
        },
        {
            subcategoryId: pibSubcategory.id,
            name: "Reject Dokumen",
            slug: "reject-dokumen-pib",
            description: "Informasi penolakan dokumen dan penyelesaian kendala PIB.",
            sortOrder: 3,
        },
    ];

    for (const topic of pibTopicData) {
        await db
            .insert(faqTopics)
            .values(topic)
            .onConflictDoUpdate({
                target: faqTopics.slug,
                set: {
                    subcategoryId: topic.subcategoryId,
                    name: topic.name,
                    description: topic.description,
                    sortOrder: topic.sortOrder,
                    isActive: true,
                    updatedAt: new Date(),
                },
            });
    }

    console.log("Seed topik PIB berhasil.");
}

async function seedExportSubcategories() {
    const [exportCategory] = await db
        .select({
            id: categories.id,
        })
        .from(categories)
        .where(eq(categories.slug, "ekspor"))
        .limit(1);

    if (!exportCategory) {
        throw new Error("Kategori Ekspor tidak ditemukan.");
    }

    const exportSubcategoryData = [
        {
            categoryId: exportCategory.id,
            name: "PEB",
            slug: "peb",
            description:
                "Informasi mengenai Pemberitahuan Ekspor Barang.",
            icon: "file-text",
            sortOrder: 1,
        },
        {
            categoryId: exportCategory.id,
            name: "COO/SKA",
            slug: "coo-ska",
            description:
                "Informasi mengenai Certificate of Origin dan Surat Keterangan Asal.",
            icon: "badge-check",
            sortOrder: 2,
        },
    ];

    for (const subcategory of exportSubcategoryData) {
        await db
            .insert(subcategories)
            .values(subcategory)
            .onConflictDoUpdate({
                target: subcategories.slug,
                set: {
                    categoryId: subcategory.categoryId,
                    name: subcategory.name,
                    description: subcategory.description,
                    icon: subcategory.icon,
                    sortOrder: subcategory.sortOrder,
                    isActive: true,
                    updatedAt: new Date(),
                },
            });
    }

    console.log("Seed subkategori Ekspor berhasil.");
}

async function seed() {
    try {
        await seedCategories();

        await seedImportSubcategories();
        await seedPibTopics();

        await seedExportSubcategories();

        console.log("Seluruh proses seed berhasil.");
    } catch (error) {
        console.error("Proses seed gagal:", error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

seed();