import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
    createCmsFaq,
    getCmsFaqById,
    updateCmsFaq,
    getCategories,
    getSubcategories,
    getTopics,
} from "../../services/api";

import FaqAnswerEditor from "../../components/cms/FaqAnswerEditor";

function extractList(result, key) {
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.data?.[key])) return result.data[key];
    return [];
}

function includeCurrent(items, current) {
    if (!current || items.some((item) => item.id === current.id)) {
        return items;
    }

    return [...items, current];
}

const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 " +
    "outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 " +
    "disabled:bg-slate-100";

export default function FaqFormPage() {
    const { faqId } = useParams();

    return <FaqForm key={faqId || "new"} faqId={faqId} />;
}

function FaqForm({ faqId }) {
    const navigate = useNavigate();
    const isEdit = Boolean(faqId);

    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [topics, setTopics] = useState([]);

    const [form, setForm] = useState({
        categorySlug: "",
        subcategorySlug: "",
        topicId: "",
        question: "",
        answer: "",
        isPopular: false,
        isPublished: false,
    });

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [error, setError] = useState("");
    const [loadingSubcategories, setLoadingSubcategories] = useState(false);
    const [loadingTopics, setLoadingTopics] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const subcategoryRequest = useRef(0);
    const topicRequest = useRef(0);
    const saving = useRef(false);

    function updateField(name, value) {
        setForm((current) => ({ ...current, [name]: value }));
    }

    useEffect(() => {
        let active = true;

        async function loadData() {
            try {
                const [categoryResult, faqResult] = await Promise.all([
                    getCategories(),
                    faqId ? getCmsFaqById(faqId) : Promise.resolve(null),
                ]);

                if (!active) return;

                const categoryList = extractList(categoryResult, "categories");

                if (!faqId) {
                    setCategories(categoryList);
                    return;
                }

                const faq = faqResult?.data;

                if (!faq?.category || !faq?.subcategory || !faq?.topic) {
                    throw new Error("Data relasi FAQ tidak lengkap.");
                }

                const [subcategoryResult, topicResult] = await Promise.all([
                    getSubcategories(faq.category.slug),
                    getTopics(faq.subcategory.slug),
                ]);

                if (!active) return;

                setCategories(includeCurrent(categoryList, faq.category));

                setSubcategories(
                    includeCurrent(
                        extractList(subcategoryResult, "subcategories"),
                        faq.subcategory
                    )
                );

                setTopics(
                    includeCurrent(
                        extractList(topicResult, "topics"),
                        faq.topic
                    )
                );

                setForm({
                    categorySlug: faq.category.slug,
                    subcategorySlug: faq.subcategory.slug,
                    topicId: String(faq.topic.id),
                    question: faq.question ?? "",
                    answer: faq.answer ?? "",
                    isPopular: faq.isPopular,
                    isPublished: faq.isPublished,
                });
            } catch (err) {
                if (active) setLoadError(err.message);
            } finally {
                if (active) setLoading(false);
            }
        }

        loadData();

        return () => {
            active = false;
            subcategoryRequest.current += 1;
            topicRequest.current += 1;
        };
    }, [faqId]);

    async function handleCategoryChange(event) {
        const slug = event.target.value;
        const requestId = ++subcategoryRequest.current;

        topicRequest.current += 1;

        setForm((current) => ({
            ...current,
            categorySlug: slug,
            subcategorySlug: "",
            topicId: "",
        }));

        setSubcategories([]);
        setTopics([]);
        setLoadingTopics(false);
        setLoadingSubcategories(Boolean(slug));
        setError("");

        if (!slug) return;

        try {
            const result = await getSubcategories(slug);

            if (requestId === subcategoryRequest.current) {
                setSubcategories(extractList(result, "subcategories"));
            }
        } catch (err) {
            if (requestId === subcategoryRequest.current) {
                setError(err.message);
            }
        } finally {
            if (requestId === subcategoryRequest.current) {
                setLoadingSubcategories(false);
            }
        }
    }

    async function handleSubcategoryChange(event) {
        const slug = event.target.value;
        const requestId = ++topicRequest.current;

        setForm((current) => ({
            ...current,
            subcategorySlug: slug,
            topicId: "",
        }));

        setTopics([]);
        setLoadingTopics(Boolean(slug));
        setError("");

        if (!slug) return;

        try {
            const result = await getTopics(slug);

            if (requestId === topicRequest.current) {
                setTopics(extractList(result, "topics"));
            }
        } catch (err) {
            if (requestId === topicRequest.current) {
                setError(err.message);
            }
        } finally {
            if (requestId === topicRequest.current) {
                setLoadingTopics(false);
            }
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (saving.current || loadingSubcategories || loadingTopics) return;

        const topicId = Number(form.topicId);

        if (
            !form.categorySlug ||
            !form.subcategorySlug ||
            !topics.some((topic) => Number(topic.id) === topicId)
        ) {
            setError("Pilih kategori, subkategori, dan topik yang valid.");
            return;
        }

        if (form.question.trim().length < 5) {
            setError("Pertanyaan minimal 5 karakter.");
            return;
        }

        // Membaca teks saja; HTML tidak dimasukkan ke halaman.
        const document = new DOMParser().parseFromString(
            form.answer,
            "text/html"
        );

        const answerText = (document.body.textContent || "")
            .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, " ")
            .trim();

        if (!answerText) {
            setError("Jawaban FAQ wajib diisi.");
            return;
        }

        const payload = {
            topicId,
            question: form.question.trim(),
            answer: form.answer,
            isPopular: form.isPopular,
            isPublished: form.isPublished,
        };

        try {
            saving.current = true;
            setSubmitting(true);
            setError("");

            if (isEdit) {
                await updateCmsFaq(faqId, payload);
            } else {
                await createCmsFaq(payload);
            }

            navigate("/faqs");
        } catch (err) {
            setError(err.message);
        } finally {
            saving.current = false;
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <p className="p-6 text-slate-600">
                Memuat form FAQ...
            </p>
        );
    }

    if (loadError) {
        return (
            <section className="mx-auto max-w-4xl">
                <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-600">
                    {loadError}
                </p>

                <Link to="/faqs" className="mt-4 inline-block text-blue-600">
                    Kembali ke daftar FAQ
                </Link>
            </section>
        );
    }

    return (
        <section className="mx-auto max-w-4xl">
            <Link
                to="/faqs"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
            >
                <ArrowLeft size={18} />
                Kembali ke daftar FAQ
            </Link>

            <h1 className="mt-6 text-3xl font-bold text-slate-900">
                {isEdit ? "Edit FAQ" : "Tambah FAQ"}
            </h1>

            <p className="mt-2 text-slate-600">
                {isEdit
                    ? "Perbarui isi FAQ dan pengaturan publikasinya."
                    : "Lengkapi informasi untuk membuat FAQ baru."}
            </p>

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
                        <Field label="Kategori *" htmlFor="category">
                            <select
                                id="category"
                                value={form.categorySlug}
                                onChange={handleCategoryChange}
                                required
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

                        <Field label="Subkategori *" htmlFor="subcategory">
                            <select
                                id="subcategory"
                                value={form.subcategorySlug}
                                onChange={handleSubcategoryChange}
                                disabled={!form.categorySlug || loadingSubcategories}
                                required
                                className={inputClass}
                            >
                                <option value="">
                                    {loadingSubcategories
                                        ? "Memuat subkategori..."
                                        : "Pilih subkategori"}
                                </option>

                                {subcategories.map((subcategory) => (
                                    <option key={subcategory.id} value={subcategory.slug}>
                                        {subcategory.name}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Topik *" htmlFor="topic">
                            <select
                                id="topic"
                                value={form.topicId}
                                onChange={(event) =>
                                    updateField("topicId", event.target.value)
                                }
                                disabled={!form.subcategorySlug || loadingTopics}
                                required
                                className={inputClass}
                            >
                                <option value="">
                                    {loadingTopics ? "Memuat topik..." : "Pilih topik"}
                                </option>

                                {topics.map((topic) => (
                                    <option key={topic.id} value={topic.id}>
                                        {topic.name}
                                    </option>
                                ))}
                            </select>
                        </Field>

                    </div>

                    <Field label="Pertanyaan *" htmlFor="question">
                        <input
                            id="question"
                            required
                            minLength={5}
                            value={form.question}
                            onChange={(event) =>
                                updateField("question", event.target.value)
                            }
                            placeholder="Contoh: Apa itu PIB?"
                            className={inputClass}
                        />
                    </Field>

                    <div>
                        <p className="mb-2 text-sm font-semibold text-slate-700">
                            Jawaban *
                        </p>

                        <FaqAnswerEditor
                            value={form.answer}
                            onChange={(html) => updateField("answer", html)}
                            disabled={submitting}
                        />

                        <p className="mt-2 text-sm text-slate-500">
                            Gunakan toolbar untuk mengatur format jawaban.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                            <input
                                type="checkbox"
                                checked={form.isPopular}
                                onChange={(event) =>
                                    updateField("isPopular", event.target.checked)
                                }
                                className="h-5 w-5"
                            />

                            <span>
                                <span className="block font-semibold text-slate-800">
                                    FAQ populer
                                </span>
                                <span className="text-sm text-slate-500">
                                    Tampilkan pada bagian FAQ Populer.
                                </span>
                            </span>
                        </label>

                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                            <input
                                type="checkbox"
                                checked={form.isPublished}
                                onChange={(event) =>
                                    updateField("isPublished", event.target.checked)
                                }
                                className="h-5 w-5"
                            />

                            <span>
                                <span className="block font-semibold text-slate-800">
                                    Terbitkan FAQ
                                </span>
                                <span className="text-sm text-slate-500">
                                    Tampilkan FAQ di website publik.
                                </span>
                            </span>
                        </label>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => navigate("/faqs")}
                            className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 disabled:opacity-60"
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            disabled={submitting || loadingSubcategories || loadingTopics}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Save size={19} />

                            {submitting
                                ? "Menyimpan..."
                                : isEdit
                                    ? "Simpan Perubahan"
                                    : "Simpan FAQ"}
                        </button>
                    </div>
                </fieldset>
            </form>
        </section>
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