import { useRef, useState } from "react";
import { Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
    createCmsSubcategory,
    updateCmsSubcategory,
} from "../../services/api";

import IconDropzone from "./IconDropzone";
import { validateIconFile } from "./iconFile";

const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 " +
    "outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 " +
    "disabled:cursor-not-allowed disabled:bg-slate-100";

function createInitialForm(subcategory) {
    return {
        categoryId: subcategory?.category?.id
            ? String(subcategory.category.id)
            : "",
        name: subcategory?.name ?? "",
        description: subcategory?.description ?? "",
        sortOrder: subcategory?.sortOrder ?? 0,
        isActive: subcategory?.isActive ?? true,
    };
}

export default function SubcategoryForm({
    mode,
    subcategory,
    categories,
    loadingCategories,
}) {
    const navigate = useNavigate();
    const isEdit = mode === "edit";

    const [form, setForm] = useState(() =>
        createInitialForm(subcategory)
    );
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

    async function handleSubmit(event) {
        event.preventDefault();

        if (submitInProgress.current) return;

        const name = form.name.trim();
        const categoryId = Number(form.categoryId);
        const sortOrder =
            String(form.sortOrder).trim() === ""
                ? 0
                : Number(form.sortOrder);

        if (!Number.isInteger(categoryId) || categoryId < 1) {
            setError("Pilih kategori induk.");
            return;
        }

        if (name.length < 2 || name.length > 150) {
            setError("Nama subkategori harus terdiri dari 2–150 karakter.");
            return;
        }

        if (!Number.isInteger(sortOrder) || sortOrder < 0) {
            setError("Urutan harus berupa bilangan bulat minimal 0.");
            return;
        }

        /*
         * Ikon wajib diunggah saat menambah subkategori.
         */
        if (!isEdit && !iconFile) {
            setError("Ikon subkategori wajib diunggah.");
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

        formData.append("categoryId", String(categoryId));
        formData.append("name", name);
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

            if (isEdit) {
                await updateCmsSubcategory(
                    subcategory.id,
                    formData
                );
            } else {
                await createCmsSubcategory(formData);
            }

            navigate("/subcategories");
        } catch (err) {
            setError(err.message || "Subkategori gagal disimpan.");
        } finally {
            submitInProgress.current = false;
            setSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
        >
            {error && (
                <div
                    role="alert"
                    className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600"
                >
                    {error}
                </div>
            )}

            <fieldset disabled={submitting} className="space-y-6">
                <Field label="Kategori *" htmlFor="subcategory-category">
                    <select
                        id="subcategory-category"
                        required
                        value={form.categoryId}
                        onChange={(event) =>
                            updateField("categoryId", event.target.value)
                        }
                        className={inputClass}
                    >
                        <option value="">
                            {loadingCategories
                                ? "Memuat kategori..."
                                : "Pilih kategori"}
                        </option>

                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Nama Subkategori *" htmlFor="subcategory-name">
                    <input
                        id="subcategory-name"
                        required
                        minLength={2}
                        maxLength={150}
                        value={form.name}
                        onChange={(event) =>
                            updateField("name", event.target.value)
                        }
                        placeholder="Contoh: PIB"
                        className={inputClass}
                    />

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        Slug dibuat otomatis dari nama dan tidak dapat diubah
                        setelah disimpan.
                    </p>
                </Field>

                <Field label="Deskripsi" htmlFor="subcategory-description">
                    <textarea
                        id="subcategory-description"
                        rows={4}
                        value={form.description}
                        onChange={(event) =>
                            updateField("description", event.target.value)
                        }
                        placeholder="Tuliskan ringkasan subkategori."
                        className={`${inputClass} resize-y`}
                    />
                </Field>

                <Field
                    label={isEdit ? "Ikon" : "Ikon *"}
                    htmlFor="subcategory-icon"
                >
                    <IconDropzone
                        id="subcategory-icon"
                        file={iconFile}
                        onChange={setIconFile}
                        existingIconUrl={
                            subcategory?.iconUrl ?? ""
                        }
                        existingIconName={
                            subcategory?.icon ?? ""
                        }
                        disabled={submitting}
                    />

                    {isEdit && (
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                            Biarkan kosong bila ikon lama tetap
                            digunakan.
                        </p>
                    )}
                </Field>

                <div className="grid gap-6 md:grid-cols-2">
                    <Field label="Urutan" htmlFor="subcategory-order">
                        <input
                            id="subcategory-order"
                            type="number"
                            min="0"
                            step="1"
                            value={form.sortOrder}
                            onChange={(event) =>
                                updateField("sortOrder", event.target.value)
                            }
                            className={inputClass}
                        />
                    </Field>
                </div>

                <label className="flex items-center justify-between gap-4 rounded-xl bg-blue-50 p-4">
                    <span>
                        <span className="block font-semibold text-slate-800">
                            Aktifkan Subkategori
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                            Subkategori aktif dapat ditampilkan di website publik.
                        </span>
                    </span>

                    <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(event) =>
                            updateField("isActive", event.target.checked)
                        }
                        className="h-5 w-5 shrink-0 accent-blue-600"
                    />
                </label>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => navigate("/subcategories")}
                        className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                        Batal
                    </button>

                    <button
                        type="submit"
                        disabled={submitting || loadingCategories}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save size={19} />
                        {submitting
                            ? "Menyimpan..."
                            : isEdit
                                ? "Perbarui Subkategori"
                                : "Simpan Subkategori"}
                    </button>
                </div>
            </fieldset>
        </form>
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
