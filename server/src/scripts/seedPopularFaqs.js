import { inArray } from "drizzle-orm";

import { db } from "../config/db.js";
import { faqs } from "../models/schema.js";

const popularQuestions = [
    "Pemberitahuan Impor Barang (PIB)",
    "Tracking Pemberitahuan Impor Barang (PIB)",
    "Apa maksud dari NSW Reject dan BC Reject di status tracking dokumen saya",
];

async function seedPopularFaqs() {
    try {
        const updatedFaqs = await db
            .update(faqs)
            .set({
                isPopular: true,
                updatedAt: new Date(),
            })
            .where(
                inArray(faqs.question, popularQuestions)
            )
            .returning({
                id: faqs.id,
                question: faqs.question,
                isPopular: faqs.isPopular,
            });

        console.log(
            `${updatedFaqs.length} FAQ berhasil ditandai populer.`
        );

        console.table(updatedFaqs);
        process.exit(0);
    } catch (error) {
        console.error("Gagal menandai FAQ populer:", error);
        process.exit(1);
    }
}

seedPopularFaqs();