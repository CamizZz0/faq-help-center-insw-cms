import { useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
    createCmsTopic,
    getCmsSubcategories,
    updateCmsTopic,
} from "../../services/api";

const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 " +
    "outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 " +
    "disabled:cursor-not-allowed disabled:bg-slate-100";

function createInitialForm(topic) {
    return {
        categorySlug: topic?.category?.slug ?? "",
        subcategoryId: topic?.subcategory?.id
            ? String(topic.subcategory.id)
            : "",
        name: topic?.name ?? "",
        description: topic?.description ?? "",
        sortOrder: topic?.sortOrder ?? 0,
        isActive: topic?.isActive ?? true,
    };
}

function extractList(result) {
    return Array.isArray(result?.data) ? result.data : [];
}

function includeCurrent(items, current) {
    if (!current || items.some((item) => item.id === current.id)) {
        return items;
    }
    return [...items, current];
}

export default function TopicForm({ mode, topic, categories }) {
    const navigate = useNavigate();
    const isEdit = mode === "edit";
    const [form, setForm] = useState(() => createInitialForm(topic));
    const [subcategories, setSubcategories] = useState([]);
    const [loadingSubcategories, setLoadingSubcategories] = useState(
        Boolean(topic?.category?.slug),
    );
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const subcategoryRequest = useRef(0);
    const submitInProgress = useRef(false);

    useEffect(() => {
        const slug = form.categorySlug;
        const requestId = ++subcategoryRequest.current;

        if (!slug) {
            return undefined;
        }

        getCmsSubcategories({ category: slug, limit: 50 })
            .then((result) => {
                if (requestId !== subcategoryRequest.current) return;
                setSubcategories(
                    includeCurrent(
                        extractList(result),
                        slug === topic?.category?.slug
                            ? topic.subcategory
                            : null,
                    ),
                );
            })
            .catch((requestError) => {
                if (requestId === subcategoryRequest.current) {
                    setError(
                        requestError.message ||
                            "Daftar subkategori gagal dimuat.",
                    );
                }
            })
            .finally(() => {
                if (requestId === subcategoryRequest.current) {
                    setLoadingSubcategories(false);
                }
            });

        return () => {
            subcategoryRequest.current += 1;
        };
    }, [
        form.categorySlug,
        topic?.category?.slug,
        topic?.subcategory,
    ]);

    function updateField(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
    }

    function handleCategoryChange(event) {
        const categorySlug = event.target.value;
        setSubcategories([]);
        setLoadingSubcategories(Boolean(categorySlug));
        setError("");
        setForm((current) => ({
            ...current,
            categorySlug,
            subcategoryId: "",
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (submitInProgress.current) return;

        const subcategoryId = Number(form.subcategoryId);
        const name = form.name.trim();
        const sortOrder =
            String(form.sortOrder).trim() === ""
                ? 0
                : Number(form.sortOrder);

        if (!form.categorySlug) {
            setError("Pilih kategori induk.");
            return;
        }
        if (!Number.isInteger(subcategoryId) || subcategoryId < 1) {
            setError("Pilih subkategori induk.");
            return;
        }
        if (name.length < 2 || name.length > 150) {
            setError("Nama topik harus terdiri dari 2–150 karakter.");
            return;
        }
        if (!Number.isInteger(sortOrder) || sortOrder < 0) {
            setError("Urutan harus berupa bilangan bulat minimal 0.");
            return;
        }

        const payload = {
            subcategoryId,
            name,
            description: form.description.trim(),
            sortOrder,
            isActive: form.isActive,
        };

        try {
            submitInProgress.current = true;
            setSubmitting(true);
            setError("");

            if (isEdit) {
                await updateCmsTopic(topic.id, payload);
            } else {
                await createCmsTopic(payload);
            }

            navigate("/topics");
        } catch (requestError) {
            setError(requestError.message || "Topik gagal disimpan.");
        } finally {
            submitInProgress.current = false;
            setSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
        >
            {error && (
                <div
                    role="alert"
                    className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600"
                >
                    {error}
                </div>
            )}

            <fieldset disabled={submitting} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <Field label="Kategori *" htmlFor="topic-category">
                        <select
                            id="topic-category"
                            required
                            value={form.categorySlug}
                            onChange={handleCategoryChange}
                            className={inputClass}
                        >
                            <option value="">Pilih kategori</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.slug}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Subkategori *" htmlFor="topic-subcategory">
                        <select
                            id="topic-subcategory"
                            required
                            disabled={!form.categorySlug || loadingSubcategories}
                            value={form.subcategoryId}
                            onChange={(event) =>
                                updateField("subcategoryId", event.target.value)
                            }
                            className={inputClass}
                        >
                            <option value="">
                                {loadingSubcategories
                                    ? "Memuat subkategori..."
                                    : form.categorySlug
                                      ? "Pilih subkategori"
                                      : "Pilih kategori terlebih dahulu"}
                            </option>
                            {subcategories.map((subcategory) => (
                                <option
                                    key={subcategory.id}
                                    value={subcategory.id}
                                >
                                    {subcategory.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>

                <Field label="Nama Topik *" htmlFor="topic-name">
                    <input
                        id="topic-name"
                        required
                        minLength={2}
                        maxLength={150}
                        value={form.name}
                        onChange={(event) =>
                            updateField("name", event.target.value)
                        }
                        placeholder="Contoh: Pengajuan PIB"
                        className={inputClass}
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        Slug dibuat otomatis dari nama dan tetap sama setelah
                        topik disimpan.
                    </p>
                </Field>

                <Field label="Deskripsi" htmlFor="topic-description">
                    <textarea
                        id="topic-description"
                        rows={4}
                        value={form.description}
                        onChange={(event) =>
                            updateField("description", event.target.value)
                        }
                        placeholder="Tuliskan ringkasan topik."
                        className={`${inputClass} resize-y`}
                    />
                </Field>

                <Field label="Urutan" htmlFor="topic-order">
                    <input
                        id="topic-order"
                        type="number"
                        min="0"
                        step="1"
                        value={form.sortOrder}
                        onChange={(event) =>
                            updateField("sortOrder", event.target.value)
                        }
                        className={inputClass}
                    />
                </Field>

                <label className="flex items-center justify-between gap-4 rounded-xl bg-blue-50 p-4">
                    <span>
                        <span className="block font-semibold text-slate-800">
                            Aktifkan Topik
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                            Topik aktif dapat ditampilkan di website publik.
                        </span>
                    </span>
                    <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(event) =>
                            updateField("isActive", event.target.checked)
                        }
                        className="h-5 w-5 shrink-0 accent-blue-600"
                    />
                </label>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => navigate("/topics")}
                        className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || loadingSubcategories}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save size={19} />
                        {submitting
                            ? "Menyimpan..."
                            : isEdit
                              ? "Perbarui Topik"
                              : "Simpan Topik"}
                    </button>
                </div>
            </fieldset>
        </form>
    );
}

function Field({ label, htmlFor, children }) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="mb-2 block text-sm font-semibold text-slate-700"
            >
                {label}
            </label>
            {children}
        </div>
    );
}
