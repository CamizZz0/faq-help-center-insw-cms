import {
    useEffect,
    useState,
} from "react";

import {
    ArrowLeft,
    Save,
} from "lucide-react";

import {
    Link,
    useNavigate,
} from "react-router-dom";

import {
    createCmsFaq,
    getCategories,
    getSubcategories,
    getTopics,
} from "../../services/api";

function extractList(result, key) {
    if (Array.isArray(result?.data)) {
        return result.data;
    }

    if (
        Array.isArray(
            result?.data?.[key]
        )
    ) {
        return result.data[key];
    }

    return [];
}

function convertTextToHtml(value) {
    const escapedText = value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    return escapedText
        .split(/\n{2,}/)
        .map((paragraph) => {
            const content = paragraph
                .replaceAll("\n", "<br>");

            return `<p>${content}</p>`;
        })
        .join("");
}

export default function FaqFormPage() {
    const navigate = useNavigate();

    const [categories, setCategories] =
        useState([]);
    const [subcategories, setSubcategories] =
        useState([]);
    const [topics, setTopics] = useState([]);

    const [categorySlug, setCategorySlug] =
        useState("");
    const [
        subcategorySlug,
        setSubcategorySlug,
    ] = useState("");

    const [topicId, setTopicId] =
        useState("");

    const [question, setQuestion] =
        useState("");
    const [answer, setAnswer] =
        useState("");
    const [sortOrder, setSortOrder] =
        useState(0);
    const [isPopular, setIsPopular] =
        useState(false);
    const [isPublished, setIsPublished] =
        useState(false);

    const [loadingCategories, setLoadingCategories] =
        useState(true);
    const [
        loadingSubcategories,
        setLoadingSubcategories,
    ] = useState(false);
    const [loadingTopics, setLoadingTopics] =
        useState(false);
    const [submitting, setSubmitting] =
        useState(false);

    const [error, setError] = useState("");

    useEffect(() => {
        async function loadCategories() {
            try {
                setLoadingCategories(true);

                const result =
                    await getCategories();

                setCategories(
                    extractList(
                        result,
                        "categories"
                    )
                );
            } catch (err) {
                setError(err.message);
            } finally {
                setLoadingCategories(false);
            }
        }

        loadCategories();
    }, []);

    async function handleCategoryChange(event) {
        const selectedSlug =
            event.target.value;

        setCategorySlug(selectedSlug);
        setSubcategorySlug("");
        setTopicId("");
        setSubcategories([]);
        setTopics([]);
        setError("");

        if (!selectedSlug) {
            return;
        }

        try {
            setLoadingSubcategories(true);

            const result =
                await getSubcategories(
                    selectedSlug
                );

            setSubcategories(
                extractList(
                    result,
                    "subcategories"
                )
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingSubcategories(false);
        }
    }

    async function handleSubcategoryChange(event) {
        const selectedSlug =
            event.target.value;

        setSubcategorySlug(selectedSlug);
        setTopicId("");
        setTopics([]);
        setError("");

        if (!selectedSlug) {
            return;
        }

        try {
            setLoadingTopics(true);

            const result =
                await getTopics(
                    selectedSlug
                );

            setTopics(
                extractList(
                    result,
                    "topics"
                )
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingTopics(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!categorySlug) {
            setError("Kategori wajib dipilih.");
            return;
        }

        if (!subcategorySlug) {
            setError(
                "Subkategori wajib dipilih."
            );
            return;
        }

        if (!topicId) {
            setError("Topik wajib dipilih.");
            return;
        }

        if (question.trim().length < 5) {
            setError(
                "Pertanyaan minimal 5 karakter."
            );
            return;
        }

        if (!answer.trim()) {
            setError("Jawaban wajib diisi.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            await createCmsFaq({
                topicId: Number(topicId),
                question: question.trim(),
                answer: convertTextToHtml(
                    answer.trim()
                ),
                sortOrder: Number(sortOrder),
                isPopular,
                isPublished,
            });

            navigate("/faqs");
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
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

            <div className="mt-6">
                <h1 className="text-3xl font-bold text-slate-900">
                    Tambah FAQ
                </h1>

                <p className="mt-2 text-slate-600">
                    Lengkapi informasi FAQ baru.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
            >
                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
                        {error}
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <label
                            htmlFor="category"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Kategori
                            <span className="text-red-500">
                                {" "}*
                            </span>
                        </label>

                        <select
                            id="category"
                            value={categorySlug}
                            onChange={handleCategoryChange}
                            disabled={
                                loadingCategories
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                        >
                            <option value="">
                                {loadingCategories
                                    ? "Memuat kategori..."
                                    : "Pilih kategori"}
                            </option>

                            {categories.map(
                                (category) => (
                                    <option
                                        key={category.id}
                                        value={category.slug}
                                    >
                                        {category.name}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="subcategory"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Subkategori
                            <span className="text-red-500">
                                {" "}*
                            </span>
                        </label>

                        <select
                            id="subcategory"
                            value={subcategorySlug}
                            onChange={
                                handleSubcategoryChange
                            }
                            disabled={
                                !categorySlug ||
                                loadingSubcategories
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                        >
                            <option value="">
                                {loadingSubcategories
                                    ? "Memuat subkategori..."
                                    : "Pilih subkategori"}
                            </option>

                            {subcategories.map(
                                (subcategory) => (
                                    <option
                                        key={
                                            subcategory.id
                                        }
                                        value={
                                            subcategory.slug
                                        }
                                    >
                                        {
                                            subcategory.name
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="topic"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Topik
                            <span className="text-red-500">
                                {" "}*
                            </span>
                        </label>

                        <select
                            id="topic"
                            value={topicId}
                            onChange={(event) =>
                                setTopicId(
                                    event.target.value
                                )
                            }
                            disabled={
                                !subcategorySlug ||
                                loadingTopics
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                        >
                            <option value="">
                                {loadingTopics
                                    ? "Memuat topik..."
                                    : "Pilih topik"}
                            </option>

                            {topics.map((topic) => (
                                <option
                                    key={topic.id}
                                    value={topic.id}
                                >
                                    {topic.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="sortOrder"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Urutan
                        </label>

                        <input
                            id="sortOrder"
                            type="number"
                            min="0"
                            value={sortOrder}
                            onChange={(event) =>
                                setSortOrder(
                                    event.target.value
                                )
                            }
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                </div>

                <div className="mt-6">
                    <label
                        htmlFor="question"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                        Pertanyaan
                        <span className="text-red-500">
                            {" "}*
                        </span>
                    </label>

                    <input
                        id="question"
                        type="text"
                        value={question}
                        onChange={(event) =>
                            setQuestion(
                                event.target.value
                            )
                        }
                        placeholder="Contoh: Apa itu PIB?"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                </div>

                <div className="mt-6">
                    <label
                        htmlFor="answer"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                        Jawaban
                        <span className="text-red-500">
                            {" "}*
                        </span>
                    </label>

                    <textarea
                        id="answer"
                        rows="9"
                        value={answer}
                        onChange={(event) =>
                            setAnswer(
                                event.target.value
                            )
                        }
                        placeholder="Tulis jawaban FAQ di sini..."
                        className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 leading-7 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                        <input
                            type="checkbox"
                            checked={isPopular}
                            onChange={(event) =>
                                setIsPopular(
                                    event.target.checked
                                )
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
                            checked={isPublished}
                            onChange={(event) =>
                                setIsPublished(
                                    event.target.checked
                                )
                            }
                            className="h-5 w-5"
                        />

                        <span>
                            <span className="block font-semibold text-slate-800">
                                Terbitkan FAQ
                            </span>

                            <span className="text-sm text-slate-500">
                                FAQ dapat ditampilkan di website publik.
                            </span>
                        </span>
                    </label>
                </div>

                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                    <Link
                        to="/faqs"
                        className="inline-flex justify-center rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Batal
                    </Link>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save size={19} />

                        {submitting
                            ? "Menyimpan..."
                            : "Simpan FAQ"}
                    </button>
                </div>
            </form>
        </section>
    );
}