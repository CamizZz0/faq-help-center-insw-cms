// Rate limit feedback per IP + konten (lebih lama: 60 menit)
const WINDOW_MS = 60 * 60 * 1000; // 60 menit (rekomendasi lebih lama agar anti-spam)
const MAX_REQUESTS = 5;

const buckets = new Map(); // key -> timestamps[]

function getKey(req, contentType) {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
    const contentId = String(req.params.id ?? "unknown");
    return `${ip}:${contentType}:${contentId}`;
}

function prune(timestamps, now) {
    const cutoff = now - WINDOW_MS;
    let i = 0;
    while (i < timestamps.length && timestamps[i] <= cutoff) i++;
    if (i > 0) timestamps.splice(0, i);
}

// Bersihkan map tiap 10 menit agar tidak bocor memori
setInterval(() => {
    const now = Date.now();
    for (const [key, arr] of buckets.entries()) {
        prune(arr, now);
        if (arr.length === 0) buckets.delete(key);
    }
}, 10 * 60 * 1000).unref?.();

export function feedbackRateLimit({ windowMs = WINDOW_MS, max = MAX_REQUESTS } = {}) {
    return (req, res, next) => {
        const contentType = req._feedbackContentType || "unknown";
        const key = getKey(req, contentType);
        const now = Date.now();
        const arr = buckets.get(key) ?? [];
        prune(arr, now);

        if (arr.length >= max) {
            const oldest = arr[0];
            const retryMs = windowMs - (now - oldest);
            const retrySec = Math.ceil(retryMs / 1000);
            res.setHeader("Retry-After", String(retrySec));
            return res.status(429).json({
                success: false,
                message: `Terlalu banyak feedback. Coba lagi dalam ${Math.ceil(retrySec / 60)} menit.`,
            });
        }

        arr.push(now);
        buckets.set(key, arr);

        // Header informatif (opsional)
        res.setHeader("X-RateLimit-Limit", String(max));
        res.setHeader("X-RateLimit-Remaining", String(max - arr.length));
        next();
    };
}

// Untuk test: reset & inspect
export function _resetBuckets() {
    buckets.clear();
}
export function _getBuckets() {
    return buckets;
}
