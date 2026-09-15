import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import CategoryForm from "../../components/cms/CategoryForm";
import { getCmsCategoryById } from "../../services/api";

export default function CategoryFormPage() {
    const { categoryId } = useParams();
    return <CategoryFormLoader key={categoryId || "new"} categoryId={categoryId} />;
}

function CategoryFormLoader({ categoryId }) {
    const isEdit = Boolean(categoryId);
    const navigate = useNavigate();
    const [category, setCategory] = useState(null);
    const [loading, setLoading] = useState(isEdit);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        if (!isEdit) return undefined;

        let active = true;

        async function loadCategory() {
            try {
                setLoading(true);
                setLoadError("");
                const result = await getCmsCategoryById(categoryId);
                if (active) setCategory(result?.data ?? null);
            } catch (error) {
                if (active) setLoadError(error.message ?? "Gagal memuat kategori.");
            } finally {
                if (active) setLoading(false);
            }
        }

        loadCategory();
        return () => { active = false; };
    }, [categoryId, isEdit]);

    if (loading) return <p className="p-6 text-slate-600">Memuat form kategori...</p>;

    if (loadError || (isEdit && !category)) {
        return (
            <section className="mx-auto max-w-4xl">
                <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-600">
                    {loadError || "Kategori tidak ditemukan."}
                </p>
                <Link to="/categories" className="mt-4 inline-block text-blue-600">
                    Kembali ke daftar kategori
                </Link>
            </section>
        );
    }

    return (
        <section className="mx-auto max-w-4xl">
            <Link to="/categories" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600">
                <ArrowLeft size={18} />
                Kembali ke daftar kategori
            </Link>

            <h1 className="mt-6 text-3xl font-bold text-slate-900">
                {isEdit ? "Edit Kategori" : "Tambah Kategori"}
            </h1>

            <p className="mt-2 text-slate-600">
                {isEdit
                    ? "Perbarui informasi kategori utama Pusat Bantuan."
                    : "Lengkapi informasi untuk membuat kategori utama baru."}
            </p>

            <CategoryForm
                mode={isEdit ? "edit" : "create"}
                category={category}
                onCancel={() => navigate("/categories")}
                onSaved={() => navigate("/categories")}
            />
        </section>
    );
}
