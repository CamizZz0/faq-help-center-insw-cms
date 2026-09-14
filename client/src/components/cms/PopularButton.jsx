import { LoaderCircle, Star } from "lucide-react";

export default function PopularButton({
    isPopular,
    loading = false,
    onClick,
    className = "",
}) {
    const label = isPopular
        ? "Hentikan FAQ populer"
        : "Jadikan FAQ populer";

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            aria-label={label}
            title={label}
            aria-pressed={isPopular}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isPopular
                    ? "border-amber-300 bg-amber-50 text-amber-500 hover:border-amber-400 hover:bg-amber-100 hover:text-amber-600"
                    : "text-slate-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-500"
            } ${className}`}
        >
            {loading ? (
                <LoaderCircle
                    size={18}
                    className="animate-spin"
                    aria-hidden="true"
                />
            ) : (
                <Star
                    size={18}
                    fill={isPopular ? "currentColor" : "none"}
                    aria-hidden="true"
                />
            )}
        </button>
    );
}