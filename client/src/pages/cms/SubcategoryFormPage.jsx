import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import SubcategoryForm from "../../components/cms/SubcategoryForm";
import {
    getCmsCategories,
    getCmsSubcategoryById,
} from "../../services/api";

export default function SubcategoryFormPage() {
    const { subcategoryId } = useParams();

    return (
        <SubcategoryFormLoader
            key={subcategoryId || "new"}
            subcategoryId={subcategoryId}
        />
    );
}

function SubcategoryFormLoader({ subcategoryId }) {
    const isEdit = Boolean(subcategoryId);
    const [categories, setCategories] = useState([]);
    const [subcategory, setSubcategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadData() {
            try {
                setLoading(true);
                setLoadingCategories(true);
                setLoadError("");

                const [categoryResult, subcategoryResult] = await Promise.all([
                    getCmsCategories(),
                    subcategoryId
                        ? getCmsSubcategoryById(subcategoryId)
                        : Promise.resolve(null),
                ]);

                if (!active) return;

                const categoryList = Array.isArray(categoryResult?.data)
                    ? categoryResult.data
                    : [];

                setCategories(categoryList);
                setLoadingCategories(false);

                if (subcategoryId) {
                    const data = subcategoryResult?.data;

                    if (!data?.category) {
                        throw new Error("Data subkategori tidak lengkap.");
                    }

                    setSubcategory(data);
                }
            } catch (err) {
                if (active) {
                    setLoadError(err.message);
                    setLoadingCategories(false);
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadData();

        return () => {
            active = false;
        };
    }, [subcategoryId]);

    if (loading) {
        return (
            <p className="p-6 text-slate-600">
                Memuat form subkategori...
            </p>
        );
    }

    if (loadError) {
        return (
            <section className="mx-auto max-w-4xl">
                <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-4 text-red-600"
                >
                    {loadError}
                </p>

                <Link
                    to="/subcategories"
                    className="mt-4 inline-block text-blue-600"
                >
                    Kembali ke daftar subkategori
                </Link>
            </section>
        );
    }

    return (
        <section className="mx-auto max-w-4xl">
            <Link
                to="/subcategories"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
            >
                <ArrowLeft size={18} />
                Kembali ke daftar subkategori
            </Link>

            <h1 className="mt-6 text-3xl font-bold text-slate-900">
                {isEdit ? "Edit Subkategori" : "Tambah Subkategori"}
            </h1>

            <p className="mt-2 text-slate-600">
                {isEdit
                    ? "Perbarui pengelompokan layanan di dalam kategori FAQ."
                    : "Lengkapi informasi untuk membuat subkategori baru."}
            </p>

            <SubcategoryForm
                mode={isEdit ? "edit" : "create"}
                subcategory={subcategory}
                categories={categories}
                loadingCategories={loadingCategories}
            />
        </section>
    );
}
