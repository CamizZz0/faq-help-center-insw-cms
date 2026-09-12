import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import {
    BookOpen,
    ChevronRight,
    FolderTree,
    ListTree,
    MessageCircleQuestion,
    Network,
    Pencil,
    PlayCircle,
} from "lucide-react";

import { getCmsDashboard } from "../../services/api";

const statCards = [
    {
        key: "categories",
        title: "Kategori",
        path: "/categories",
        icon: FolderTree,
    },
    {
        key: "subcategories",
        title: "Subkategori",
        path: "/subcategories",
        icon: Network,
    },
    {
        key: "topics",
        title: "Topik",
        path: "/topics",
        icon: ListTree,
    },
    {
        key: "faqs",
        title: "FAQ",
        path: "/faqs",
        icon: MessageCircleQuestion,
    },
    {
        key: "guides",
        title: "Panduan",
        path: "/guides",
        icon: BookOpen,
    },
    {
        key: "tutorials",
        title: "Tutorial",
        path: "/tutorials",
        icon: PlayCircle,
    },
];

const recentTabs = [
    { key: "faqs", label: "FAQ Terbaru" },
    { key: "guides", label: "Panduan Terbaru" },
    { key: "tutorials", label: "Tutorial Terbaru" },
];

const editButtonClass =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return dateFormatter.format(date);
}

function getStatisticTotal(statistics, key) {
    const value = statistics?.[key];

    if (value && typeof value === "object") {
        return value.total ?? 0;
    }

    return value ?? 0;
}

function getStatisticBreakdown(statistics, key) {
    const value = statistics?.[key];

    if (!value || typeof value !== "object") {
        return null;
    }

    return `${value.published ?? 0} terbit · ${value.draft ?? 0} draft`;
}

