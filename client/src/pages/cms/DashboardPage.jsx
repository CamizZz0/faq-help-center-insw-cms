import { Link } from "react-router-dom";
import {
    BookOpen,
    FolderTree,
    MessageCircleQuestion,
    PlayCircle,
} from "lucide-react";

const contentMenus = [
    {
        title: "Kelola Kategori",
        description:
            "Tambah dan perbarui kategori pusat bantuan.",
        path: "/categories",
        icon: FolderTree,
    },
    {
        title: "Kelola FAQ",
        description:
            "Tambah, ubah, dan publikasikan FAQ.",
        path: "/faqs",
        icon: MessageCircleQuestion,
    },
    {
        title: "Kelola Panduan",
        description:
            "Kelola dokumen panduan pengguna.",
        path: "/guides",
        icon: BookOpen,
    },
    {
        title: "Kelola Tutorial",
        description:
            "Kelola video tutorial pengguna.",
        path: "/tutorials",
        icon: PlayCircle,
    },
];

export default function DashboardPage() {
    return (
        <section className="mx-auto max-w-7xl">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">
                    Dashboard
                </h1>

                <p className="mt-2 text-slate-600">
                    Kelola seluruh konten Pusat Bantuan INSW.
                </p>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {contentMenus.map((menu) => {
                    const Icon = menu.icon;

                    return (
                        <Link
                            key={menu.path}
                            to={menu.path}
                            className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Icon size={25} />
                            </div>

                            <h2 className="mt-5 font-bold text-slate-900">
                                {menu.title}
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                {menu.description}
                            </p>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}