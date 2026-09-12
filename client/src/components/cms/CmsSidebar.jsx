import { NavLink } from "react-router-dom";
import {
    BookOpen,
    FolderTree,
    LayoutDashboard,
    ListTree,
    MessageCircleQuestion,
    Network,
    PlayCircle,
    X,
} from "lucide-react";

const menuItems = [
    {
        name: "Dashboard",
        path: "/",
        icon: LayoutDashboard,
        end: true,
    },
    {
        name: "Kategori",
        path: "/categories",
        icon: FolderTree,
    },
    {
        name: "Subkategori",
        path: "/subcategories",
        icon: Network,
    },
    {
        name: "Topik",
        path: "/topics",
        icon: ListTree,
    },
    {
        name: "FAQ",
        path: "/faqs",
        icon: MessageCircleQuestion,
    },
    {
        name: "Panduan",
        path: "/guides",
        icon: BookOpen,
    },
    {
        name: "Tutorial",
        path: "/tutorials",
        icon: PlayCircle,
    },
];

/*
 * Di layar besar sidebar menempel tetap di kiri.
 * Di layar kecil sidebar berubah menjadi drawer yang
 * muncul dari kiri dan ditutup dari tombol atau tautan.
 */
export default function CmsSidebar({
    guideLayout = false,
    mobileOpen = false,
    onNavigate = () => {},
}) {
    return (
        <aside
            id="cms-sidebar"
            className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col overflow-y-auto text-white transition-transform duration-200 ease-out lg:w-64 lg:translate-x-0 ${
                guideLayout ? "bg-[#02275d]" : "bg-[#062E6F]"
            } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
            <div
                className={
                    guideLayout
                        ? "px-6 pt-7"
                        : "border-b border-white/10 px-6 py-6"
                }
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1
                            className={
                                guideLayout
                                    ? "text-[26px] leading-[31px] font-bold"
                                    : "text-2xl font-bold"
                            }
                        >
                            INSW
                        </h1>

                        <p
                            className={
                                guideLayout
                                    ? "mt-1 text-[13px] leading-4 font-medium"
                                    : "mt-1 text-sm text-blue-100"
                            }
                        >
                            CMS Pusat Bantuan
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onNavigate}
                        aria-label="Tutup menu navigasi"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-blue-100 transition hover:bg-white/10 hover:text-white lg:hidden"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <nav
                className={
                    guideLayout
                        ? "mt-6 flex flex-col gap-1 overflow-y-auto px-6 pb-5"
                        : "flex flex-1 flex-col gap-1 p-4"
                }
            >
                {menuItems.map((item) => {
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            onClick={onNavigate}
                            className={({ isActive }) =>
                                guideLayout
                                    ? `flex h-11 items-center gap-3 rounded-[10px] px-[14px] text-sm transition ${
                                          isActive
                                              ? "bg-[#2b63c7] font-semibold text-white"
                                              : "font-medium text-white hover:bg-white/10"
                                      }`
                                    : `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                                          isActive
                                              ? "bg-blue-600 text-white"
                                              : "text-blue-100 hover:bg-white/10 hover:text-white"
                                      }`
                            }
                        >
                            {guideLayout ? (
                                <span
                                    aria-hidden="true"
                                    className="size-[18px] shrink-0 rounded-[5px] bg-[#f0f8ff]"
                                />
                            ) : (
                                <Icon size={20} aria-hidden="true" />
                            )}

                            {item.name}
                        </NavLink>
                    );
                })}
            </nav>

            {guideLayout && (
                <div className="mt-6 px-6 pb-6">
                    <p className="text-[13px] font-semibold">LNSW</p>

                    <p className="mt-[6px] text-xs">
                        Kelola konten Pusat Bantuan
                    </p>
                </div>
            )}
        </aside>
    );
}
