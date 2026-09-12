import "dotenv/config";

import { supabase } from "../config/supabase.js";

const bucketName =
    process.env.SUPABASE_ICONS_BUCKET ?? "help-center-icons";

async function ensureIconsBucket() {
    const { data: existingBucket, error: readError } =
        await supabase.storage.getBucket(bucketName);

    if (existingBucket) {
        console.log(
            `Bucket "${bucketName}" sudah tersedia.`
        );

        return;
    }

    /*
     * Bucket tidak ditemukan memang error, jadi selain itu
     * dianggap kegagalan nyata.
     */
    if (readError && readError.statusCode !== 404) {
        throw new Error(
            `Gagal memeriksa bucket ikon: ${readError.message}`
        );
    }

    const { error: createError } =
        await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 1024 * 1024,
            allowedMimeTypes: [
                "image/png",
                "image/jpeg",
                "image/webp",
            ],
        });

    if (createError) {
        throw new Error(
            `Gagal membuat bucket ikon: ${createError.message}`
        );
    }

    console.log(
        `Bucket "${bucketName}" berhasil dibuat.`
    );
}

ensureIconsBucket().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
