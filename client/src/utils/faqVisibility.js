/**
 * Metadata visibilitas FAQ untuk CMS.
 * Nilai disimpan ke API sebagai "public" | "authenticated".
 */
export const FAQ_VISIBILITY_OPTIONS = [
    {
        value: "public",
        label: "Publik",
        badge: "Publik",
        badgeClass: "bg-sky-100 text-sky-700",
        help: "Dapat dibaca semua pengunjung, termasuk guest.",
    },
    {
        value: "authenticated",
        label: "Pengguna terdaftar",
        badge: "Pengguna terdaftar",
        badgeClass: "bg-violet-100 text-violet-700",
        help: "Hanya untuk pengguna yang sudah masuk (simulasi).",
    },
];

export function normalizeVisibility(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return FAQ_VISIBILITY_OPTIONS.some((opt) => opt.value === normalized)
        ? normalized
        : "public";
}

export function getVisibilityMeta(value) {
    const normalized = normalizeVisibility(value);
    return FAQ_VISIBILITY_OPTIONS.find((opt) => opt.value === normalized);
}
