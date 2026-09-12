export const MAX_ICON_BYTES = 1024 * 1024;

export const ALLOWED_ICON_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp",
];

export function validateIconFile(file) {
    if (!file) {
        return "Pilih file ikon terlebih dahulu.";
    }

    if (!ALLOWED_ICON_TYPES.includes(file.type)) {
        return "Ikon harus berformat PNG, JPEG, atau WebP.";
    }

    if (file.size > MAX_ICON_BYTES) {
        return "Ukuran ikon maksimal 1 MB.";
    }

    return "";
}
