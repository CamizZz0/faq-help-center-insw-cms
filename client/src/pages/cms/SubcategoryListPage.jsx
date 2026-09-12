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

import {
    deleteCmsSubcategory,
    getCmsCategories,
    getCmsSubcategories,
} from "../../services/api";

import DeleteSubcategoryModal from "../../components/cms/DeleteSubcategoryModal";

function extractCategories(result) {
    if (Array.isArray(result?.data)) {
        return result.data;
    }

    if (Array.isArray(result?.data?.categories)) {
        return result.data.categories;
    }

    return [];
}

function formatDeleteError(err) {
    const topicCount = Number(err?.data?.topicCount);

    if (Number.isInteger(topicCount) && topicCount > 0) {
        return (
            `Subkategori tidak dapat dihapus karena masih memiliki ${topicCount} topik. ` +
            "Hapus atau pindahkan topik tersebut terlebih dahulu."
        );
    }

    return err.message || "Gagal menghapus subkategori.";
}

export default function SubcategoryListPage() {
    const [subcategories, setSubcategories] = useState([]);
    const [categories, setCategories] = useState([]);
    const [meta, setMeta] = useState(null);

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [categorySlug, setCategorySlug] = useState("");
    const [status, setStatus] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [categoryError, setCategoryError] = useState("");

    const [subcategoryToDelete, setSubcategoryToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [success, setSuccess] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    const deleteInProgress = useRef(false);

    useEffect(() => {
        let active = true;

        async function loadCategories() {
            try {
                const result = await getCmsCategories();

                if (!active) return;

                setCategories(extractCategories(result));
                setCategoryError("");
            } catch (err) {
                if (active) {
                    setCategoryError(
                        err.message || "Gagal mengambil kategori."
                    );
                }
            }
        }

        loadCategories();

        return () => {
            active = false;
        };
    }, []);

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

        async function loadSubcategories() {
            try {
                setLoading(true);
                setError("");

                const result = await getCmsSubcategories({
                    search,
                    category: categorySlug,
                    status,
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

                    if (page > lastPage) {
                        changingPage = true;
                        setPage(lastPage);
                        return;
                    }
                }

                setSubcategories(
                    Array.isArray(result?.data) ? result.data : []
                );
                setMeta(nextMeta);
            } catch (err) {
                if (!active) return;

                setSubcategories([]);
                setMeta(null);
                setError(
                    err.message || "Gagal mengambil daftar subkategori."
                );
            } finally {
                if (active && !changingPage) {
                    setLoading(false);
                }
            }
        }

        loadSubcategories();

        return () => {
            active = false;
        };
    }, [search, categorySlug, status, page, refreshKey]);

    function handleOpenDelete(subcategory) {
        if (deleteInProgress.current) return;

        setDeleteError("");
        setSuccess("");
        setSubcategoryToDelete(subcategory);
    }

    function handleCancelDelete() {
        if (deleteInProgress.current) return;

        setSubcategoryToDelete(null);
        setDeleteError("");
    }

    async function handleConfirmDelete() {
        if (!subcategoryToDelete || deleteInProgress.current) return;

        try {
            deleteInProgress.current = true;
            setDeleting(true);
            setDeleteError("");

            await deleteCmsSubcategory(subcategoryToDelete.id);

            setSubcategoryToDelete(null);
            setSuccess("Subkategori berhasil dihapus.");
            setLoading(true);
            setRefreshKey((current) => current + 1);
        } catch (err) {
            setDeleteError(formatDeleteError(err));
        } finally {
            deleteInProgress.current = false;
            setDeleting(false);
        }
    }

    return (
        <section className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Kelola Subkategori
                    </h1>

                    <p className="mt-2 text-slate-600">
                        Kelola pengelompokan layanan di dalam setiap kategori FAQ.
                    </p>
                </div>

                <Link
                    to="/subcategories/new"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                    <Plus size={20} />
                    Tambah Subkategori
                </Link>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_240px_180px]">
                    <div className="relative">
                        <Search
                            size={20}
                            aria-hidden="true"
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="search"
                            aria-label="Cari subkategori"
                            value={searchInput}
                            onChange={(event) =>
                                setSearchInput(event.target.value)
                            }
                            placeholder="Cari subkategori..."
                            className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <select
                        aria-label="Filter kategori"
                        value={categorySlug}
                        onChange={(event) => {
                            setCategorySlug(event.target.value);
                            setPage(1);
                        }}
                        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    >
                        <option value="">Semua kategori</option>

                        {categories.map((category) => (
                            <option key={category.id} value={category.slug}>
                                {category.name}
                            </option>
                        ))}
                    </select>

                    <select
                        aria-label="Filter status"
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            setPage(1);
                        }}
                        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    >
                        <option value="">Semua status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Tidak aktif</option>
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

                {categoryError && (
                    <div
                        role="alert"
                        className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800"
                    >
                        Filter kategori tidak dapat dimuat: {categoryError}
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

                <div className="mt-6 overflow-x-auto">
                    <table
                        aria-label="Daftar subkategori"
                        aria-busy={loading}
                        className="w-full min-w-[800px] text-left"
                    >
                        <thead>
                            <tr className="border-b border-slate-200 text-sm text-slate-500">
                                <th scope="col" className="px-4 py-4">
                                    Subkategori
                                </th>
                                <th scope="col" className="px-4 py-4">
                                    Kategori
                                </th>
                                <th scope="col" className="px-4 py-4">
                                    Jumlah Topik
                                </th>
                                <th scope="col" className="px-4 py-4">
                                    Urutan
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
                                        colSpan={6}
                                        className="px-4 py-16 text-center text-slate-500"
                                    >
                                        Memuat data subkategori...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-16 text-center"
                                    >
                                        <p className="text-slate-500">
                                            Daftar subkategori belum dapat ditampilkan.
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
                            ) : subcategories.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-16 text-center text-slate-500"
                                    >
                                        Subkategori tidak ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                subcategories.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-slate-100 last:border-none hover:bg-slate-50"
                                    >
                                        <td className="max-w-md px-4 py-4">
                                            <p className="font-medium text-slate-900">
                                                {item.name}
                                            </p>
                                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                                {item.description ||
                                                    "Tidak ada deskripsi."}
                                            </p>
                                        </td>

                                        <td className="px-4 py-4 text-sm text-slate-600">
                                            {item.category?.name ?? "-"}
                                        </td>

                                        <td className="px-4 py-4 text-sm text-slate-600">
                                            {item.topicCount ?? 0}
                                        </td>

                                        <td className="px-4 py-4 text-sm text-slate-600">
                                            {item.sortOrder}
                                        </td>

                                        <td className="px-4 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                                    item.isActive
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : "bg-slate-200 text-slate-600"
                                                }`}
                                            >
                                                {item.isActive
                                                    ? "Aktif"
                                                    : "Tidak aktif"}
                                            </span>
                                        </td>

                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/subcategories/${item.id}/edit`}
                                                    aria-label={`Edit ${item.name}`}
                                                    title={`Edit ${item.name}`}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                                                >
                                                    <Pencil size={18} />
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleOpenDelete(item)
                                                    }
                                                    disabled={deleting}
                                                    aria-label={`Hapus ${item.name}`}
                                                    title={`Hapus ${item.name}`}
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
                            Total {meta.totalItems} subkategori
                        </p>

                        <nav
                            aria-label="Pagination subkategori"
                            className="flex items-center gap-3"
                        >
                            <button
                                type="button"
                                aria-label="Halaman sebelumnya"
                                onClick={() => {
                                    if (!loading && page > 1) {
                                        setPage((current) => current - 1);
                                    }
                                }}
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
                                onClick={() => {
                                    if (!loading && meta?.hasNextPage) {
                                        setPage((current) => current + 1);
                                    }
                                }}
                                disabled={!meta.hasNextPage}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </nav>
                    </div>
                )}
            </div>

            <DeleteSubcategoryModal
                subcategory={subcategoryToDelete}
                deleting={deleting}
                error={deleteError}
                onCancel={handleCancelDelete}
                onConfirm={handleConfirmDelete}
            />
        </section>
    );
}
