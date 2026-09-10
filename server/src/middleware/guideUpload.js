import multer from "multer";
import { MAX_PDF_SIZE } from "../services/guideFiles.js";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PDF_SIZE, files: 1, fields: 8, parts: 10, fieldSize: 1024 * 1024 },
    fileFilter(req, file, callback) {
        if (file.mimetype !== "application/pdf" || !/\.pdf$/i.test(file.originalname)) {
            return callback(new Error("Hanya file PDF yang diizinkan."));
        }
        callback(null, true);
    },
}).single("file");

export function uploadGuidePdf(req, res, next) {
    if (!req.is("multipart/form-data")) {
        return res.status(400).json({ success: false, message: "Gunakan multipart/form-data untuk menyimpan panduan." });
    }
    upload(req, res, error => {
        if (error) {
            const message = error.code === "LIMIT_FILE_SIZE" ? "Ukuran PDF maksimal 10 MB."
                : error.code ? "Upload tidak valid. Kirim satu PDF menggunakan field file." : error.message;
            return res.status(400).json({ success: false, message });
        }
        if (req.file) {
            const header = req.file.buffer.subarray(0, 8).toString("ascii");
            const trailer = req.file.buffer.subarray(-1024).toString("ascii");
            if (!/^%PDF-\d\.\d/.test(header) || !/%%EOF\s*$/.test(trailer)) {
                return res.status(400).json({ success: false, message: "Isi file bukan dokumen PDF yang valid." });
            }
        }
        next();
    });
}
