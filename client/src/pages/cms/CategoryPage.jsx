import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    LayoutGrid,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react";

import {
    deleteCmsCategory,
    getCmsCategories,
    updateCmsCategory,
} from "../../services/api";

import CategoryForm from "../../components/cms/CategoryForm";
import DeleteCategoryModal from "../../components/cms/DeleteCategoryModal";
import IconPreview from "../../components/cms/IconPreview";
import StatusConfirmModal from "../../components/cms/StatusConfirmModal";
import VisibilityButton from "../../components/cms/VisibilityButton";

export default function CategoryPage() {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] =
        useState(null);

    const [formMode, setFormMode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [success, setSuccess] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    const [categoryToDelete, setCategoryToDelete] =
        useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [categoryToChangeStatus, setCategoryToChangeStatus] =
        useState(null);
    const [changingStatusId, setChangingStatusId] = useState(null);
    const [statusError, setStatusError] = useState("");

    const deletingRef = useRef(false);
    const statusChangingRef = useRef(false);

    useEffect(() => {
        let active = true;

        async function loadCategories() {
            try {
                setLoading(true);
                setError("");

                const result =
                    await getCmsCategories();

                if (!active) return;

                const data = Array.isArray(
                    result?.data
                )
                    ? result.data
                    : [];

                setCategories(data);

                setSelectedCategory(
                    (current) => {
                        if (!current) return current;

                        return (
                            data.find(
                                (category) =>
                                    category.id ===
                                    current.id
                            ) ?? null
                        );
                    }
                );
            } catch (err) {
                if (active) {
                    setCategories([]);
                    setError(err.message);
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadCategories();

        return () => {
            active = false;
        };
    }, [refreshKey]);

    function handleAddCategory() {
        setSelectedCategory(null);
        setFormMode("create");
        setSuccess("");
    }

    function handleEditCategory(category) {
        setSelectedCategory(category);
        setFormMode("edit");
        setSuccess("");
    }

    function handleSaved(category, message) {
        setSuccess(
            message || "Kategori berhasil disimpan."
        );

        setSelectedCategory(category);
        setFormMode("edit");
        setRefreshKey((current) => current + 1);
    }

    function handleOpenDelete(category) {
        setCategoryToDelete(category);
        setDeleteError("");
        setSuccess("");
    }

    function handleCancelDelete() {
        if (deletingRef.current) return;

        setCategoryToDelete(null);
        setDeleteError("");
    }

    async function handleConfirmDelete() {
        if (
            !categoryToDelete ||
            deletingRef.current
        ) {
            return;
        }

        try {
            deletingRef.current = true;
            setDeleting(true);
            setDeleteError("");

            await deleteCmsCategory(
                categoryToDelete.id
            );

            if (
                selectedCategory?.id ===
                categoryToDelete.id
            ) {
                setSelectedCategory(null);
                setFormMode(null);
            }

            setCategoryToDelete(null);
            setSuccess(
                "Kategori berhasil dihapus."
            );
            setRefreshKey(
                (current) => current + 1
            );
        } catch (err) {
            setDeleteError(err.message);
        } finally {
            deletingRef.current = false;
            setDeleting(false);
        }
    }

    async function saveStatus(category, isActive) {
        if (statusChangingRef.current) return;

        try {
            statusChangingRef.current = true;
            setChangingStatusId(category.id);
            setStatusError("");
            setActionError("");

            const payload = new FormData();
            payload.set("isActive", String(isActive));
            const result = await updateCmsCategory(category.id, payload);
            const updatedCategory = result?.data ?? { ...category, isActive };

            setCategories((current) =>
                current.map((item) =>
                    item.id === category.id
                        ? { ...item, ...updatedCategory }
                        : item
                )
            );
            setSelectedCategory((current) =>
                current?.id === category.id
                    ? { ...current, ...updatedCategory }
                    : current
            );
            setSuccess(result?.message ?? "Status kategori berhasil diperbarui.");
            setCategoryToChangeStatus(null);
        } catch (err) {
            const message = err.message || "Gagal memperbarui status kategori.";
            setStatusError(message);
            setActionError(message);
        } finally {
            statusChangingRef.current = false;
            setChangingStatusId(null);
        }
    }

    function handleStatusRequest(category) {
        setSuccess("");
        setActionError("");
        setStatusError("");
        if (category.isActive) {
            setCategoryToChangeStatus(category);
            return;
        }
        saveStatus(category, true);
    }

    return (
        <section className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Kelola Kategori
                    </h1>

                    <p className="mt-2 text-slate-600">
                        Atur kategori utama pada Pusat
                        Bantuan.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleAddCategory}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                    <Plus size={20} />
                    Tambah Kategori
                </button>
            </div>

            {success && (
                <div
                    role="status"
                    className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700"
                >
                    {success}
                </div>
            )}

            {error && (
                <div
                    role="alert"
                    className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
                >
                    {error}
                </div>
            )}

            {actionError && (
                <div
                    role="alert"
                    className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
                >
                    {actionError}
                </div>
            )}

            <div
                className={`mt-8 grid gap-6 ${formMode
                        ? "xl:grid-cols-[minmax(0,1fr)_420px]"
                        : ""
                    }`}
            >
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Daftar Kategori
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {categories.length} kategori
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <p className="py-16 text-center text-slate-500">
                            Memuat kategori...
                        </p>
                    ) : categories.length === 0 ? (
                        <div className="py-16 text-center">
                            <LayoutGrid
                                size={40}
                                className="mx-auto text-slate-300"
                            />

                            <p className="mt-4 text-slate-500">
                                Belum ada kategori.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-5 space-y-3">
                            {categories.map(
                                (category) => {
                                    const total =
                                        Number(
                                            category.subcategoryCount
                                        ) || 0;

                                    const active =
                                        selectedCategory?.id ===
                                        category.id;

                                    return (
                                        <article
                                            key={
                                                category.id
                                            }
                                            className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${active
                                                    ? "border-blue-300 bg-blue-50"
                                                    : "border-slate-200"
                                                }`}
                                        >
                                            <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 p-1.5 text-blue-600">
                                                    <IconPreview
                                                        iconUrl={category.iconUrl}
                                                        iconName={category.icon}
                                                        alt={`Ikon ${category.name}`}
                                                        className="h-full w-full"
                                                    />
                                                </span>

                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold text-slate-900">
                                                        {
                                                            category.name
                                                        }
                                                    </h3>

                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${category.isActive
                                                                ? "bg-emerald-100 text-emerald-700"
                                                                : "bg-slate-200 text-slate-600"
                                                            }`}
                                                    >
                                                        {category.isActive
                                                            ? "Aktif"
                                                            : "Nonaktif"}
                                                    </span>
                                                </div>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    {
                                                        total
                                                    }{" "}
                                                    subkategori
                                                </p>

                                                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                                                    {category.description ||
                                                        "Tidak ada deskripsi."}
                                                </p>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                <VisibilityButton
                                                    isVisible={category.isActive}
                                                    disableLabel="Nonaktifkan kategori"
                                                    enableLabel="Aktifkan kategori"
                                                    loading={changingStatusId === category.id}
                                                    onClick={() => handleStatusRequest(category)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleEditCategory(
                                                            category
                                                        )
                                                    }
                                                    aria-label={`Edit ${category.name}`}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                                                >
                                                    <Pencil
                                                        size={
                                                            18
                                                        }
                                                    />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleOpenDelete(
                                                            category
                                                        )
                                                    }
                                                    aria-label={`Hapus ${category.name}`}
                                                    title={
                                                        total >
                                                            0
                                                            ? "Kategori masih memiliki subkategori"
                                                            : "Hapus kategori"
                                                    }
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:border-red-400 hover:bg-red-50"
                                                >
                                                    <Trash2
                                                        size={
                                                            18
                                                        }
                                                    />
                                                </button>
                                            </div>
                                        </article>
                                    );
                                }
                            )}
                        </div>
                    )}
                </div>

                {formMode && (
                    <CategoryForm
                        key={
                            formMode === "edit"
                                ? selectedCategory?.id
                                : "new-category"
                        }
                        mode={formMode}
                        category={selectedCategory}
                        onCancel={() => {
                            setFormMode(null);
                            setSelectedCategory(null);
                        }}
                        onSaved={handleSaved}
                    />
                )}
            </div>

            <DeleteCategoryModal
                category={categoryToDelete}
                deleting={deleting}
                error={deleteError}
                onCancel={handleCancelDelete}
                onConfirm={handleConfirmDelete}
            />
            <StatusConfirmModal
                item={categoryToChangeStatus}
                message="Nonaktifkan kategori? Subkategori, topik, dan FAQ di dalamnya tidak akan tampil di halaman publik."
                confirmLabel="Nonaktifkan kategori"
                saving={changingStatusId === categoryToChangeStatus?.id}
                error={statusError}
                onCancel={() => {
                    if (!statusChangingRef.current) {
                        setCategoryToChangeStatus(null);
                        setStatusError("");
                    }
                }}
                onConfirm={() => saveStatus(categoryToChangeStatus, false)}
            />
        </section>
    );
}
