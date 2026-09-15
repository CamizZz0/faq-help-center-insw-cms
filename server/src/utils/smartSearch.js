const SERVICE_TERMS = Object.freeze([
    {
        term: "pib",
        aliases: ["pemberitahuan impor barang"],
    },
    {
        term: "peb",
        aliases: ["pemberitahuan ekspor barang"],
    },
    {
        term: "btki",
        aliases: ["buku tarif kepabeanan indonesia"],
    },
    {
        term: "pertek",
        aliases: ["pertimbangan teknis"],
    },
    {
        term: "ska",
        aliases: ["surat keterangan asal", "certificate of origin", "coo"],
    },
    {
        term: "tracking",
        aliases: ["pelacakan", "status dokumen"],
    },
    {
        term: "registrasi",
        aliases: ["pendaftaran"],
    },
    {
        term: "impor",
        aliases: ["import"],
    },
    {
        term: "ekspor",
        aliases: ["export"],
    },
]);

function normalize(value) {
    return String(value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function tokenize(value) {
    return normalize(value)
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 2);
}

function distance(left, right) {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

    for (let row = 1; row <= left.length; row += 1) {
        const current = [row];

        for (let column = 1; column <= right.length; column += 1) {
            current[column] = Math.min(
                current[column - 1] + 1,
                previous[column] + 1,
                previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
            );
        }

        previous.splice(0, previous.length, ...current);
    }

    return previous[right.length];
}

function correctedToken(token) {
    const exact = SERVICE_TERMS.find((item) => item.term === token || item.aliases.includes(token));
    if (exact) return exact.term;

    const candidate = SERVICE_TERMS
        .map((item) => ({ item, distance: distance(token, item.term) }))
        .sort((left, right) => left.distance - right.distance)[0];

    const maximumDistance = token.length >= 7 ? 2 : 1;
    return candidate && candidate.distance <= maximumDistance
        ? candidate.item.term
        : token;
}

function unique(values, limit = 12) {
    return [...new Set(values.filter(Boolean))].slice(0, limit);
}

/**
 * Menyiapkan beberapa variasi kata kunci tanpa bergantung pada extension DB.
 * Variasi ini menangani singkatan layanan, sinonim, dan salah ketik umum.
 */
export function createSearchPlan(query) {
    const sourceTokens = tokenize(query);
    const correctedTokens = sourceTokens.map(correctedToken);
    const correctedQuery = correctedTokens.join(" ");
    const aliases = correctedTokens.flatMap((token) => {
        const service = SERVICE_TERMS.find((item) => item.term === token);
        return service?.aliases ?? [];
    });

    return {
        terms: unique([query, correctedQuery, ...sourceTokens, ...correctedTokens, ...aliases]),
        correctedQuery: correctedQuery !== normalize(query) ? correctedQuery : null,
        highlightTerms: unique([...sourceTokens, ...correctedTokens, ...aliases], 8),
    };
}

export function getSearchSuggestions(query) {
    const tokens = tokenize(query);

    const ranked = SERVICE_TERMS
        .map((item) => {
            const score = tokens.length === 0
                ? Number.POSITIVE_INFINITY
                : Math.min(...tokens.map((token) => distance(token, item.term)));

            return { value: item.term.toUpperCase(), score };
        })
        .sort((left, right) => left.score - right.score)
        .map((item) => item.value);

    return unique([...ranked, "PIB", "PEB", "Tracking PIB"], 3);
}
