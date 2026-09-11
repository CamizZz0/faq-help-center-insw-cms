import crypto from "node:crypto";
import { supabase } from "../config/supabase.js";

const bucketName =
    process.env.SUPABASE_GUIDES_BUCKET ?? "guides";

export async function uploadGuidePdf(file) {
    if (!file) {
        throw new Error("File PDF belum dipilih");
    }

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(
        currentDate.getMonth() + 1,
    ).padStart(2, "0");

    const fileName = `${crypto.randomUUID()}.pdf`;
    const filePath = `${year}/${month}/${fileName}`;

    const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file.buffer, {
            contentType: "application/pdf",
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        throw new Error(
            `Gagal mengunggah PDF: ${error.message}`,
        );
    }

    const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

    return {
        filePath,
        fileUrl: data.publicUrl,
        originalName: file.originalname,
        size: file.size,
    };
}

export async function deleteGuidePdf(filePath) {
    if (!filePath) return;

    const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

    if (error) {
        throw new Error(
            `Gagal menghapus PDF: ${error.message}`,
        );
    }
}