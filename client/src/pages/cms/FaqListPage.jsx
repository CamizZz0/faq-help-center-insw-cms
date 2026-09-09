import {
    Plus,
    Search,
} from "lucide-react";

export default function FaqListPage() {
    return (
        <section className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Kelola FAQ
                    </h1>

                    <p className="mt-2 text-slate-600">
                        Tambah dan perbarui konten FAQ.
                    </p>
                </div>

                <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
                >
                    <Plus size={20} />
                    Tambah FAQ
                </button>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_240px_180px]">
                    <div className="relative">
                        <Search
                            size={20}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="search"
                            placeholder="Cari pertanyaan..."
                            className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <select className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500">
                        <option>Semua kategori</option>
                    </select>

                    <select className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500">
                        <option>Semua status</option>
                        <option>Terbit</option>
                        <option>Draft</option>
                    </select>
                </div>

                <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left">
                        <thead>
                            <tr className="border-b border-slate-200 text-sm text-slate-500">
                                <th className="px-4 py-4">
                                    Pertanyaan
                                </th>
                                <th className="px-4 py-4">
                                    Topik
                                </th>
                                <th className="px-4 py-4">
                                    Status
                                </th>
                                <th className="px-4 py-4 text-right">
                                    Aksi
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr>
                                <td
                                    colSpan="4"
                                    className="px-4 py-16 text-center text-slate-500"
                                >
                                    Data FAQ akan ditampilkan dari API.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}