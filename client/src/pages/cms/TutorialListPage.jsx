import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Pencil, PlayCircle, Plus, Search, Trash2 } from "lucide-react";
import { deleteCmsTutorial, getCmsTutorials } from "../../services/api";
import DeleteTutorialModal from "../../components/cms/DeleteTutorialModal";

export default function TutorialListPage() {
    const location = useLocation();
    const [success, setSuccess] = useState(location.state?.message ?? "");
    const [tutorials, setTutorials] = useState([]);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [tutorialToDelete, setTutorialToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const deletingRef = useRef(false);

    useEffect(() => {
        const keyword = searchInput.trim();
        if (keyword === search) return;
        const timeout = setTimeout(() => { setSearch(keyword); setPage(1); }, 400);
        return () => clearTimeout(timeout);
    }, [searchInput, search]);

    useEffect(() => {
        let active = true;
        async function load() {
            try {
                setLoading(true);
                setError("");
                const result = await getCmsTutorials({ page, limit: 10, search, status });
                if (!active) return;
                setTutorials(result.data ?? []);
                setMeta(result.meta ?? null);
            } catch (err) { if (active) setError(err.message); }
            finally { if (active) setLoading(false); }
        }
        load();
        return () => { active = false; };
    }, [page, search, status, refreshKey]);

    async function confirmDelete() {
        if (!tutorialToDelete || deletingRef.current) return;
        deletingRef.current = true;
        setDeleting(true);
        setDeleteError("");
        try {
            const result = await deleteCmsTutorial(tutorialToDelete.id);
            setTutorialToDelete(null);
            setSuccess(result.message);
            if (tutorials.length === 1 && page > 1) setPage((current) => current - 1);
            else setRefreshKey((current) => current + 1);
        } catch (err) { setDeleteError(err.message); }
        finally { deletingRef.current = false; setDeleting(false); }
    }

    return (
        <section className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div><h1 className="text-3xl font-bold text-slate-900">Kelola Tutorial</h1><p className="mt-2 text-slate-600">Tambah, perbarui, dan hapus video tutorial.</p></div>
                <Link to="/tutorials/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"><Plus size={19} />Tambah Tutorial</Link>
            </div>

            {success && <div role="status" className="mt-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700"><span>{success}</span><button type="button" onClick={() => setSuccess("")} className="font-semibold">Tutup</button></div>}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
                    <label className="relative"><span className="sr-only">Cari tutorial</span><Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari judul tutorial..." className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                    <select aria-label="Filter status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"><option value="">Semua status</option><option value="published">Terbit</option><option value="draft">Draft</option></select>
                </div>
            </div>

            <div className="mt-6 space-y-3 lg:hidden">
                {loading ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-slate-500">
                        Memuat data tutorial...
                    </p>
                ) : error ? (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center">
                        <p className="text-slate-500">
                            Daftar tutorial belum dapat ditampilkan.
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
                ) : tutorials.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                        <PlayCircle
                            size={40}
                            className="mx-auto text-slate-400"
                        />

                        <h2 className="mt-3 font-semibold text-slate-900">
                            Tutorial belum tersedia
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Tambahkan tutorial atau ubah filter
                            pencarian.
                        </p>
                    </div>
                ) : (
                    tutorials.map((tutorial) => (
                        <article
                            key={tutorial.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                            <div className="flex items-start gap-3">
                                <img
                                    src={tutorial.thumbnailUrl}
                                    alt=""
                                    className="h-16 w-24 shrink-0 rounded-lg bg-slate-100 object-cover"
                                />

                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 font-semibold text-slate-900">
                                        {tutorial.title}
                                    </p>

                                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                        {tutorial.description ||
                                            tutorial.videoUrl}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center gap-3">
                                <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                        tutorial.isPublished
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-amber-50 text-amber-700"
                                    }`}
                                >
                                    {tutorial.isPublished
                                        ? "Terbit"
                                        : "Draft"}
                                </span>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <Link
                                    to={`/tutorials/${tutorial.id}/edit`}
                                    aria-label={`Edit ${tutorial.title}`}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                                >
                                    <Pencil size={17} />
                                    Edit
                                </Link>

                                <button
                                    type="button"
                                    aria-label={`Hapus ${tutorial.title}`}
                                    onClick={() => {
                                        setTutorialToDelete(tutorial);
                                        setDeleteError("");
                                    }}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50"
                                >
                                    <Trash2 size={17} />
                                    Hapus
                                </button>
                            </div>
                        </article>
                    ))
                )}
            </div>

            <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white lg:block">
                {loading ? <p className="p-8 text-center text-slate-600">Memuat data tutorial...</p>
                    : error ? <p role="alert" className="m-5 rounded-xl bg-red-50 p-4 text-red-600">{error}</p>
                    : tutorials.length === 0 ? <div className="p-10 text-center"><PlayCircle size={40} className="mx-auto text-slate-400" /><h2 className="mt-3 font-semibold text-slate-900">Tutorial belum tersedia</h2><p className="mt-1 text-sm text-slate-500">Tambahkan tutorial atau ubah filter pencarian.</p></div>
                    : <div className="overflow-x-auto"><table className="w-full min-w-[700px] table-fixed text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-[70%] px-5 py-4">Tutorial</th><th className="w-[15%] px-5 py-4">Status</th><th className="w-[15%] px-5 py-4 text-right">Aksi</th></tr></thead>
                        <tbody className="divide-y divide-slate-200">{tutorials.map((tutorial) => <tr key={tutorial.id} className="h-24 text-sm text-slate-700"><td className="px-5 py-4"><div className="flex items-center gap-4"><img src={tutorial.thumbnailUrl} alt="" className="h-14 w-24 shrink-0 rounded-lg bg-slate-100 object-cover" /><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{tutorial.title}</p><p className="mt-1 truncate text-xs text-slate-500">{tutorial.description || tutorial.videoUrl}</p></div></div></td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tutorial.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{tutorial.isPublished ? "Terbit" : "Draft"}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Link to={`/tutorials/${tutorial.id}/edit`} aria-label={`Edit ${tutorial.title}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"><Pencil size={17} /></Link><button type="button" aria-label={`Hapus ${tutorial.title}`} onClick={() => { setTutorialToDelete(tutorial); setDeleteError(""); }} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button></div></td></tr>)}</tbody></table></div>}
            </div>

            {!loading && !error && meta && meta.totalPages > 1 && <div className="mt-6 flex items-center justify-between gap-4"><p className="text-sm text-slate-500">Halaman {meta.page} dari {meta.totalPages}</p><div className="flex gap-2"><button type="button" disabled={!meta.hasPreviousPage} onClick={() => setPage((value) => value - 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40"><ChevronLeft size={18} /></button><button type="button" disabled={!meta.hasNextPage} onClick={() => setPage((value) => value + 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-40"><ChevronRight size={18} /></button></div></div>}
            <DeleteTutorialModal tutorial={tutorialToDelete} deleting={deleting} error={deleteError} onCancel={() => { if (!deleting) setTutorialToDelete(null); }} onConfirm={confirmDelete} />
        </section>
    );
}
