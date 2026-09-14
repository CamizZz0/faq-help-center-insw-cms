import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteCmsGuide, getCmsGuides, updateCmsGuide } from "../../services/api";
import DeleteGuideModal from "../../components/cms/DeleteGuideModal";
import StatusConfirmModal from "../../components/cms/StatusConfirmModal";
import VisibilityButton from "../../components/cms/VisibilityButton";

export default function GuideListPage() {
    const location = useLocation();
    const [success, setSuccess] = useState(location.state?.message ?? "");
    const [guides, setGuides] = useState([]);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [guideToDelete, setGuideToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [guideToChangeStatus, setGuideToChangeStatus] = useState(null);
    const [changingStatusId, setChangingStatusId] = useState(null);
    const [statusError, setStatusError] = useState("");
    const deletingRef = useRef(false);
    const statusChangingRef = useRef(false);

    useEffect(() => {
        let active = true;
        async function loadGuides() {
            try {
                setLoading(true);
                setError("");
                const result = await getCmsGuides({ search, status, page, limit: 10 });
                if (!active) return;
                const lastPage = Math.max(result.meta.totalPages, 1);
                if (page > lastPage) { setPage(lastPage); return; }
                setGuides(result.data);
                setMeta(result.meta);
            } catch (err) {
                if (active) { setError(err.message); setGuides([]); setMeta(null); }
            } finally {
                if (active) setLoading(false);
            }
        }
        loadGuides();
        return () => { active = false; };
    }, [search, status, page, refreshKey]);

    function cancelDelete() {
        if (deletingRef.current) return;
        setGuideToDelete(null);
        setDeleteError("");
    }

    async function confirmDelete() {
        if (!guideToDelete || deletingRef.current) return;
        try {
            deletingRef.current = true;
            setDeleting(true);
            setDeleteError("");
            const result = await deleteCmsGuide(guideToDelete.id);
            setGuideToDelete(null);
            setSuccess(result.message);
            setRefreshKey(value => value + 1);
        } catch (err) {
            setDeleteError(err.message);
        } finally {
            deletingRef.current = false;
            setDeleting(false);
        }
    }

    async function saveStatus(guide, isPublished) {
        if (!guide || statusChangingRef.current) return;
        try {
            statusChangingRef.current = true;
            setChangingStatusId(guide.id);
            setActionError("");
            setStatusError("");
            const payload = new FormData();
            payload.set("isPublished", String(isPublished));
            const result = await updateCmsGuide(guide.id, payload);
            const updatedGuide = result?.data ?? { ...guide, isPublished };
            setGuides((current) => current.map((item) =>
                item.id === guide.id ? { ...item, ...updatedGuide } : item
            ));
            setSuccess(result?.message ?? "Status panduan berhasil diperbarui.");
            setGuideToChangeStatus(null);
        } catch (err) {
            const message = err.message || "Gagal memperbarui status panduan.";
            setStatusError(message);
            setActionError(message);
        } finally {
            statusChangingRef.current = false;
            setChangingStatusId(null);
        }
    }

    function handleStatusRequest(guide) {
        setSuccess("");
        setActionError("");
        setStatusError("");
        if (guide.isPublished) {
            setGuideToChangeStatus(guide);
            return;
        }
        saveStatus(guide, true);
    }

    return (
        <section className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Kelola Panduan</h1>
                    <p className="mt-2 text-slate-600">Tambah, perbarui, dan hapus dokumen panduan.</p>
                </div>
                <Link to="/guides/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700">
                    <Plus size={20} />Tambah Panduan
                </Link>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
                    <form role="search" onSubmit={event => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); }} className="relative">
                        <button type="submit" aria-label="Cari panduan" className="absolute inset-y-0 left-0 flex w-11 items-center justify-center rounded-l-xl text-slate-400 hover:text-blue-600">
                            <Search size={20} aria-hidden="true" />
                        </button>
                        <input id="guide-search" type="search" aria-label="Cari judul panduan" placeholder="Cari judul panduan..." value={searchInput} onChange={event => setSearchInput(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </form>
                    <select id="guide-status-filter" aria-label="Filter status publikasi" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}
                        className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500">
                        <option value="">Semua status</option><option value="published">Terbit</option><option value="draft">Draf</option>
                    </select>
                </div>

                {success && <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{success}</p>}
                {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">{error}</p>}
                {actionError && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">{actionError}</p>}

                <div className="mt-6 space-y-3 lg:hidden">
                    {loading ? (
                        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-slate-500">
                            Memuat data panduan...
                        </p>
                    ) : error ? (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center">
                            <p className="text-slate-500">
                                Daftar panduan belum dapat ditampilkan.
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
                    ) : guides.length === 0 ? (
                        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-slate-500">
                            Panduan tidak ditemukan.
                        </p>
                    ) : (
                        guides.map((guide) => (
                            <article
                                key={guide.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-start gap-2">
                                        <FileText
                                            size={18}
                                            aria-hidden="true"
                                            className="mt-0.5 shrink-0 text-slate-400"
                                        />

                                        <p
                                            className="line-clamp-2 font-medium text-slate-900"
                                            title={guide.title}
                                        >
                                            {guide.title}
                                        </p>
                                    </div>

                                    <span
                                        className={
                                            "inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold " +
                                            (guide.isPublished
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-700")
                                        }
                                    >
                                        {guide.isPublished
                                            ? "Terbit"
                                            : "Draf"}
                                    </span>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <VisibilityButton
                                        isVisible={guide.isPublished}
                                        disableLabel="Jadikan panduan sebagai draf"
                                        enableLabel="Terbitkan panduan"
                                        loading={changingStatusId === guide.id}
                                        onClick={() => handleStatusRequest(guide)}
                                        className="flex-1"
                                    />
                                    <Link
                                        to={"/guides/" + guide.id + "/edit"}
                                        aria-label={`Edit ${guide.title}`}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                                    >
                                        <Pencil size={17} />
                                        Edit
                                    </Link>

                                    <button
                                        type="button"
                                        disabled={deleting}
                                        aria-label={`Hapus ${guide.title}`}
                                        onClick={() => {
                                            setGuideToDelete(guide);
                                            setDeleteError("");
                                            setSuccess("");
                                        }}
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
                    <table aria-label="Daftar Panduan" aria-busy={loading} className="w-full min-w-[600px] text-left">
                        <thead>
                            <tr className="border-b border-slate-200 text-sm text-slate-500">
                                <th scope="col" className="px-4 py-4">Judul</th>
                                <th scope="col" className="px-4 py-4">Status</th>
                                <th scope="col" className="px-4 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={3} className="px-4 py-16 text-center text-slate-500">Memuat data panduan...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={3} className="px-4 py-16 text-center text-slate-500">Daftar panduan belum dapat ditampilkan.</td></tr>
                            ) : guides.length === 0 ? (
                                <tr><td colSpan={3} className="px-4 py-16 text-center text-slate-500">Panduan tidak ditemukan.</td></tr>
                            ) : guides.map(guide => (
                                <tr key={guide.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                                    <td className="max-w-md px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <FileText size={18} aria-hidden="true" className="shrink-0 text-slate-400" />
                                            <p className="line-clamp-2 font-medium text-slate-900" title={guide.title}>{guide.title}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + (guide.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{guide.isPublished ? "Terbit" : "Draf"}</span>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <VisibilityButton
                                                isVisible={guide.isPublished}
                                                disableLabel="Jadikan panduan sebagai draf"
                                                enableLabel="Terbitkan panduan"
                                                loading={changingStatusId === guide.id}
                                                onClick={() => handleStatusRequest(guide)}
                                            />
                                            <Link to={"/guides/" + guide.id + "/edit"} aria-label={"Edit " + guide.title} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600">
                                                <Pencil size={18} />
                                            </Link>
                                            <button type="button" disabled={deleting} aria-label={"Hapus " + guide.title} onClick={() => { setGuideToDelete(guide); setDeleteError(""); setSuccess(""); }}
                                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!loading && !error && meta && (
                    <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">Total {meta.totalItems} panduan</p>
                        <nav aria-label="Pagination panduan" className="flex items-center gap-3">
                            <button type="button" aria-label="Halaman sebelumnya" disabled={!meta.hasPreviousPage} onClick={() => setPage(value => value - 1)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={18} /></button>
                            <span className="text-sm text-slate-600">Halaman {meta.page} dari {meta.totalPages || 1}</span>
                            <button type="button" aria-label="Halaman selanjutnya" disabled={!meta.hasNextPage} onClick={() => setPage(value => value + 1)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={18} /></button>
                        </nav>
                    </div>
                )}
            </div>
            <DeleteGuideModal guide={guideToDelete} deleting={deleting} error={deleteError} onCancel={cancelDelete} onConfirm={confirmDelete} />
            <StatusConfirmModal
                item={guideToChangeStatus}
                message="Jadikan panduan sebagai draf? Panduan tidak akan tampil di halaman publik."
                confirmLabel="Jadikan draf"
                saving={changingStatusId === guideToChangeStatus?.id}
                error={statusError}
                onCancel={() => {
                    if (!statusChangingRef.current) {
                        setGuideToChangeStatus(null);
                        setStatusError("");
                    }
                }}
                onConfirm={() => saveStatus(guideToChangeStatus, false)}
            />
        </section>
    );
}
