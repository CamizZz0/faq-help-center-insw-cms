import multer from "multer";

export const MAX_ICON_SIZE = 1024 * 1024;

/*
 * Hanya format raster yang diizinkan. SVG tidak diterima
 * karena dapat memuat skrip.
 */
const ALLOWED_ICON_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
]);

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: MAX_ICON_SIZE,
        files: 1,
    },

    fileFilter(req, file, callback) {
        if (!ALLOWED_ICON_TYPES.has(file.mimetype)) {
            return callback(
                new Error(
                    "Ikon harus berformat PNG, JPEG, atau WebP."
                )
            );
        }

        callback(null, true);
    },
}).single("icon");

/*
 * Memastikan isi file benar-benar gambar sesuai
 * MIME type yang dikirim klien.
 */
function matchesSignature(buffer, mimetype) {
    if (!buffer || buffer.length < 12) {
        return false;
    }

    if (mimetype === "image/png") {
        const pngSignature = Buffer.from([
            0x89, 0x50, 0x4e, 0x47,
            0x0d, 0x0a, 0x1a, 0x0a,
        ]);

        return buffer
            .subarray(0, 8)
            .equals(pngSignature);
    }

    if (mimetype === "image/jpeg") {
        return (
            buffer[0] === 0xff &&
            buffer[1] === 0xd8 &&
            buffer[2] === 0xff
        );
    }

    if (mimetype === "image/webp") {
        return (
            buffer.subarray(0, 4).toString("ascii") ===
                "RIFF" &&
            buffer.subarray(8, 12).toString("ascii") ===
                "WEBP"
        );
    }

    return false;
}

export function uploadHelpCenterIcon(req, res, next) {
    if (!req.is("multipart/form-data")) {
        return res.status(400).json({
            success: false,
            message:
                "Gunakan multipart/form-data untuk mengirim data ikon.",
        });
    }

    upload(req, res, (error) => {
        if (error) {
            const message =
                error.code === "LIMIT_FILE_SIZE"
                    ? "Ukuran ikon maksimal 1 MB."
                    : error.code ===
                            "LIMIT_UNEXPECTED_FILE" ||
                        error.code === "LIMIT_FILE_COUNT"
                      ? "Kirim satu ikon menggunakan field icon."
                      : error.message;

            return res.status(400).json({
                success: false,
                message,
            });
        }

        if (
            req.file &&
            !matchesSignature(
                req.file.buffer,
                req.file.mimetype
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Isi file bukan gambar PNG, JPEG, atau WebP yang valid.",
            });
        }

        next();
    });
}
