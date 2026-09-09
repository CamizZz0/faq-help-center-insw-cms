import {
    useEffect,
    useState,
} from "react";

import {
    ChevronLeft,
    ChevronRight,
    Pencil,
    Plus,
    Search,
} from "lucide-react";

import { Link } from "react-router-dom";

import {
    getCategories,
    getCmsFaqs,
} from "../../services/api";

function extractCategories(result) {
    if (Array.isArray(result?.data)) {
        return result.data;
    }

    if (
        Array.isArray(
            result?.data?.categories
        )
    ) {
        return result.data.categories;
    }

    return [];
}

export default function FaqListPage() {
    const [faqs, setFaqs] = useState([]);
    const [categories, setCategories] =
        useState([]);

    const [meta, setMeta] = useState(null);

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] =
        useState("");
    const [search, setSearch] = useState("");
    const [categorySlug, setCategorySlug] =
        useState("");
    const [status, setStatus] = useState("");

    const [loading, setLoading] =
        useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadCategories() {
            try {
                const result =
                    await getCategories();

                setCategories(
                    extractCategories(result)
                );
            } catch (err) {
                setError(err.message);
            }
        }

        loadCategories();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [searchInput]);

    useEffect(() => {
        async function loadFaqs() {
            try {
                setLoading(true);
                setError("");

                const result = await getCmsFaqs({
                    search,
                    category: categorySlug,
                    status,
                    page,
                    limit: 10,
                });

                setFaqs(
                    Array.isArray(result?.data)
                        ? result.data
                        : []
                );

                setMeta(result?.meta ?? null);
            } catch (err) {
                setFaqs([]);
                setMeta(null);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadFaqs();
    }, [
        search,
        categorySlug,
        status,
        page,
    ]);

    function handleCategoryChange(event) {
        setCategorySlug(event.target.value);
        setPage(1);
    }

    function handleStatusChange(event) {
        setStatus(event.target.value);
        setPage(1);
    }

    function handlePreviousPage() {
        if (page > 1) {
            setPage(page - 1);
        }
    }

    function handleNextPage() {
        if (
            meta &&
            page < meta.totalPages
        ) {
            setPage(page + 1);
        }
    }

    return (
        <section className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Kelola FAQ
                    </h1>

                    <p className="mt-2 text-slate-600">
                        Tambah dan perbarui konten FAQ.
                    </p>
                </div>

                <Link
                    to="/faqs/new"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                    <Plus size={20} />
                    Tambah FAQ
                </Link>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_240px_180px]">
                    <div className="relative">
                        <Search
                            size={20}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="search"
                            value={searchInput}
                            onChange={(event) =>
                                setSearchInput(
                                    event.target.value
                                )
                            }
                            placeholder="Cari pertanyaan..."
                            className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <select
                        value={categorySlug}
                        onChange={handleCategoryChange}
                        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    >
                        <option value="">
                            Semua kategori
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

                    <select
                        value={status}
                        onChange={handleStatusChange}
                        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    >
                        <option value="">
                            Semua status
                        </option>

                        <option value="published">
                            Terbit
                        </option>

                        <option value="draft">
                            Draft
                        </option>
                    </select>
                </div>

                {error && (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
                        {error}
                    </div>
                )}

                <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[800px] text-left">
                        <thead>
                            <tr className="border-b border-slate-200 text-sm text-slate-500">
                                <th className="px-4 py-4">
                                    Pertanyaan
                                </th>

                                <th className="px-4 py-4">
                                    Kategori
                                </th>

                                <th className="px-4 py-4">
                                    Topik
                                </th>

                                <th className="px-4 py-4">
                                    Status
                                </th>

                                <th className="px-4 py-4 text-right">
                                    Aksi
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="5"
                                        className="px-4 py-16 text-center text-slate-500"
                                    >
                                        Memuat data FAQ...
                                    </td>
                                </tr>
                            ) : faqs.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="5"
                                        className="px-4 py-16 text-center text-slate-500"
                                    >
                                        FAQ tidak ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                faqs.map((faq) => (
                                    <tr
                                        key={faq.id}
                                        className="border-b border-slate-100 last:border-none hover:bg-slate-50"
                                    >
                                        <td className="max-w-md px-4 py-4">
                                            <p className="line-clamp-2 font-medium text-slate-900">
                                                {faq.question}
                                            </p>

                                            {faq.isPopular && (
                                                <span className="mt-2 inline-block text-xs font-medium text-amber-600">
                                                    FAQ Populer
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-4 py-4 text-sm text-slate-600">
                                            {faq.category?.name ??
                                                "-"}
                                        </td>

                                        <td className="px-4 py-4 text-sm text-slate-600">
                                            {faq.topic?.name ??
                                                "-"}
                                        </td>

                                        <td className="px-4 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${faq.isPublished
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : "bg-amber-100 text-amber-700"
                                                    }`}
                                            >
                                                {faq.isPublished
                                                    ? "Terbit"
                                                    : "Draft"}
                                            </span>
                                        </td>

                                        <td className="px-4 py-4 text-right">
                                            <Link
                                                to={`/faqs/${faq.id}/edit`}
                                                aria-label={`Edit ${faq.question}`}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                                            >
                                                <Pencil
                                                    size={18}
                                                />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && meta && (
                    <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                            Total {meta.totalItems} FAQ
                        </p>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handlePreviousPage}
                                disabled={
                                    !meta.hasPreviousPage
                                }
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft
                                    size={18}
                                />
                            </button>

                            <span className="text-sm text-slate-600">
                                Halaman {meta.page} dari{" "}
                                {meta.totalPages || 1}
                            </span>

                            <button
                                type="button"
                                onClick={handleNextPage}
                                disabled={
                                    !meta.hasNextPage
                                }
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronRight
                                    size={18}
                                />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}