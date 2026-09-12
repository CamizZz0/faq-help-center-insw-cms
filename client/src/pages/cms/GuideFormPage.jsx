import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, FileText, Save, Upload, X } from "lucide-react";
import { createCmsGuide, getCmsGuideById, updateCmsGuide } from "../../services/api";

const inputClass = "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatSize(size) {
    return size >= 1024 * 1024 ? (size / (1024 * 1024)).toFixed(2) + " MB" : (size / 1024).toFixed(1) + " KB";
}

export default function GuideFormPage() {
    const { guideId } = useParams();
    return <GuideForm key={guideId ?? "new"} guideId={guideId} />;
}

function GuideForm({ guideId }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({ title: "", slug: "", description: "", fileUrl: "", isPublished: false });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [error, setError] = useState("");
    const [fileError, setFileError] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);
    const fileInputRef = useRef(null);
    const dragDepth = useRef(0);

    useEffect(() => {
        let active = true;
        async function load() {
            try {
                const guideResult = guideId ? await getCmsGuideById(guideId) : null;
                if (!active) return;
                if (guideResult) {
                    const guide = guideResult.data;
                    setForm({ title: guide.title, slug: guide.slug,
                        description: guide.description ?? "", fileUrl: guide.fileUrl,
                        isPublished: guide.isPublished });
                }
            } catch (err) {
                if (active) setLoadError(err.message);
            } finally {
                if (active) setLoading(false);
            }
        }
        load();
        return () => { active = false; };
    }, [guideId]);

    function update(name, value) {
        setForm(current => ({ ...current, [name]: value }));
    }

    function selectFiles(files) {
        if (savingRef.current || !files?.length) return;
        const file = files[0];
        let message = "";
        if (files.length !== 1) message = "Pilih satu file PDF.";
        else if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) message = "Hanya file PDF yang diizinkan.";
        else if (file.size > MAX_FILE_SIZE) message = "Ukuran PDF maksimal 10 MB.";
        else if (file.size === 0) message = "File PDF tidak boleh kosong.";
        setFileError(message);
        setSelectedFile(message ? null : file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function clearFile() {
        if (savingRef.current) return;
        setSelectedFile(null);
        setFileError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function handleDrop(event) {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        selectFiles(event.dataTransfer.files);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (savingRef.current || fileError) return;
        if (!selectedFile && (!guideId || !form.fileUrl)) {
            setFileError("File PDF wajib dipilih.");
            return;
        }
        const payload = new FormData();
        payload.append("title", form.title.trim());
        payload.append("description", form.description);
        payload.append("isPublished", String(form.isPublished));
        if (selectedFile) payload.append("file", selectedFile);
        try {
            savingRef.current = true;
            setSaving(true);
            setError("");
            const result = guideId ? await updateCmsGuide(guideId, payload) : await createCmsGuide(payload);
            navigate("/guides", { state: { message: result.message } });
        } catch (err) {
            setError(err.message);
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }

    if (loading) return <p className="p-6 text-slate-600">Memuat form Panduan...</p>;
    if (loadError) return (
        <section className="mx-auto max-w-4xl">
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-600">{loadError}</p>
            <Link to="/guides" className="mt-4 inline-block text-blue-600">Kembali ke daftar Panduan</Link>
        </section>
    );

    return (
        <section className="mx-auto max-w-4xl">
            <Link to="/guides" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"><ArrowLeft size={18} />Kembali ke daftar Panduan</Link>
            <h1 className="mt-6 text-3xl font-bold text-slate-900">{guideId ? "Edit Panduan" : "Tambah Panduan"}</h1>
            <p className="mt-2 text-slate-600">{guideId ? "Perbarui dokumen panduan dan pengaturan publikasinya." : "Lengkapi informasi untuk membuat panduan baru."}</p>

            <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                {error && <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">{error}</p>}
                <fieldset disabled={saving} className="min-w-0 space-y-6">
                    <Field label="Judul *" htmlFor="guide-title">
                        <input id="guide-title" required minLength={3} maxLength={200} placeholder="Contoh: Panduan Pengajuan PIB" value={form.title} onChange={event => update("title", event.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Deskripsi" htmlFor="guide-description">
                        <textarea id="guide-description" rows={4} placeholder="Tuliskan ringkasan dokumen panduan." value={form.description} onChange={event => update("description", event.target.value)} className={inputClass} />
                    </Field>
                    <div>
                        <p id="guide-file-label" className="mb-2 text-sm font-semibold text-slate-700">File PDF{guideId ? "" : " *"}</p>
                        {guideId && form.fileUrl && (
                            <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                                <FileText size={22} className="shrink-0 text-blue-600" />
                                <div className="min-w-0 flex-1"><p className="font-medium text-slate-800">Dokumen PDF tersimpan</p><p className="mt-1 text-sm text-slate-500">{selectedFile ? "Dokumen ini diganti setelah perubahan berhasil disimpan." : "Dokumen ini tetap digunakan jika tidak memilih file baru."}</p></div>
                                <a href={form.fileUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-600">Buka PDF<ExternalLink size={16} /></a>
                            </div>
                        )}
                        <input ref={fileInputRef} id="guide-file" type="file" accept="application/pdf,.pdf" onChange={event => selectFiles(event.target.files)} aria-labelledby="guide-file-label" className="hidden" />
                        <button type="button" aria-describedby="guide-file-help" onClick={() => fileInputRef.current?.click()}
                            onDragEnter={event => { event.preventDefault(); if (!savingRef.current) { dragDepth.current++; setDragging(true); } }}
                            onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
                            onDragLeave={event => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragging(false); }}
                            onDrop={handleDrop}
                            className={"flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-5 py-8 text-center transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 " + (dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50")}>
                            <Upload size={28} aria-hidden="true" className="text-blue-600" />
                            <span className="font-semibold text-slate-800">Klik untuk memilih PDF atau tarik file ke sini</span>
                            <span id="guide-file-help" className="text-sm text-slate-500">Format PDF, maksimal 10 MB.</span>
                        </button>
                        {selectedFile && (
                            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4" role="status">
                                <FileText size={22} className="shrink-0 text-blue-600" />
                                <div className="min-w-0 flex-1"><p className="break-all font-medium text-slate-800">{selectedFile.name}</p><p className="text-sm text-slate-500">{formatSize(selectedFile.size)}</p></div>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Ganti file</button>
                                <button type="button" onClick={clearFile} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600"><X size={16} />Hapus pilihan</button>
                            </div>
                        )}
                        {fileError && <p role="alert" className="mt-3 text-sm text-red-600">{fileError}</p>}
                    </div>
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                        <input type="checkbox" checked={form.isPublished} onChange={event => update("isPublished", event.target.checked)} className="h-5 w-5" />
                        <span><span className="block font-semibold text-slate-800">Terbitkan Panduan</span><span className="text-sm text-slate-500">Tampilkan panduan di website publik.</span></span>
                    </label>
                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                        <button type="button" onClick={() => navigate("/guides")} className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 disabled:opacity-60">Batal</button>
                        <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"><Save size={19} />{saving ? "Menyimpan..." : guideId ? "Simpan Perubahan" : "Simpan Panduan"}</button>
                    </div>
                </fieldset>
            </form>
        </section>
    );
}

function Field({ label, htmlFor, children }) {
    return <div><label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>{children}</div>;
}
