import {
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Image as ImageIcon,
    RefreshCw,
    Trash2,
    Upload,
} from "lucide-react";

import IconPreview from "./IconPreview";
import {
    MAX_ICON_BYTES,
    validateIconFile,
} from "./iconFile";

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < MAX_ICON_BYTES) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / MAX_ICON_BYTES).toFixed(2)} MB`;
}

/*
 * Nama file dari URL ikon yang tersimpan, dipakai saat
 * edit dan belum memilih file baru.
 */
function fileNameFromUrl(url = "") {
    const clean = String(url).split("?")[0];

    const segment =
        clean.split("/").filter(Boolean).pop() ?? "";

    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

export default function IconDropzone({
    id,
    file,
    onChange,
    existingIconUrl = "",
    existingIconName = "",
    disabled = false,
}) {
    const inputRef = useRef(null);
    const generatedId = useId();

    const inputId = id ?? `icon-dropzone-${generatedId}`;

    const [dragging, setDragging] = useState(false);
    const [localError, setLocalError] = useState("");

    /*
     * Object URL untuk pratinjau file yang baru dipilih.
     */
    const previewUrl = useMemo(
        () => (file ? URL.createObjectURL(file) : ""),
        [file]
    );

    useEffect(() => {
        if (!previewUrl) return undefined;

        return () => URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    const displayUrl = previewUrl || existingIconUrl;

    const displayName = file
        ? file.name
        : existingIconName ||
          fileNameFromUrl(existingIconUrl);

    const displaySize = file
        ? formatFileSize(file.size)
        : "";

    const hasPreview =
        Boolean(displayUrl) ||
        (!file && Boolean(existingIconName));

    function openPicker() {
        if (disabled) return;

        inputRef.current?.click();
    }

    function acceptFile(nextFile) {
        const message = validateIconFile(nextFile);

        /*
         * File lama yang sudah valid dipertahankan saat
         * pengguna memilih file yang tidak sesuai.
         */
        if (message) {
            setLocalError(message);
            return;
        }

        setLocalError("");
        onChange(nextFile);
    }

    function handleInputChange(event) {
        acceptFile(event.target.files?.[0] ?? null);

        // Reset agar memilih file yang sama tetap memicu onChange.
        event.target.value = "";
    }

    function handleDragOver(event) {
        if (disabled) return;

        event.preventDefault();
        setDragging(true);
    }

    function handleDragLeave(event) {
        event.preventDefault();
        setDragging(false);
    }

    function handleDrop(event) {
        if (disabled) return;

        event.preventDefault();
        setDragging(false);
        acceptFile(event.dataTransfer.files?.[0] ?? null);
    }

    function handleClear(event) {
        event.stopPropagation();
        setLocalError("");
        onChange(null);
    }

    function handleButtonClick(event) {
        event.stopPropagation();
        openPicker();
    }

    return (
        <div>
            <div
                onClick={openPicker}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-4 text-center transition ${
                    dragging
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-300 bg-white"
                } ${
                    disabled
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                }`}
            >
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5">
                    {hasPreview ? (
                        <IconPreview
                            iconUrl={displayUrl}
                            iconName={existingIconName}
                            alt=""
                            className="h-full w-full"
                        />
                    ) : (
                        <ImageIcon
                            size={26}
                            aria-hidden="true"
                            className="text-slate-400"
                        />
                    )}
                </div>

                {file ? (
                    <div className="min-w-0">
                        <p className="break-all text-sm font-semibold text-slate-800">
                            {displayName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            {displaySize} · siap diunggah
                        </p>
                    </div>
                ) : displayName ? (
                    <div className="min-w-0">
                        <p className="break-all text-sm font-semibold text-slate-800">
                            {displayName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Ikon saat ini
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm font-semibold text-slate-700">
                            Tarik dan lepas ikon di sini
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            atau klik untuk memilih file
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={handleButtonClick}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {displayUrl || file ? (
                            <RefreshCw size={16} aria-hidden="true" />
                        ) : (
                            <Upload size={16} aria-hidden="true" />
                        )}

                        {displayUrl || file
                            ? "Ganti ikon"
                            : "Pilih ikon"}
                    </button>

                    {file && (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={handleClear}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Trash2 size={16} aria-hidden="true" />
                            Hapus pilihan
                        </button>
                    )}
                </div>

                <p className="text-xs text-slate-500">
                    PNG, JPEG, atau WebP · maksimal 1 MB
                </p>
            </div>

            <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={disabled}
                onChange={handleInputChange}
                className="sr-only"
            />

            {localError && (
                <p
                    role="alert"
                    className="mt-2 text-sm text-red-600"
                >
                    {localError}
                </p>
            )}
        </div>
    );
}
