import crypto from "node:crypto";
import { supabase } from "../config/supabase.js";

export const ICONS_BUCKET =
    process.env.SUPABASE_ICONS_BUCKET ?? "help-center-icons";

const FOLDER_EXTENSIONS = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
};

const ALLOWED_FOLDERS = new Set([
    "categories",
    "subcategories",
]);

function safeBaseName(name = "") {
    return (
        String(name)
            .replace(/\.[^.]*$/, "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 50) || "icon"
    );
}

/*
 * Hanya path yang dibentuk service ini yang boleh dihapus.
 * Path di luar folder yang dikenal dan path dengan ".."
 * selalu ditolak.
 */
function isManagedIconPath(filePath) {
    if (typeof filePath !== "string" || !filePath) {
        return false;
    }

    if (filePath.includes("..") || filePath.startsWith("/")) {
        return false;
    }

    const [folder, ...rest] = filePath.split("/");

    return (
        ALLOWED_FOLDERS.has(folder) &&
        rest.length === 1 &&
        rest[0].length > 0
    );
}

export async function uploadHelpCenterIcon(file, folder) {
    if (!file) {
        throw new Error("File ikon belum dipilih.");
    }

    if (!ALLOWED_FOLDERS.has(folder)) {
        throw new Error("Folder ikon tidak valid.");
    }

    const extension = FOLDER_EXTENSIONS[file.mimetype];

    if (!extension) {
        throw new Error(
            "Ikon harus berformat PNG, JPEG, atau WebP."
        );
    }

    const fileName = [
        Date.now(),
        crypto.randomBytes(6).toString("hex"),
        `${safeBaseName(file.originalname)}.${extension}`,
    ].join("-");

    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
        .from(ICONS_BUCKET)
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        throw new Error(
            `Gagal mengunggah ikon: ${error.message}`
        );
    }

    const { data } = supabase.storage
        .from(ICONS_BUCKET)
        .getPublicUrl(filePath);

    return {
        filePath,
        fileUrl: data.publicUrl,
    };
}

export async function removeHelpCenterIcon(filePath) {
    if (!filePath) return;

    if (!isManagedIconPath(filePath)) {
        throw new Error("Path ikon tidak valid.");
    }

    const { error } = await supabase.storage
        .from(ICONS_BUCKET)
        .remove([filePath]);

    if (error) {
        throw new Error(
            `Gagal menghapus ikon: ${error.message}`
        );
    }
}
