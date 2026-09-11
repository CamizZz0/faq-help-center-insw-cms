import {
    uploadGuidePdf,
} from "../services/guideStorageService.js";

export async function uploadCmsGuidePdf(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "File PDF wajib dipilih",
            });
        }

        const uploadedFile =
            await uploadGuidePdf(req.file);

        return res.status(201).json({
            success: true,
            message:
                "PDF berhasil diunggah ke Supabase Storage",
            data: uploadedFile,
        });
    } catch (error) {
        console.error("Upload PDF gagal:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}