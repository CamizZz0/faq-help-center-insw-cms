import { useRef, useState } from "react";
import { Save, X } from "lucide-react";

import {
    createCmsCategory,
    updateCmsCategory,
} from "../../services/api";

import IconDropzone from "./IconDropzone";
import { validateIconFile } from "./iconFile";

function createSlug(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/&/g, " ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function createInitialForm(category) {
    return {
        name: category?.name ?? "",
        slug: category?.slug ?? "",
        description: category?.description ?? "",
        sortOrder: category?.sortOrder ?? 0,
        isActive: category?.isActive ?? true,
    };
}

const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 " +
    "outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 " +
    "disabled:cursor-not-allowed disabled:bg-slate-100";

export default function CategoryForm({
    category,
    mode,
    onCancel,
    onSaved,
}) {
    const isEdit = mode === "edit";

    const [form, setForm] = useState(() =>
        createInitialForm(category)
    );

    const [slugEdited, setSlugEdited] = useState(isEdit);
    const [iconFile, setIconFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const submitInProgress = useRef(false);

    function updateField(name, value) {
        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function handleNameChange(event) {
        const name = event.target.value;

        setForm((current) => ({
            ...current,
            name,
            slug:
                !isEdit && !slugEdited
                    ? createSlug(name)
                    : current.slug,
        }));
    }

    function handleSlugChange(event) {
        setSlugEdited(true);
        updateField(
            "slug",
            createSlug(event.target.value)
        );
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (submitInProgress.current) return;

        const name = form.name.trim();
        const slug = createSlug(form.slug || name);
        const sortOrder = Number(form.sortOrder);

        if (name.length < 3) {
            setError(
                "Nama kategori minimal 3 karakter."
            );
            return;
        }

        if (!slug) {
            setError("Slug kategori tidak valid.");
            return;
        }

        if (
            String(form.sortOrder).trim() === "" ||
            !Number.isInteger(sortOrder) ||
            sortOrder < 0
        ) {
            setError(
                "Urutan harus berupa bilangan bulat minimal 0."
            );
            return;
        }

        /*
         * Ikon wajib diunggah saat menambah kategori.
         */
        if (!isEdit && !iconFile) {
            setError("Ikon kategori wajib diunggah.");
            return;
        }

        if (iconFile) {
            const iconError = validateIconFile(iconFile);

            if (iconError) {
                setError(iconError);
                return;
            }
        }

        const formData = new FormData();

        formData.append("name", name);
        formData.append("slug", slug);
        formData.append(
            "description",
            form.description.trim()
        );
        formData.append("sortOrder", String(sortOrder));
        formData.append(
            "isActive",
            String(form.isActive)
        );

        if (iconFile) {
            formData.append("icon", iconFile);
        }

        try {
            submitInProgress.current = true;
            setSubmitting(true);
            setError("");

            const result = isEdit
                ? await updateCmsCategory(
                    category.id,
                    formData
                )
                : await createCmsCategory(formData);

            onSaved(
                result.data,
                result.message
            );
        } catch (err) {
            setError(
                err.message ||
                "Kategori gagal disimpan."
            );
        } finally {
            submitInProgress.current = false;
            setSubmitting(false);
        }
    }

    return (
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        {isEdit
                            ? "Edit Kategori"
                            : "Tambah Kategori"}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        {isEdit
                            ? "Perubahan akan digunakan pada website publik."
                            : "Buat kategori utama untuk mengelompokkan konten."}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    aria-label="Tutup formulir"
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                    <X size={20} />
                </button>
            </div>

            {error && (
                <div
                    role="alert"
                    className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    {error}
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="mt-6 space-y-5"
            >
                <fieldset
                    disabled={submitting}
                    className="space-y-5"
                >
                    <Field
                        label="Nama kategori *"
                        htmlFor="category-name"
                    >
                        <input
                            id="category-name"
                            required
                            minLength={3}
                            value={form.name}
                            onChange={handleNameChange}
                            placeholder="Contoh: Impor & Kepabeanan"
                            className={inputClass}
                        />
                    </Field>

                    <Field
                        label="Slug *"
                        htmlFor="category-slug"
                    >
                        <input
                            id="category-slug"
                            required
                            value={form.slug}
                            onChange={handleSlugChange}
                            placeholder="impor-kepabeanan"
                            className={inputClass}
                        />

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                            Slug digunakan sebagai alamat URL.
                            Mengubah slug kategori lama dapat
                            mengubah URL website publik.
                        </p>
                    </Field>

                    <Field
                        label="Deskripsi"
                        htmlFor="category-description"
                    >
                        <textarea
                            id="category-description"
                            rows={4}
                            value={form.description}
                            onChange={(event) =>
                                updateField(
                                    "description",
                                    event.target.value
                                )
                            }
                            placeholder="Jelaskan isi kategori ini."
                            className={`${inputClass} resize-y`}
                        />
                    </Field>

                    <Field
                        label={
                            isEdit ? "Ikon" : "Ikon *"
                        }
                        htmlFor="category-icon"
                    >
                        <IconDropzone
                            id="category-icon"
                            file={iconFile}
                            onChange={setIconFile}
                            existingIconUrl={
                                category?.iconUrl ?? ""
                            }
                            existingIconName={
                                category?.icon ?? ""
                            }
                            disabled={submitting}
                        />

                        {isEdit && (
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                Biarkan kosong bila ikon lama
                                tetap digunakan.
                            </p>
                        )}
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        <Field
                            label="Urutan"
                            htmlFor="category-order"
                        >
                            <input
                                id="category-order"
                                type="number"
                                min="0"
                                step="1"
                                required
                                value={form.sortOrder}
                                onChange={(event) =>
                                    updateField(
                                        "sortOrder",
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <label className="flex items-center justify-between gap-4 rounded-xl bg-blue-50 p-4">
                        <span>
                            <span className="block font-semibold text-slate-800">
                                Kategori aktif
                            </span>

                            <span className="mt-1 block text-sm text-slate-500">
                                Kategori aktif dapat
                                ditampilkan di website publik.
                            </span>
                        </span>

                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(event) =>
                                updateField(
                                    "isActive",
                                    event.target.checked
                                )
                            }
                            className="h-5 w-5 shrink-0 accent-blue-600"
                        />
                    </label>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                        >
                            <Save size={18} />

                            {submitting
                                ? "Menyimpan..."
                                : "Simpan"}
                        </button>
                    </div>
                </fieldset>
            </form>
        </aside>
    );
}

function Field({ label, htmlFor, children }) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="mb-2 block text-sm font-semibold text-slate-700"
            >
                {label}
            </label>

            {children}
        </div>
    );
}
