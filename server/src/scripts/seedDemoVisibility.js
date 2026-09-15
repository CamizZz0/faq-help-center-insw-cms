import "dotenv/config";
import { eq } from "drizzle-orm";

import { db, pool } from "../config/db.js";
import { faqTopics, faqs } from "../models/schema.js";

/**
 * Seed data demo visibilitas FAQ untuk topik "Tracking PIB".
 *
 * BUKAN autentikasi: script ini hanya menyiapkan konten demo agar perbedaan
 * Guest dan User login (simulasi) terlihat jelas.
 * TODO(auth): data tetap valid setelah autentikasi resmi tersedia; yang
 * wajib diganti adalah mekanisme penentuan role (sesi/JWT di backend).
 *
 * Idempoten: upsert berdasarkan `question` sehingga aman dijalankan ulang.
 * 3 FAQ public hasil impor (id sumber) tidak diubah.
 *
 * Cara menjalankan:
 *   cd faq-help-center-insw-cms/server
 *   npm run seed:demo-visibility
 */

const TOPIC_SLUG = "tracking-pib";

const demoFaqs = [
    // --- 2 FAQ authenticated (published) ---
    {
        question:
            "Bagaimana memperbarui data profil perusahaan untuk layanan PIB?",
        answer: "<p>Perbarui data profil perusahaan melalui menu profil pada layanan PIB, lalu simpan perubahan dan tunggu verifikasi.</p>",
        visibility: "authenticated",
        isPublished: true,
        sortOrder: 10,
    },
    {
        question: "Bagaimana melihat riwayat pengajuan dokumen perusahaan?",
        answer: "<p>Riwayat pengajuan dokumen perusahaan dapat dilihat pada halaman riwayat layanan PIB setelah masuk.</p>",
        visibility: "authenticated",
        isPublished: true,
        sortOrder: 11,
    },
    // --- 1 FAQ draft (tidak dianggap publik) ---
    {
        question: "Draf internal: alur eskalasi status tracking PIB",
        answer: "<p>Draf internal yang masih dalam peninjauan.</p>",
        visibility: "authenticated",
        isPublished: false,
        sortOrder: 13,
    },
];

async function seedDemoVisibility() {
    try {
        const [topic] = await db
            .select({ id: faqTopics.id })
            .from(faqTopics)
            .where(eq(faqTopics.slug, TOPIC_SLUG))
            .limit(1);

        if (!topic) {
            throw new Error(
                `Topik "${TOPIC_SLUG}" tidak ditemukan. Jalankan seed dan impor terlebih dahulu.`,
            );
        }

        for (const demo of demoFaqs) {
            const [existing] = await db
                .select({ id: faqs.id })
                .from(faqs)
                .where(eq(faqs.question, demo.question))
                .limit(1);

            if (existing) {
                await db
                    .update(faqs)
                    .set({
                        topicId: topic.id,
                        answer: demo.answer,
                        visibility: demo.visibility,
                        isPublished: demo.isPublished,
                        sortOrder: demo.sortOrder,
                        updatedAt: new Date(),
                    })
                    .where(eq(faqs.id, existing.id));

                console.log(`Diperbarui: ${demo.question}`);
            } else {
                await db.insert(faqs).values({
                    sourceId: null,
                    topicId: topic.id,
                    question: demo.question,
                    answer: demo.answer,
                    visibility: demo.visibility,
                    isPublished: demo.isPublished,
                    isPopular: false,
                    sortOrder: demo.sortOrder,
                });

                console.log(`Ditambahkan: ${demo.question}`);
            }
        }

        console.log("Seed demo visibilitas selesai.");
    } catch (error) {
        console.error("Seed demo visibilitas gagal:", error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

seedDemoVisibility();
