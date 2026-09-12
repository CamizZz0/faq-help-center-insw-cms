import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, PlayCircle, Save } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createCmsTutorial, getCmsTutorialById, updateCmsTutorial } from "../../services/api";

const inputClass = "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";

function getYouTubePreview(value) {
    if (!value.trim()) return null;
    try {
        const url = new URL(value.trim());
        const host = url.hostname.toLowerCase();
        const parts = url.pathname.split("/").filter(Boolean);
        let id;
        if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
        if ((host === "youtube.com" || host === "www.youtube.com") && url.pathname === "/watch") id = url.searchParams.get("v");
        else if (host === "youtu.be" && url.protocol === "https:" && parts.length === 1) [id] = parts;
        else if ((host === "youtube.com" || host === "www.youtube.com") && url.protocol === "https:" && parts.length === 2 && ["embed", "shorts"].includes(parts[0])) id = parts[1];
        if (!/^[A-Za-z0-9_-]{11}$/.test(id ?? "")) return null;
        return { id, thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg` };
    } catch { return null; }
}

export default function TutorialFormPage() {
    const { tutorialId } = useParams();
    return <TutorialForm key={tutorialId ?? "new"} tutorialId={tutorialId} />;
}

function TutorialForm({ tutorialId }) {
    const navigate = useNavigate();
    const isEdit = Boolean(tutorialId);
    const [form, setForm] = useState({ title: "", videoUrl: "", description: "", isPublished: false });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const preview = getYouTubePreview(form.videoUrl);
    const videoError = form.videoUrl.trim() && !preview ? "Masukkan URL YouTube yang valid." : "";

    useEffect(() => {
        let active = true;
        async function load() {
            try {
                const tutorialResult = tutorialId ? await getCmsTutorialById(tutorialId) : null;
                if (!active) return;
                if (tutorialResult) {
                    const tutorial = tutorialResult.data;
                    setForm({
                        title: tutorial.title,
                        videoUrl: tutorial.videoUrl,
                        description: tutorial.description ?? "",
                        isPublished: tutorial.isPublished,
                    });
                }
            } catch (err) { if (active) setLoadError(err.message); }
            finally { if (active) setLoading(false); }
        }
        load();
        return () => { active = false; };
    }, [tutorialId]);

    function update(name, value) { setForm((current) => ({ ...current, [name]: value })); }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!preview || submitting) return;
        const payload = {
            title: form.title.trim(),
            videoUrl: form.videoUrl.trim(),
            description: form.description,
            isPublished: form.isPublished,
        };
        try {
            setSubmitting(true);
            setError("");
            const result = isEdit ? await updateCmsTutorial(tutorialId, payload) : await createCmsTutorial(payload);
            navigate("/tutorials", { state: { message: result.message } });
        } catch (err) { setError(err.message); }
        finally { setSubmitting(false); }
    }

    if (loading) return <p className="p-6 text-slate-600">Memuat form Tutorial...</p>;
    if (loadError) return <section className="mx-auto max-w-4xl"><p role="alert" className="rounded-xl bg-red-50 p-4 text-red-600">{loadError}</p><Link to="/tutorials" className="mt-4 inline-block text-blue-600">Kembali ke daftar Tutorial</Link></section>;

    return (
        <section className="mx-auto max-w-4xl">
            <Link to="/tutorials" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"><ArrowLeft size={18} />Kembali ke daftar Tutorial</Link>
            <h1 className="mt-6 text-3xl font-bold text-slate-900">{isEdit ? "Edit Tutorial" : "Tambah Tutorial"}</h1>
            <p className="mt-2 text-slate-600">{isEdit ? "Perbarui video tutorial dan pengaturan publikasinya." : "Lengkapi informasi untuk membuat tutorial baru."}</p>

            <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                {error && <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">{error}</p>}
                <fieldset disabled={submitting} className="space-y-6">
                    <Field label="Judul *" htmlFor="tutorial-title"><input id="tutorial-title" required minLength={3} maxLength={200} value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Contoh: Tutorial Pengajuan PIB" className={inputClass} /></Field>
                    <Field label="URL YouTube *" htmlFor="tutorial-video"><input id="tutorial-video" type="url" required value={form.videoUrl} onChange={(event) => update("videoUrl", event.target.value)} placeholder="https://www.youtube.com/watch?v=..." aria-describedby="youtube-help youtube-error" className={inputClass} /><p id="youtube-help" className="mt-2 text-sm text-slate-500">Dukung URL watch, youtu.be, embed, dan shorts.</p>{videoError && <p id="youtube-error" role="alert" className="mt-2 text-sm text-red-600">{videoError}</p>}</Field>
                    {preview && <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><div className="relative aspect-video max-h-80 overflow-hidden"><img src={preview.thumbnailUrl} alt="Preview thumbnail YouTube" className="h-full w-full object-cover" /><div className="absolute inset-0 flex items-center justify-center bg-black/20"><PlayCircle size={56} className="text-white drop-shadow" /></div></div><a href={`https://www.youtube.com/watch?v=${preview.id}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-3 text-sm font-semibold text-blue-600">Buka video di YouTube<ExternalLink size={16} /></a></div>}
                    <Field label="Deskripsi" htmlFor="tutorial-description"><textarea id="tutorial-description" rows={4} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Tuliskan ringkasan video tutorial." className={inputClass} /></Field>
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={form.isPublished} onChange={(event) => update("isPublished", event.target.checked)} className="h-5 w-5" /><span><span className="block font-semibold text-slate-800">Terbitkan Tutorial</span><span className="text-sm text-slate-500">Tampilkan tutorial di website publik.</span></span></label>
                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end"><button type="button" onClick={() => navigate("/tutorials")} className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 disabled:opacity-60">Batal</button><button type="submit" disabled={submitting || Boolean(videoError)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"><Save size={19} />{submitting ? "Menyimpan..." : isEdit ? "Perbarui Tutorial" : "Simpan Tutorial"}</button></div>
                </fieldset>
            </form>
        </section>
    );
}

function Field({ label, htmlFor, children }) {
    return <div><label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>{children}</div>;
}
