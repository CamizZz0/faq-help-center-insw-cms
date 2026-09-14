import { useEffect, useRef } from "react";
import { EyeOff, LoaderCircle } from "lucide-react";

export default function StatusConfirmModal({
    item,
    message,
    confirmLabel,
    saving,
    error,
    onCancel,
    onConfirm,
}) {
    const dialogRef = useRef(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (item && !dialog.open) dialog.showModal();
        else if (!item && dialog.open) dialog.close();
    }, [item]);

    return (
        <dialog
            ref={dialogRef}
            onCancel={(event) => {
                event.preventDefault();
                if (!saving) onCancel();
            }}
            aria-labelledby="status-confirm-title"
            aria-describedby="status-confirm-description"
            aria-busy={saving}
            className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/50 sm:p-8"
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <EyeOff size={24} aria-hidden="true" />
            </div>
            <h2 id="status-confirm-title" className="mt-5 text-2xl font-bold">
                Konfirmasi perubahan status
            </h2>
            <p id="status-confirm-description" className="mt-3 leading-7 text-slate-600">
                {message}
            </p>
            <p className="mt-4 break-words rounded-xl bg-slate-50 p-4 font-medium">
                {item?.name ?? item?.title ?? item?.question}
            </p>
            {error && (
                <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    autoFocus
                    disabled={saving}
                    onClick={onCancel}
                    className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                    Batal
                </button>
                <button
                    type="button"
                    disabled={saving}
                    onClick={onConfirm}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
                    {saving ? "Menyimpan..." : confirmLabel}
                </button>
            </div>
        </dialog>
    );
}
