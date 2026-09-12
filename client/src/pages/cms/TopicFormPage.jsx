import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import TopicForm from "../../components/cms/TopicForm";
import { getCmsCategories, getCmsTopicById } from "../../services/api";

export default function TopicFormPage() {
    const { topicId } = useParams();
    return <TopicFormLoader key={topicId || "new"} topicId={topicId} />;
}

function TopicFormLoader({ topicId }) {
    const isEdit = Boolean(topicId);
    const [categories, setCategories] = useState([]);
    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadData() {
            try {
                setLoading(true);
                setLoadError("");
                const [categoryResult, topicResult] = await Promise.all([
                    getCmsCategories(),
                    topicId ? getCmsTopicById(topicId) : Promise.resolve(null),
                ]);
                if (!active) return;

                const categoryList = Array.isArray(categoryResult?.data)
                    ? categoryResult.data
                    : [];
                const data = topicResult?.data;

                if (topicId && (!data?.category || !data?.subcategory)) {
                    throw new Error("Data relasi topik tidak lengkap.");
                }

                if (
                    data?.category &&
                    !categoryList.some(
                        (category) => category.id === data.category.id,
                    )
                ) {
                    categoryList.push(data.category);
                }

                setCategories(categoryList);
                setTopic(data ?? null);
            } catch (error) {
                if (active) setLoadError(error.message);
            } finally {
                if (active) setLoading(false);
            }
        }

        loadData();
        return () => {
            active = false;
        };
    }, [topicId]);

    if (loading) {
        return <p className="p-6 text-slate-600">Memuat form topik...</p>;
    }

    if (loadError) {
        return (
            <section className="mx-auto max-w-4xl">
                <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-600">
                    {loadError}
                </p>
                <Link to="/topics" className="mt-4 inline-block text-blue-600">
                    Kembali ke daftar topik
                </Link>
            </section>
        );
    }

    return (
        <section className="mx-auto max-w-4xl">
            <Link
                to="/topics"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
            >
                <ArrowLeft size={18} />
                Kembali ke daftar topik
            </Link>
            <h1 className="mt-6 text-3xl font-bold text-slate-900">
                {isEdit ? "Edit Topik" : "Tambah Topik"}
            </h1>
            <p className="mt-2 text-slate-600">
                {isEdit
                    ? "Perbarui topik FAQ di dalam subkategori yang dipilih."
                    : "Lengkapi informasi untuk membuat topik FAQ baru."}
            </p>
            <TopicForm
                mode={isEdit ? "edit" : "create"}
                topic={topic}
                categories={categories}
            />
        </section>
    );
}
