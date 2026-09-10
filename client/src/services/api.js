const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:5001/api";

async function request(endpoint, options = {}) {
    const headers = new Headers(options.headers);
    if (options.body instanceof FormData) {
        headers.delete("Content-Type");
    } else if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,

            headers,
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

export function getCmsCategories() {
    return request("/cms/categories");
}

export function getCmsCategoryById(id) {
    return request(
        `/cms/categories/${encodeURIComponent(id)}`
    );
}

export function createCmsCategory(payload) {
    return request("/cms/categories", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function updateCmsCategory(id, payload) {
    return request(
        `/cms/categories/${encodeURIComponent(id)}`,
        {
            method: "PATCH",
            body: JSON.stringify(payload),
        }
    );
}

export function deleteCmsCategory(id) {
    return request(
        `/cms/categories/${encodeURIComponent(id)}`,
        {
            method: "DELETE",
        }
    );
}

export function getCmsGuides(params = {}) {
    return request(`/cms/guides${createQuery(params)}`);
}

export function getCmsGuideById(id) {
    return request(`/cms/guides/${encodeURIComponent(id)}`);
}

export function createCmsGuide(payload) {
    return request("/cms/guides", { method: "POST", body: payload });
}

export function updateCmsGuide(id, payload) {
    return request(`/cms/guides/${encodeURIComponent(id)}`, { method: "PATCH", body: payload });
}

export function deleteCmsGuide(id) {
    return request(`/cms/guides/${encodeURIComponent(id)}`, { method: "DELETE" });
}
