import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

export default function DeleteGuideModal({ guide, deleting, error, onCancel, onConfirm }) {
    const dialogRef = useRef(null);
    useEffect(() => {
        const dialog = dialogRef.current;
        if (guide && !dialog.open) dialog.showModal();
        else if (!guide && dialog.open) dialog.close();
    }, [guide]);

    return (
        <dialog ref={dialogRef} onCancel={event => { event.preventDefault(); if (!deleting) onCancel(); }}
            aria-labelledby="delete-guide-title" aria-describedby="delete-guide-description" aria-busy={deleting}
            className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/50 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><Trash2 size={24} /></div>
            <h2 id="delete-guide-title" className="mt-5 text-2xl font-bold">Hapus Panduan?</h2>
            <p id="delete-guide-description" className="mt-3 leading-7 text-slate-600">Panduan ini akan dihapus permanen dan tidak lagi tampil di website publik. Dokumen pada URL asal tidak dihapus.</p>
            <p className="mt-4 break-words rounded-xl bg-slate-50 p-4 font-medium">{guide?.title}</p>
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
                <button type="button" autoFocus disabled={deleting} onClick={onCancel} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold disabled:opacity-50">Batal</button>
                <button type="button" disabled={deleting} onClick={onConfirm} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"><Trash2 size={18} />{deleting ? "Menghapus..." : "Hapus Panduan"}</button>
            </div>
        </dialog>
    );
}
