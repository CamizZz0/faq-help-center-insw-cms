import { Eye, EyeOff, LoaderCircle } from "lucide-react";

export default function VisibilityButton({
    isVisible,
    disableLabel,
    enableLabel,
    loading = false,
    onClick,
    className = "",
}) {
    const label = isVisible ? disableLabel : enableLabel;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            aria-label={label}
            title={label}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        >
            {loading ? (
                <LoaderCircle
                    size={18}
                    className="animate-spin"
                    aria-hidden="true"
                />
            ) : isVisible ? (
                <Eye size={18} aria-hidden="true" />
            ) : (
                <EyeOff size={18} aria-hidden="true" />
            )}
        </button>
    );
}
