export const FAQ_VISIBILITIES = Object.freeze([
    "public",
    "authenticated",
]);

export const VIEWER_ROLES = Object.freeze([
    "guest",
    "authenticated",
]);

const DEFAULT_VISIBILITY = "public";
const DEFAULT_VIEWER_ROLE = "guest";

export function normalizeVisibility(value) {
    const normalized = String(value ?? "")
        .trim()
        .toLowerCase();

    return FAQ_VISIBILITIES.includes(normalized)
        ? normalized
        : DEFAULT_VISIBILITY;
}

export function normalizeViewerRole(value) {
    const normalized = String(value ?? "")
        .trim()
        .toLowerCase();

    return VIEWER_ROLES.includes(normalized)
        ? normalized
        : DEFAULT_VIEWER_ROLE;
}

export function canViewerSeeFaq(faq, viewerRole = DEFAULT_VIEWER_ROLE) {
    const role = normalizeViewerRole(viewerRole);
    const visibility = normalizeVisibility(faq?.visibility);
    const isPublished = faq?.isPublished ?? faq?.is_published ?? true;

    if (!isPublished) return false;
    if (role === "authenticated") {
        return visibility === "public" || visibility === "authenticated";
    }
    return visibility === "public";
}

/**
 * Daftar visibility yang boleh dilihat role tertentu (untuk query DB).
 */
export function visibleVisibilitiesForRole(viewerRole) {
    const role = normalizeViewerRole(viewerRole);

    if (role === "authenticated") return ["public", "authenticated"];
    return ["public"];
}

/*
 * Teaser generik per visibility untuk metadata terkunci.
 * Sengaja statis agar tidak membocorkan isi jawaban FAQ.
 */
const LOCKED_TEASERS = Object.freeze({
    authenticated:
        "Panduan lanjutan yang hanya tersedia untuk pengguna terdaftar.",
});

function teaserFor(faq) {
    const isPublished = faq?.isPublished ?? faq?.is_published ?? true;

    if (!isPublished) return "Konten ini masih dalam peninjauan (draft).";

    return (
        LOCKED_TEASERS[normalizeVisibility(faq?.visibility)] ??
        LOCKED_TEASERS.authenticated
    );
}

/**
 * Metadata terkunci untuk demo frontend.
 * Hanya berisi id/pertanyaan/visibility/teaser — TANPA `answer` — sehingga
 * Guest dapat melihat judul card terkunci tanpa jawaban bocor via network.
 * TODO(auth): pertahankan pola ini (metadata tanpa jawaban) setelah
 * autentikasi resmi tersedia.
 */
export function getLockedMetadata(faqList = [], viewerRole) {
    if (!Array.isArray(faqList)) return [];

    return faqList
        .filter((faq) => !canViewerSeeFaq(faq, viewerRole))
        .map((faq) => ({
            id: faq?.id,
            question: faq?.question,
            visibility: normalizeVisibility(faq?.visibility),
            isDraft: !(faq?.isPublished ?? faq?.is_published ?? true),
            teaser: teaserFor(faq),
        }));
}

/**
 * Hitungan ringkas untuk panel demo.
 * `draft` = isPublished false apa pun visibility-nya.
 */
export function getVisibilityCounts(faqList = []) {
    const counts = {
        public: 0,
        authenticated: 0,
        draft: 0,
        total: 0,
    };

    if (!Array.isArray(faqList)) return counts;

    for (const faq of faqList) {
        const isPublished = faq?.isPublished ?? faq?.is_published ?? true;

        counts.total += 1;

        if (!isPublished) {
            counts.draft += 1;
        } else {
            counts[normalizeVisibility(faq?.visibility)] += 1;
        }
    }

    return counts;
}

export { DEFAULT_VISIBILITY, DEFAULT_VIEWER_ROLE };
