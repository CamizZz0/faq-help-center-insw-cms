import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

export default function DeleteTopicModal({
    topic,
    deleting,
    error,
    onCancel,
    onConfirm,
}) {
    const dialogRef = useRef(null);

    useEffect(() => {
        const dialog = dialogRef.current;

        if (topic && !dialog.open) {
            dialog.showModal();
        } else if (!topic && dialog.open) {
            dialog.close();
        }
    }, [topic]);

    function handleCancel(event) {
        event.preventDefault();

        if (!deleting) {
            onCancel();
        }
    }

    return (
        <dialog
            ref={dialogRef}
            onCancel={handleCancel}
            aria-labelledby="delete-topic-title"
            aria-describedby="delete-topic-description"
            aria-busy={deleting}
            className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/50 sm:p-8"
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 size={24} />
            </div>

            <h2 id="delete-topic-title" className="mt-5 text-2xl font-bold">
                Hapus Topik?
            </h2>

            <p
                id="delete-topic-description"
                className="mt-3 leading-7 text-slate-600"
            >
                Topik “{topic?.name}” akan dihapus. Tindakan ini tidak dapat
                dibatalkan.
            </p>

            {error && (
                <p
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    {error}
                </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                    type="button"
                    autoFocus
                    disabled={deleting}
                    onClick={onCancel}
                    className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                    Batal
                </button>

                <button
                    type="button"
                    disabled={deleting}
                    onClick={onConfirm}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Trash2 size={18} />
                    {deleting ? "Menghapus..." : "Hapus Topik"}
                </button>
            </div>
        </dialog>
    );
}