function StatusBadge({ isPublished }) {
    return (
        <span
            className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                isPublished
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
            }`}
        >
            {isPublished ? "Terbit" : "Draft"}
        </span>
    );
}

function StatCard({ card, statistics }) {
    const Icon = card.icon;
    const total = getStatisticTotal(statistics, card.key);
    const breakdown = getStatisticBreakdown(
        statistics,
        card.key
    );

    return (
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon size={24} aria-hidden="true" />
                </div>

                <p className="text-3xl font-bold text-slate-900">
                    {total}
                </p>
            </div>

            <h3 className="mt-5 font-bold text-slate-900">
                {card.title}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
                {breakdown ?? "Data aktif"}
            </p>

            <Link
                to={card.path}
                className="mt-4 inline-flex w-fit items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-800"
            >
                Kelola
                <ChevronRight size={16} aria-hidden="true" />
            </Link>
        </div>
    );
}

function RecentFaqItem({ faq }) {
    return (
        <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className="line-clamp-2 font-medium text-slate-900">
                    {faq.question}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                    {faq.category?.name ?? "-"} •{" "}
                    {faq.topic?.name ?? "-"}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:justify-end">
                <StatusBadge isPublished={faq.isPublished} />

                <span className="text-xs text-slate-500">
                    {formatDate(faq.updatedAt)}
                </span>

                <Link
                    to={`/faqs/${faq.id}/edit`}
                    aria-label={`Edit ${faq.question}`}
                    className={editButtonClass}
                >
                    <Pencil size={17} aria-hidden="true" />
                </Link>
            </div>
        </li>
    );
}

function RecentResourceItem({ item, editPath }) {
    return (
        <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="line-clamp-2 min-w-0 font-medium text-slate-900">
                {item.title}
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:justify-end">
                <StatusBadge isPublished={item.isPublished} />

                <span className="text-xs text-slate-500">
                    {formatDate(item.updatedAt)}
                </span>

                <Link
                    to={editPath}
                    aria-label={`Edit ${item.title}`}
                    className={editButtonClass}
                >
                    <Pencil size={17} aria-hidden="true" />
                </Link>
            </div>
        </li>
    );
}

function EmptyRecent({ label }) {
    return (
        <div className="px-5 py-12 text-center">
            <p className="text-sm text-slate-500">{label}</p>
        </div>
    );
}

function RecentContent({ recentContent, activeTab }) {
    if (activeTab === "faqs") {
        const faqs = recentContent?.faqs ?? [];

        if (faqs.length === 0) {
            return (
                <EmptyRecent label="Belum ada FAQ. Tambahkan FAQ terlebih dahulu." />
            );
        }

        return (
            <ul className="divide-y divide-slate-200">
                {faqs.map((faq) => (
                    <RecentFaqItem key={faq.id} faq={faq} />
                ))}
            </ul>
        );
    }

    if (activeTab === "guides") {
        const guides = recentContent?.guides ?? [];

        if (guides.length === 0) {
            return (
                <EmptyRecent label="Belum ada panduan. Tambahkan panduan terlebih dahulu." />
            );
        }

        return (
            <ul className="divide-y divide-slate-200">
                {guides.map((guide) => (
                    <RecentResourceItem
                        key={guide.id}
                        item={guide}
                        editPath={`/guides/${guide.id}/edit`}
                    />
                ))}
            </ul>
        );
    }

    const tutorials = recentContent?.tutorials ?? [];

    if (tutorials.length === 0) {
        return (
            <EmptyRecent label="Belum ada tutorial. Tambahkan tutorial terlebih dahulu." />
        );
    }

    return (
        <ul className="divide-y divide-slate-200">
            {tutorials.map((tutorial) => (
                <RecentResourceItem
                    key={tutorial.id}
                    item={tutorial}
                    editPath={`/tutorials/${tutorial.id}/edit`}
                />
            ))}
        </ul>
    );
}

function DashboardSkeleton() {
    return (
        <div aria-hidden="true">
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map(
                    (_, index) => (
                        <div
                            key={index}
                            className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="h-12 w-12 rounded-xl bg-slate-200" />
                                <div className="h-8 w-14 rounded-lg bg-slate-200" />
                            </div>

                            <div className="mt-5 h-5 w-28 rounded bg-slate-200" />
                            <div className="mt-3 h-4 w-36 rounded bg-slate-200" />
                            <div className="mt-5 h-4 w-16 rounded bg-slate-200" />
                        </div>
                    )
                )}
            </div>

            <div className="mt-10">
                <div className="h-6 w-40 rounded bg-slate-200" />
                <div className="mt-4 h-11 w-64 rounded-xl bg-slate-200" />

                <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {Array.from({ length: 5 }).map(
                        (_, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between gap-4 px-5 py-4"
                            >
                                <div className="h-4 w-1/2 rounded bg-slate-200" />
                                <div className="h-6 w-28 rounded-full bg-slate-200" />
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const [statistics, setStatistics] =
        useState(null);

    const [recentContent, setRecentContent] =
        useState(null);

    const [activeTab, setActiveTab] =
        useState("faqs");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshKey, setRefreshKey] =
        useState(0);

    useEffect(() => {
        let active = true;

        async function loadDashboard() {
            try {
                setLoading(true);
                setError("");

                const result =
                    await getCmsDashboard();

                if (!active) return;

                setStatistics(
                    result?.data?.statistics ?? null
                );

                setRecentContent(
                    result?.data?.recentContent ??
                        null
                );
            } catch (err) {
                if (!active) return;

                setStatistics(null);
                setRecentContent(null);
                setError(
                    err.message ||
                        "Gagal mengambil ringkasan dashboard."
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadDashboard();

        return () => {
            active = false;
        };
    }, [refreshKey]);

    return (
        <section className="mx-auto max-w-7xl">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">
                    Dashboard
                </h1>

                <p className="mt-2 text-slate-600">
                    Ringkasan konten Pusat Bantuan INSW.
                </p>
            </div>

            {loading ? (
                <DashboardSkeleton />
            ) : error ? (
                <div
                    role="alert"
                    className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
                >
                    <p className="text-slate-700">{error}</p>

                    <button
                        type="button"
                        onClick={() =>
                            setRefreshKey(
                                (current) =>
                                    current + 1
                            )
                        }
                        className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
                    >
                        Coba Lagi
                    </button>
                </div>
            ) : (
                <>
                    <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {statCards.map((card) => (
                            <StatCard
                                key={card.key}
                                card={card}
                                statistics={
                                    statistics
                                }
                            />
                        ))}
                    </div>

                    <div className="mt-10">
                        <h2 className="text-xl font-bold text-slate-900">
                            Konten Terbaru
                        </h2>

                        <p className="mt-2 text-slate-600">
                            Lima konten yang terakhir
                            ditambahkan atau diperbarui.
                        </p>

                        <div
                            role="tablist"
                            aria-label="Konten terbaru"
                            className="mt-5 flex flex-wrap gap-2"
                        >
                            {recentTabs.map((tab) => {
                                const isActive =
                                    activeTab ===
                                    tab.key;

                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        role="tab"
                                        id={`tab-${tab.key}`}
                                        aria-selected={
                                            isActive
                                        }
                                        aria-controls={`panel-${tab.key}`}
                                        onClick={() =>
                                            setActiveTab(
                                                tab.key
                                            )
                                        }
                                        className={`rounded-xl px-4 py-2.5 text-sm transition ${
                                            isActive
                                                ? "bg-blue-600 font-semibold text-white"
                                                : "border border-slate-300 font-medium text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div
                            role="tabpanel"
                            id={`panel-${activeTab}`}
                            aria-labelledby={`tab-${activeTab}`}
                            className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white"
                        >
                            <RecentContent
                                recentContent={
                                    recentContent
                                }
                                activeTab={activeTab}
                            />
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
