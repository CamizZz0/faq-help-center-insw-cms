import { useEffect, useRef, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Pencil,
    Plus,
    Search,
    Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import DeleteTopicModal from "../../components/cms/DeleteTopicModal";
import {
    deleteCmsTopic,
    getCmsCategories,
    getCmsSubcategories,
    getCmsTopics,
} from "../../services/api";

function extractList(result) {
    return Array.isArray(result?.data) ? result.data : [];
}

function formatDeleteError(error) {
    const faqCount = Number(error?.data?.faqCount);
    if (Number.isInteger(faqCount) && faqCount > 0) {
        return (
            `Topik tidak dapat dihapus karena masih memiliki ${faqCount} FAQ. ` +
            "Hapus atau pindahkan FAQ tersebut terlebih dahulu."
        );
    }
    return error.message || "Gagal menghapus topik.";
}

export default function TopicListPage() {
    const [topics, setTopics] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [categorySlug, setCategorySlug] = useState("");
    const [subcategorySlug, setSubcategorySlug] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingSubcategories, setLoadingSubcategories] = useState(true);
    const [error, setError] = useState("");
    const [filterError, setFilterError] = useState("");
    const [topicToDelete, setTopicToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [success, setSuccess] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const deleteInProgress = useRef(false);

    useEffect(() => {
        let active = true;
        getCmsCategories()
            .then((result) => {
                if (active) setCategories(extractList(result));
            })
            .catch((requestError) => {
                if (active) setFilterError(requestError.message);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        getCmsSubcategories({ category: categorySlug, limit: 50 })
            .then((result) => {
                if (active) {
                    setSubcategories(extractList(result));
                    setFilterError("");
                }
            })
            .catch((requestError) => {
                if (active) {
                    setSubcategories([]);
                    setFilterError(requestError.message);
                }
            })
            .finally(() => {
                if (active) setLoadingSubcategories(false);
            });
        return () => { active = false; };
    }, [categorySlug]);

    useEffect(() => {
        const keyword = searchInput.trim();
        if (keyword === search) return;
        const timeoutId = setTimeout(() => {
            setSearch(keyword);
            setPage(1);
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [searchInput, search]);

    useEffect(() => {
        let active = true;
        let changingPage = false;

        async function loadTopics() {
            try {
                setLoading(true);
                setError("");
                const result = await getCmsTopics({
                    search,
                    category: categorySlug,
                    subcategory: subcategorySlug,
                    status,
                    page,
                    limit: 10,
                });
                if (!active) return;

                const nextMeta = result?.meta ?? null;
                const lastPage = Math.max(1, Number(nextMeta?.totalPages) || 0);
                if (page > lastPage) {
                    changingPage = true;
                    setPage(lastPage);
                    return;
                }

                setTopics(extractList(result));
                setMeta(nextMeta);
            } catch (requestError) {
                if (active) {
                    setTopics([]);
                    setMeta(null);
                    setError(requestError.message || "Gagal mengambil daftar topik.");
                }
            } finally {
                if (active && !changingPage) setLoading(false);
            }
        }

        loadTopics();
        return () => { active = false; };
    }, [search, categorySlug, subcategorySlug, status, page, refreshKey]);

    async function handleConfirmDelete() {
        if (!topicToDelete || deleteInProgress.current) return;

        try {
            deleteInProgress.current = true;
            setDeleting(true);
            setDeleteError("");
            await deleteCmsTopic(topicToDelete.id);
            setTopicToDelete(null);
            setSuccess("Topik berhasil dihapus.");
            setLoading(true);
            setRefreshKey((current) => current + 1);
        } catch (requestError) {
            setDeleteError(formatDeleteError(requestError));
        } finally {
            deleteInProgress.current = false;
            setDeleting(false);
        }
    }

    return (
        <section className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Kelola Topik</h1>
                    <p className="mt-2 text-slate-600">
                        Kelola topik pertanyaan di dalam setiap subkategori FAQ.
                    </p>
                </div>
                <Link
                    to="/topics/new"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                    <Plus size={20} /> Tambah Topik
                </Link>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(280px,1fr)_220px_220px_180px]">
                    <div className="relative">
                        <Search size={20} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            aria-label="Cari topik"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Cari topik..."
                            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                    <select
                        aria-label="Filter kategori"
                        value={categorySlug}
                        onChange={(event) => {
                            setCategorySlug(event.target.value);
                            setSubcategorySlug("");
                            setPage(1);
                        }}
                        className="h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="">Semua kategori</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.slug}>{category.name}</option>
                        ))}
                    </select>
                    <select
                        aria-label="Filter subkategori"
                        value={subcategorySlug}
                        disabled={loadingSubcategories}
                        onChange={(event) => {
                            setSubcategorySlug(event.target.value);
                            setPage(1);
                        }}
                        className="h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                        <option value="">{loadingSubcategories ? "Memuat subkategori..." : "Semua subkategori"}</option>
                        {subcategories.map((subcategory) => (
                            <option key={subcategory.id} value={subcategory.slug}>{subcategory.name}</option>
                        ))}
                    </select>
                    <select
                        aria-label="Filter status"
                        value={status}
                        onChange={(event) => { setStatus(event.target.value); setPage(1); }}
                        className="h-12 min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="">Semua status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Tidak aktif</option>
                    </select>
                </div>

                {success && <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{success}</div>}
                {filterError && <div role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Filter tidak dapat dimuat: {filterError}</div>}
                {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>}

                <div className="mt-6 space-y-3 lg:hidden">
                    {loading ? (
                        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-slate-500">
                            Memuat data topik...
                        </p>
                    ) : error ? (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center">
                            <p className="text-slate-500">
                                Daftar topik belum dapat ditampilkan.
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
                    ) : topics.length === 0 ? (
                        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-slate-500">
                            Topik tidak ditemukan.
                        </p>
                    ) : (
                        topics.map((topic) => (
                            <article
                                key={topic.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 break-words font-medium text-slate-900">
                                        {topic.name}
                                    </p>

                                    <span
                                        className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                                            topic.isActive
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                        {topic.isActive
                                            ? "Aktif"
                                            : "Tidak aktif"}
                                    </span>
                                </div>

                                <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                                    {topic.description ||
                                        "Tidak ada deskripsi."}
                                </p>

                                <dl className="mt-3 space-y-1 text-sm text-slate-600">
                                    <div className="flex gap-2">
                                        <dt className="w-24 shrink-0 text-slate-500">
                                            Subkategori
                                        </dt>

                                        <dd className="min-w-0 break-words">
                                            {topic.subcategory?.name ?? "-"}
                                        </dd>
                                    </div>

                                    <div className="flex gap-2">
                                        <dt className="w-24 shrink-0 text-slate-500">
                                            Kategori
                                        </dt>

                                        <dd className="min-w-0 break-words">
                                            {topic.category?.name ?? "-"}
                                        </dd>
                                    </div>

                                    <div className="flex gap-2">
                                        <dt className="w-24 shrink-0 text-slate-500">
                                            Jumlah FAQ
                                        </dt>

                                        <dd className="min-w-0">
                                            {topic.faqCount ?? 0}
                                        </dd>
                                    </div>

                                    <div className="flex gap-2">
                                        <dt className="w-24 shrink-0 text-slate-500">
                                            Urutan
                                        </dt>

                                        <dd className="min-w-0">
                                            {topic.sortOrder}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="mt-4 flex gap-2">
                                    <Link
                                        to={`/topics/${topic.id}/edit`}
                                        aria-label={`Edit ${topic.name}`}
                                        title={`Edit ${topic.name}`}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                                    >
                                        <Pencil size={17} />
                                        Edit
                                    </Link>

                                    <button
                                        type="button"
                                        disabled={deleting}
                                        onClick={() => {
                                            setDeleteError("");
                                            setSuccess("");
                                            setTopicToDelete(topic);
                                        }}
                                        aria-label={`Hapus ${topic.name}`}
                                        title={`Hapus ${topic.name}`}
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
                    <table aria-label="Daftar topik" aria-busy={loading} className="w-full min-w-[1050px] text-left">
                        <thead>
                            <tr className="border-b border-slate-200 text-sm text-slate-500">
                                <th className="px-4 py-4">Topik</th>
                                <th className="px-4 py-4">Subkategori</th>
                                <th className="px-4 py-4">Kategori</th>
                                <th className="px-4 py-4">Jumlah FAQ</th>
                                <th className="px-4 py-4">Urutan</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-500">Memuat data topik...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={7} className="px-4 py-16 text-center"><p className="text-slate-500">Daftar topik belum dapat ditampilkan.</p><button type="button" onClick={() => setRefreshKey((current) => current + 1)} className="mt-3 font-semibold text-blue-600 hover:text-blue-800">Coba lagi</button></td></tr>
                            ) : topics.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-500">Topik tidak ditemukan.</td></tr>
                            ) : topics.map((topic) => (
                                <tr key={topic.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                                    <td className="max-w-md px-4 py-4"><p className="font-medium text-slate-900">{topic.name}</p><p className="mt-1 line-clamp-2 text-sm text-slate-500">{topic.description || "Tidak ada deskripsi."}</p></td>
                                    <td className="px-4 py-4 text-sm text-slate-600">{topic.subcategory?.name ?? "-"}</td>
                                    <td className="px-4 py-4 text-sm text-slate-600">{topic.category?.name ?? "-"}</td>
                                    <td className="px-4 py-4 text-sm text-slate-600">{topic.faqCount ?? 0}</td>
                                    <td className="px-4 py-4 text-sm text-slate-600">{topic.sortOrder}</td>
                                    <td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${topic.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{topic.isActive ? "Aktif" : "Tidak aktif"}</span></td>
                                    <td className="px-4 py-4 text-right"><div className="flex items-center justify-end gap-2"><Link to={`/topics/${topic.id}/edit`} aria-label={`Edit ${topic.name}`} title={`Edit ${topic.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={18} /></Link><button type="button" disabled={deleting} onClick={() => { setDeleteError(""); setSuccess(""); setTopicToDelete(topic); }} aria-label={`Hapus ${topic.name}`} title={`Hapus ${topic.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:border-red-400 hover:bg-red-50 disabled:opacity-50"><Trash2 size={18} /></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!loading && !error && meta && (
                    <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">Total {meta.totalItems} topik</p>
                        <nav aria-label="Pagination topik" className="flex items-center gap-3">
                            <button type="button" aria-label="Halaman sebelumnya" disabled={!meta.hasPreviousPage} onClick={() => { if (!loading && page > 1) setPage((current) => current - 1); }} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={18} /></button>
                            <span className="text-sm text-slate-600">Halaman {meta.page} dari {meta.totalPages || 1}</span>
                            <button type="button" aria-label="Halaman selanjutnya" disabled={!meta.hasNextPage} onClick={() => { if (!loading && meta.hasNextPage) setPage((current) => current + 1); }} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={18} /></button>
                        </nav>
                    </div>
                )}
            </div>

            <DeleteTopicModal
                topic={topicToDelete}
                deleting={deleting}
                error={deleteError}
                onCancel={() => { if (!deleteInProgress.current) { setTopicToDelete(null); setDeleteError(""); } }}
                onConfirm={handleConfirmDelete}
            />
        </section>
    );
}
