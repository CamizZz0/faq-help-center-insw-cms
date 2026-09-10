import { NavLink } from "react-router-dom";
import {
    BookOpen,
    FolderTree,
    LayoutDashboard,
    ListTree,
    MessageCircleQuestion,
    Network,
    PlayCircle,
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

export default function CmsSidebar({ guideLayout = false }) {
    return (
        <aside className={guideLayout ? "bg-[#02275d] text-white lg:fixed lg:inset-y-0 lg:w-[248px] lg:overflow-y-auto" : "bg-[#062E6F] text-white lg:fixed lg:inset-y-0 lg:w-64"}>
            <div className="flex h-full flex-col">
                <div className={guideLayout ? "px-6 pt-7 lg:h-[92px]" : "border-b border-white/10 px-6 py-6"}>
                    <h1 className={guideLayout ? "text-[26px] leading-[31px] font-bold" : "text-2xl font-bold"}>
                        INSW
                    </h1>

                    <p className={guideLayout ? "mt-1 text-[13px] leading-4 font-medium" : "mt-1 text-sm text-blue-100"}>
                        CMS Pusat Bantuan
                    </p>
                </div>

                <nav className={guideLayout ? "mt-[26px] flex gap-2 overflow-x-auto px-6 pb-5 lg:h-[430px] lg:flex-col lg:overflow-visible lg:pb-0" : "flex gap-2 overflow-x-auto p-4 lg:flex-1 lg:flex-col lg:overflow-visible"}>
                    {menuItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.end}
                                className={({ isActive }) =>
                                    guideLayout
                                    ? `flex h-11 shrink-0 items-center gap-3 rounded-[10px] px-[14px] text-sm transition lg:w-[200px] ${isActive ? "bg-[#2b63c7] font-semibold text-white" : "font-medium text-white hover:bg-white/10"}`
                                    : `flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                                    }`
                                }
                            >
                                {guideLayout ? <span aria-hidden="true" className="size-[18px] shrink-0 rounded-[5px] bg-[#f0f8ff]" /> : <Icon size={20} />}
                                {item.name}
                            </NavLink>
                        );
                    })}
                </nav>
                {guideLayout && <div className="mt-[26px] hidden px-6 lg:block"><p className="text-[13px] font-semibold">LNSW</p><p className="mt-[6px] text-xs">Kelola konten Pusat Bantuan</p></div>}
            </div>
        </aside>
    );
}
