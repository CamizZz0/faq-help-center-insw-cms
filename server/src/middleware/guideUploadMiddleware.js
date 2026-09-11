import multer from "multer";

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 10 * 1024 * 1024,
    },

    fileFilter(req, file, callback) {
        if (file.mimetype !== "application/pdf") {
            return callback(
                new Error("File panduan harus berformat PDF"),
            );
        }

        callback(null, true);
    },
});

export function uploadGuidePdf(req, res, next) {
    upload.single("file")(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message:
                    error.code === "LIMIT_FILE_SIZE"
                        ? "Ukuran PDF maksimal 10 MB"
                        : error.message,
            });
        }

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        next();
    });
}