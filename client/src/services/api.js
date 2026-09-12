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
        const error = new Error(
            result.message ??
            "Terjadi kesalahan saat mengambil data"
        );
        error.data = result.data;
        error.status = response.status;
        throw error;
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

export function getCmsDashboard() {
    return request("/cms/dashboard");
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
    /*
     * Body berupa FormData sehingga browser menetapkan
     * header multipart beserta boundary sendiri.
     */
    return request("/cms/categories", {
        method: "POST",
        body: payload,
    });
}

export function updateCmsCategory(id, payload) {
    return request(
        `/cms/categories/${encodeURIComponent(id)}`,
        {
            method: "PATCH",
            body: payload,
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

export function getCmsSubcategories(params = {}) {
    return request(
        `/cms/subcategories${createQuery(params)}`
    );
}

export function getCmsSubcategoryById(id) {
    return request(
        `/cms/subcategories/${encodeURIComponent(id)}`
    );
}

export function createCmsSubcategory(payload) {
    /*
     * Body berupa FormData sehingga browser menetapkan
     * header multipart beserta boundary sendiri.
     */
    return request("/cms/subcategories", {
        method: "POST",
        body: payload,
    });
}

export function updateCmsSubcategory(id, payload) {
    return request(
        `/cms/subcategories/${encodeURIComponent(id)}`,
        {
            method: "PATCH",
            body: payload,
        }
    );
}

export function deleteCmsSubcategory(id) {
    return request(
        `/cms/subcategories/${encodeURIComponent(id)}`,
        {
            method: "DELETE",
        }
    );
}

export function getCmsTopics(params = {}) {
    return request(`/cms/topics${createQuery(params)}`);
}

export function getCmsTopicById(id) {
    return request(`/cms/topics/${encodeURIComponent(id)}`);
}

export function createCmsTopic(payload) {
    return request("/cms/topics", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function updateCmsTopic(id, payload) {
    return request(`/cms/topics/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export function deleteCmsTopic(id) {
    return request(`/cms/topics/${encodeURIComponent(id)}`, {
        method: "DELETE",
    });
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

export function getCmsTutorials(params = {}) {
    return request(`/cms/tutorials${createQuery(params)}`);
}

export function getCmsTutorialById(id) {
    return request(`/cms/tutorials/${encodeURIComponent(id)}`);
}

export function createCmsTutorial(payload) {
    return request("/cms/tutorials", { method: "POST", body: JSON.stringify(payload) });
}

export function updateCmsTutorial(id, payload) {
    return request(`/cms/tutorials/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteCmsTutorial(id) {
    return request(`/cms/tutorials/${encodeURIComponent(id)}`, { method: "DELETE" });
}
