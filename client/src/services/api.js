const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:5001/api";

async function request(endpoint, options = {}) {
    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,

            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message ??
            "Terjadi kesalahan saat mengambil data"
        );
    }

    return result;
}

function createQuery(params = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(
        ([key, value]) => {
            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                query.set(key, String(value));
            }
        }
    );

    const queryString = query.toString();

    return queryString
        ? `?${queryString}`
        : "";
}

export function getCmsFaqs(params = {}) {
    return request(
        `/cms/faqs${createQuery(params)}`
    );
}

export function getCategories() {
    return request("/categories");
}

export function getSubcategories(categorySlug) {
    return request(
        `/categories/${categorySlug}/subcategories`
    );
}

export function getTopics(subcategorySlug) {
    return request(
        `/subcategories/${subcategorySlug}/topics`
    );
}

export function createCmsFaq(payload) {
    return request("/cms/faqs", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function getCmsFaqById(id) {
    return request(
        `/cms/faqs/${encodeURIComponent(id)}`
    );
}

export function updateCmsFaq(id, payload) {
    return request(
        `/cms/faqs/${encodeURIComponent(id)}`,
        {
            method: "PATCH",
            body: JSON.stringify(payload),
        }
    );
}

export function deleteCmsFaq(id) {
    return request(
        `/cms/faqs/${encodeURIComponent(id)}`,
        {
            method: "DELETE",
        }
    );
}