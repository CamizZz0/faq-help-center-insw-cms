export default function PlaceholderPage({ title }) {
    return (
        <section className="mx-auto max-w-7xl">
            <h1 className="text-3xl font-bold text-slate-900">
                {title}
            </h1>

            <p className="mt-2 text-slate-600">
                Halaman ini akan dikerjakan setelah CRUD FAQ selesai.
            </p>
        </section>
    );
}