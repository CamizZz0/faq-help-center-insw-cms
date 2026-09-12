import {
    BadgeCheck,
    Building,
    ClipboardCheck,
    FileCheck,
    FileText,
    Folder,
    Globe,
    LayoutGrid,
    Monitor,
    Package,
    UserRoundPlus,
} from "lucide-react";

/*
 * Kolom icon lama menyimpan nama ikon dalam kebab-case.
 * Nilai di bawah mencakup seluruh data yang sudah ada
 * beserta pilihan ikon pada form sebelumnya.
 *
 * "package-import", "package-export", dan "monitor-globe"
 * bukan nama ikon lucide yang valid sehingga dipetakan ke
 * ikon terdekat.
 */
const LEGACY_ICONS = {
    "badge-check": BadgeCheck,
    building: Building,
    "clipboard-check": ClipboardCheck,
    "file-check": FileCheck,
    "file-text": FileText,
    folder: Folder,
    globe: Globe,
    "layout-grid": LayoutGrid,
    "monitor-globe": Monitor,
    "package-export": Package,
    "package-import": Package,
    "user-round-plus": UserRoundPlus,
};

/*
 * Menampilkan ikon hasil upload bila tersedia, dan
 * kembali memakai ikon lucide lama sebagai fallback.
 *
 * Ukuran diatur lewat className agar konsisten dengan
 * pemakaian ikon lucide yang sudah ada.
 */
export default function IconPreview({
    iconUrl,
    iconName,
    alt = "",
    className = "",
}) {
    if (iconUrl) {
        return (
            <img
                src={iconUrl}
                alt={alt}
                loading="lazy"
                className={`object-contain ${className}`}
            />
        );
    }

    const Icon =
        LEGACY_ICONS[
            String(iconName ?? "")
                .trim()
                .toLowerCase()
        ] ?? LayoutGrid;

    return (
        <Icon
            strokeWidth={1.8}
            aria-hidden="true"
            className={className}
        />
    );
}
