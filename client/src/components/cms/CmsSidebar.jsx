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

export default function CmsSidebar() {
    return (
        <aside className="bg-[#062E6F] text-white lg:fixed lg:inset-y-0 lg:w-64">
            <div className="flex h-full flex-col">
                <div className="border-b border-white/10 px-6 py-6">
                    <h1 className="text-2xl font-bold">
                        INSW
                    </h1>

                    <p className="mt-1 text-sm text-blue-100">
                        CMS Pusat Bantuan
                    </p>
                </div>

                <nav className="flex gap-2 overflow-x-auto p-4 lg:flex-1 lg:flex-col lg:overflow-visible">
                    {menuItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.end}
                                className={({ isActive }) =>
                                    `flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                                    }`
                                }
                            >
                                <Icon size={20} />
                                {item.name}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}