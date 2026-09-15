import { useCallback, useEffect, useRef, useState } from "react";

import {
    ChevronLeft,
    ChevronRight,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";

import { Link, useSearchParams } from "react-router-dom";

import {
    deleteCmsFaq,
    getCmsCategories,
    getCmsFaqs,
    getCmsTopicById,
    getCmsTopics,
    updateCmsFaq,
} from "../../services/api";

import DeleteFaqModal from "../../components/cms/DeleteFaqModal";
import PopularButton from "../../components/cms/PopularButton";
import VisibilityButton from "../../components/cms/VisibilityButton";

import { getVisibilityMeta } from "../../utils/faqVisibility";

function VisibilityBadge({ value }) {
    const meta = getVisibilityMeta(value);

    return (
        <span
            className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}
        >
            {meta.badge}
        </span>
    );
}

function extractCategories(result) {
    if (Array.isArray(result?.data)) {
        return result.data;
    }

    if (Array.isArray(result?.data?.categories)) {
        return result.data.categories;
    }

    return [];
}

function FaqSearchInput({ search, onSearchChange }) {
    const [searchInput, setSearchInput] = useState(search);

    useEffect(() => {
        const keyword = searchInput.trim();

        if (keyword === search) return undefined;

        const timeoutId = setTimeout(() => {
            onSearchChange({ search: keyword, page: 1 });
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [searchInput, search, onSearchChange]);

    return (
        <div className="relative">
            <Search
                size={20}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
                type="search"
                aria-label="Cari pertanyaan FAQ"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Cari pertanyaan..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
        </div>
    );
}

export default function FaqListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get("search") ?? "";
    const categorySlug = searchParams.get("category") ?? "";
    const topicId = searchParams.get("topic") ?? "";
    const status = searchParams.get("status") ?? "";
    const visibility = searchParams.get("visibility") ?? "";
    const page = readPage(searchParams.get("page"));
    const [faqs, setFaqs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [topics, setTopics] = useState([]);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [meta, setMeta] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [filterError, setFilterError] = useState("");

    const [faqToDelete, setFaqToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [changingStatusId, setChangingStatusId] = useState(null);
    const [success, setSuccess] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [popularId, setPopularId] = useState(null);

    const deleteInProgress = useRef(false);
    const statusChangingRef = useRef(false);
    const popularChangingRef = useRef(false);

    const updateFilterParameters = useCallback((changes) => {
        const nextParams = new URLSearchParams(searchParams);

        Object.entries(changes).forEach(([key, value]) => {
            if (value === "" || value === null || value === undefined) {
                nextParams.delete(key);
            } else {
                nextParams.set(key, String(value));
            }
        });

        setSearchParams(nextParams);
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        let active = true;

        async function loadFilterOptions() {
            try {
                const [categoryResult, topicData] = await Promise.all([
                    getCmsCategories(),
                    getAllCmsTopics(),
                ]);
                if (!active) return;

                setCategories(extractCategories(categoryResult));
                setTopics(topicData);
                setFilterError("");
            } catch (err) {
                if (active) {
                    setFilterError(
                        err.message || "Gagal mengambil opsi filter."
                    );
                }
            }
        }

        loadFilterOptions();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!topicId) {
            return undefined;
        }

        let active = true;

        async function loadSelectedTopic() {
            try {
                const result = await getCmsTopicById(topicId);
                if (!active) return;

                const topic = result?.data ?? null;
                setSelectedTopic(topic);

                if (topic?.category?.slug && topic.category.slug !== categorySlug) {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.set("category", topic.category.slug);
                    setSearchParams(nextParams);
                }
            } catch (err) {
                if (active) {
                    setSelectedTopic(null);
                    setFilterError(
                        err.message || "Topik filter tidak dapat dimuat."
                    );
                }
            }
        }

        loadSelectedTopic();

        return () => {
            active = false;
        };
    }, [topicId, categorySlug, searchParams, setSearchParams]);

    useEffect(() => {
        let active = true;
        let changingPage = false;

        async function loadFaqs() {
            try {
                setLoading(true);
                setError("");

                const result = await getCmsFaqs({
                    search,
                    category: categorySlug,
                    topic: topicId,
                    status,
                    visibility,
                    page,
                    limit: 10,
                });

                if (!active) return;

                const nextMeta = result?.meta ?? null;

                if (nextMeta) {
                    const lastPage = Math.max(
                        1,
                        Number(nextMeta.totalPages) || 0
                    );

                    // Jika halaman terakhir kosong setelah penghapusan,
                    // kembali ke halaman terakhir yang masih tersedia.
                    if (page > lastPage) {
                        changingPage = true;
                        updateFilterParameters({ page: lastPage });
                        return;
                    }
                }

                setFaqs(
                    Array.isArray(result?.data)
                        ? result.data
                        : []
                );

                setMeta(nextMeta);
            } catch (err) {
                if (!active) return;

                setFaqs([]);
                setMeta(null);
                setError(
                    err.message || "Gagal mengambil daftar FAQ."
                );
            } finally {
                if (active && !changingPage) {
                    setLoading(false);
                }
            }
        }

        loadFaqs();

        return () => {
            active = false;
        };
    }, [
        search,
        categorySlug,
        topicId,
        status,
        visibility,
        page,
        refreshKey,
        updateFilterParameters,
    ]);

    function handleCategoryChange(event) {
        const nextCategory = event.target.value;
        const selected = topics.find(
            (topic) => String(topic.id) === topicId
        ) ?? (
            String(selectedTopic?.id) === topicId ? selectedTopic : null
        );
        const clearTopic =
            topicId &&
            nextCategory &&
            (!selected || selected.category?.slug !== nextCategory);

        updateFilterParameters({
            category: nextCategory,
            topic: clearTopic ? "" : topicId,
            page: 1,
        });
    }

    function handleTopicChange(event) {
        const nextTopicId = event.target.value;
        const nextTopic = topics.find(
            (topic) => String(topic.id) === nextTopicId
        );

        updateFilterParameters({
            topic: nextTopicId,
            category: nextTopic?.category?.slug ?? categorySlug,
            page: 1,
        });
    }

    function handleStatusChange(event) {
        updateFilterParameters({ status: event.target.value, page: 1 });
    }

    function handleVisibilityChange(event) {
        updateFilterParameters({ visibility: event.target.value, page: 1 });
    }

    function handlePreviousPage() {
        if (loading || page <= 1) return;

        updateFilterParameters({ page: page - 1 });
    }

    function handleNextPage() {
        if (loading || !meta?.hasNextPage) return;

        updateFilterParameters({ page: page + 1 });
    }

    function handleOpenDelete(faq) {
        if (deleteInProgress.current) return;

        setDeleteError("");
        setSuccess("");
        setFaqToDelete(faq);
    }

    function handleCancelDelete() {
        if (deleteInProgress.current) return;

        setFaqToDelete(null);
        setDeleteError("");
    }

    async function handleConfirmDelete() {
        if (!faqToDelete || deleteInProgress.current) return;

        try {
            deleteInProgress.current = true;
            setDeleting(true);
            setDeleteError("");

            await deleteCmsFaq(faqToDelete.id);

            setFaqToDelete(null);
            setSuccess("FAQ berhasil dihapus.");

            // Muat ulang daftar, jumlah FAQ, dan pagination.
            setLoading(true);
            setRefreshKey((current) => current + 1);
        } catch (err) {
            setDeleteError(
                err.message || "Gagal menghapus FAQ."
            );
        } finally {
            deleteInProgress.current = false;
            setDeleting(false);
        }
    }

    async function saveStatus(faq, isPublished) {
        if (!faq || statusChangingRef.current) return;

        try {
            statusChangingRef.current = true;
            setChangingStatusId(faq.id);
            setActionError("");
            const result = await updateCmsFaq(faq.id, { isPublished });
            const updatedFaq = result?.data ?? { ...faq, isPublished };
            setFaqs((current) =>
                current.map((item) =>
                    item.id === faq.id ? { ...item, ...updatedFaq } : item
                )
            );
            setSuccess(result?.message ?? "Status FAQ berhasil diperbarui.");
        } catch (err) {
            const message = err.message || "Gagal memperbarui status FAQ.";
            setActionError(message);
        } finally {
            statusChangingRef.current = false;
            setChangingStatusId(null);
        }
    }

    function handleStatusRequest(faq) {
        if (!faq) return;

        setSuccess("");
        setActionError("");
        saveStatus(faq, !faq.isPublished);
    }

    async function togglePopular(faq) {
        if (!faq || popularChangingRef.current) return;

        try {
            popularChangingRef.current = true;
            setPopularId(faq.id);
            setActionError("");
            const result = await updateCmsFaq(faq.id, {
                isPopular: !faq.isPopular,
            });
            const updatedFaq =
                result?.data ?? { ...faq, isPopular: !faq.isPopular };
            setFaqs((current) =>
                current.map((item) =>
                    item.id === faq.id
                        ? { ...item, ...updatedFaq }
                        : item
                )
            );
            setSuccess(
                updatedFaq.isPopular
                    ? "FAQ ditandai sebagai populer."
                    : "FAQ tidak lagi populer."
            );
        } catch (err) {
            const message =
                err.message || "Gagal memperbarui status populer.";

            setActionError(message);
        } finally {
            popularChangingRef.current = false;
            setPopularId(null);
        }
    }

    function clearTopicFilter() {
        updateFilterParameters({ topic: "", page: 1 });
    }

    const availableTopics = categorySlug
        ? topics.filter((topic) => topic.category?.slug === categorySlug)
        : topics;

    return (
        <section className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Kelola FAQ
                    </h1>

                    <p className="mt-2 text-slate-600">
                        Tambah, perbarui, dan hapus konten FAQ.
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
                <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_180px_180px_160px_180px]">
                    <FaqSearchInput
                        key={search}
                        search={search}
                        onSearchChange={updateFilterParameters}
                    />

                    <select
                        aria-label="Filter kategori"
                        value={categorySlug}
                        onChange={handleCategoryChange}
                        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    >
                        <option value="">Semua kategori</option>

                        {categories.map((category) => (
                            <option
                                key={category.id}
                                value={category.slug}
                            >
                                {category.name}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label="Filter topik"
                        value={topicId}
                        onChange={handleTopicChange}
                        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    >
                        <option value="">Semua topik</option>

                        {availableTopics.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                                {topic.name}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label="Filter status publikasi"
                        value={status}
                        onChange={handleStatusChange}
                        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    >
                        <option value="">Semua status</option>
                        <option value="published">Terbit</option>
                        <option value="draft">Draf</option>
                    </select>

                    <select
                        aria-label="Filter visibilitas"
                        value={visibility}
                        onChange={handleVisibilityChange}
                        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    >
                        <option value="">Semua visibilitas</option>
                        <option value="public">Publik</option>
                        <option value="authenticated">Pengguna terdaftar</option>
                    </select>
                </div>

                {success && (
                    <div
                        role="status"
                        className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700"
                    >
                        {success}
                    </div>
                )}

                {filterError && (
                    <div
                        role="alert"
                        className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800"
                    >
                        Filter tidak dapat dimuat: {filterError}
                    </div>
                )}

                {error && (
                    <div
                        role="alert"
                        className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600"
                    >
                        {error}
                    </div>
                )}

                {actionError && (
                    <div
                        role="alert"
                        className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600"
                    >
                        {actionError}
                    </div>
                )}

                {topicId && (
                    <div className="mt-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 py-1 pl-3 pr-1 text-sm text-blue-800">
                            <span>
                                Topik: {String(selectedTopic?.id) === topicId
                                    ? selectedTopic.name
                                    : "Memuat topik..."}
                            </span>
                            <button
                                type="button"
                                onClick={clearTopicFilter}
                                aria-label="Hapus filter topik"
                                title="Hapus filter topik"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-blue-700 transition hover:bg-blue-100 hover:text-blue-900"
                            >
                                <X size={16} aria-hidden="true" />
                            </button>
                        </span>
                    </div>
                )}

                <div className="mt-6 space-y-3 lg:hidden">
                    {loading ? (
                        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-slate-500">
                            Memuat data FAQ...
                        </p>
                    ) : error ? (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center">
                            <p className="text-slate-500">
                                Daftar FAQ belum dapat ditampilkan.
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    setRefreshKey(
                                        (current) => current + 1
                                    )
                                }
                                className="mt-3 font-semibold text-blue-600 hover:text-blue-800"
                            >
                                Coba lagi
                            </button>
                        </div>
                    ) : faqs.length === 0 ? (
                        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-slate-500">
                            FAQ tidak ditemukan.
                        </p>
                    ) : (
                        faqs.map((faq) => (
                            <article
                                key={faq.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="line-clamp-2 font-medium text-slate-900">
                                        {faq.question}
                                    </p>

                                    <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                                        <span
                                            className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                                                faq.isPublished
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-amber-100 text-amber-700"
                                            }`}
                                        >
                                            {faq.isPublished
                                                ? "Terbit"
                                                : "Draf"}
                                        </span>

                                        <VisibilityBadge value={faq.visibility} />

                                        {faq.isPopular && (
                                            <span className="inline-flex shrink-0 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                                                Populer
                                            </span>
                                        )}
                                    </span>
                                </div>

                                <dl className="mt-3 space-y-1 text-sm text-slate-600">
                                    <div className="flex gap-2">
                                        <dt className="w-20 shrink-0 text-slate-500">
                                            Kategori
                                        </dt>

                                        <dd className="min-w-0 break-words">
                                            {faq.category?.name ?? "-"}
                                        </dd>
                                    </div>

                                    <div className="flex gap-2">
                                        <dt className="w-20 shrink-0 text-slate-500">
                                            Topik
                                        </dt>

                                        <dd className="min-w-0 break-words">
                                            {faq.topic?.name ?? "-"}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="mt-4 flex gap-2">
                                    <PopularButton
                                        isPopular={faq.isPopular}
                                        loading={popularId === faq.id}
                                        onClick={() => togglePopular(faq)}
                                        className="flex-1"
                                    />
                                    <VisibilityButton
                                        isVisible={faq.isPublished}
                                        disableLabel="Jadikan FAQ sebagai draf"
                                        enableLabel="Terbitkan FAQ"
                                        loading={changingStatusId === faq.id}
                                        onClick={() => handleStatusRequest(faq)}
                                        className="flex-1"
                                    />
                                    <Link
                                        to={`/faqs/${faq.id}/edit`}
                                        aria-label={`Edit ${faq.question}`}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                                    >
                                        <Pencil size={17} />
                                        Edit
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleOpenDelete(faq)
                                        }
                                        disabled={deleting}
                                        aria-label={`Hapus ${faq.question}`}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Trash2 size={17} />
                                        Hapus
                                    </button>
                                </div>
                            </article>
                        ))
                    )}
                </div>

                <div className="mt-6 hidden overflow-x-auto lg:block">
                    <table
                        aria-label="Daftar FAQ"
                        aria-busy={loading}
                        className="w-full min-w-[800px] text-left"
                    >
                        <thead>
                            <tr className="border-b border-slate-200 text-sm text-slate-500">
                                <th scope="col" className="px-4 py-4">
                                    Pertanyaan
                                </th>
                                <th scope="col" className="px-4 py-4">
                                    Kategori
                                </th>
                                <th scope="col" className="px-4 py-4">
                                    Topik
                                </th>
                                <th scope="col" className="px-4 py-4">
                                    Status
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-4 text-right"
                                >
                                    Aksi
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-16 text-center text-slate-500"
                                    >
                                        Memuat data FAQ...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-16 text-center"
                                    >
                                        <p className="text-slate-500">
                                            Daftar FAQ belum dapat ditampilkan.
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRefreshKey(
                                                    (current) => current + 1
                                                )
                                            }
                                            className="mt-3 font-semibold text-blue-600 hover:text-blue-800"
                                        >
                                            Coba lagi
                                        </button>
                                    </td>
                                </tr>
                            ) : faqs.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
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
                                        </td>

                                        <td className="px-4 py-4 text-sm text-slate-600">
                                            {faq.category?.name ?? "-"}
                                        </td>

                                        <td className="px-4 py-4 text-sm text-slate-600">
                                            {faq.topic?.name ?? "-"}
                                        </td>

                                        <td className="px-4 py-4">
                                            <span className="flex flex-wrap gap-1.5">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${faq.isPublished
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-amber-100 text-amber-700"
                                                        }`}
                                                >
                                                    {faq.isPublished
                                                        ? "Terbit"
                                                        : "Draf"}
                                                </span>

                                                <VisibilityBadge value={faq.visibility} />

                                                {faq.isPopular && (
                                                    <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                                                        Populer
                                                    </span>
                                                )}
                                            </span>
                                        </td>

                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <PopularButton
                                                    isPopular={faq.isPopular}
                                                    loading={popularId === faq.id}
                                                    onClick={() => togglePopular(faq)}
                                                />
                                                <VisibilityButton
                                                    isVisible={faq.isPublished}
                                                    disableLabel="Jadikan FAQ sebagai draf"
                                                    enableLabel="Terbitkan FAQ"
                                                    loading={changingStatusId === faq.id}
                                                    onClick={() => handleStatusRequest(faq)}
                                                />
                                                <Link
                                                    to={`/faqs/${faq.id}/edit`}
                                                    aria-label={`Edit ${faq.question}`}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                                                >
                                                    <Pencil size={18} />
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleOpenDelete(faq)
                                                    }
                                                    disabled={deleting}
                                                    aria-label={`Hapus ${faq.question}`}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && !error && meta && (
                    <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                            Total {meta.totalItems} FAQ
                        </p>

                        <nav
                            aria-label="Pagination FAQ"
                            className="flex items-center gap-3"
                        >
                            <button
                                type="button"
                                aria-label="Halaman sebelumnya"
                                onClick={handlePreviousPage}
                                disabled={!meta.hasPreviousPage}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <span className="text-sm text-slate-600">
                                Halaman {meta.page} dari{" "}
                                {meta.totalPages || 1}
                            </span>

                            <button
                                type="button"
                                aria-label="Halaman selanjutnya"
                                onClick={handleNextPage}
                                disabled={!meta.hasNextPage}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </nav>
                    </div>
                )}
            </div>

            <DeleteFaqModal
                faq={faqToDelete}
                deleting={deleting}
                error={deleteError}
                onCancel={handleCancelDelete}
                onConfirm={handleConfirmDelete}
            />
        </section>
    );
}

function readPage(value) {
    return /^\d+$/.test(value ?? "") && Number(value) >= 1
        ? Number(value)
        : 1;
}

async function getAllCmsTopics() {
    const topics = [];
    let page = 1;

    while (true) {
        const result = await getCmsTopics({ page, limit: 50 });
        topics.push(
            ...(Array.isArray(result?.data) ? result.data : [])
        );

        const totalPages = Math.max(
            1,
            Number(result?.meta?.totalPages) || 0
        );
        if (page >= totalPages) {
            return topics;
        }

        page += 1;
    }
}
