import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";

import CmsSidebar from "./CmsSidebar";

export default function CmsLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    /*
     * Menutup drawer saat layar melebar ke ukuran
     * desktop agar kunci scroll tidak tertinggal.
     */
    useEffect(() => {
        const query = window.matchMedia("(min-width: 1024px)");

        function handleChange(event) {
            if (event.matches) {
                setSidebarOpen(false);
            }
        }

        query.addEventListener("change", handleChange);

        return () => {
            query.removeEventListener("change", handleChange);
        };
    }, []);

    /*
     * Menutup drawer dengan Escape dan mengunci scroll
     * halaman selama drawer mobile terbuka.
     */
    useEffect(() => {
        if (!sidebarOpen) return;

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setSidebarOpen(false);
            }
        }

        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [sidebarOpen]);

    return (
        <div className="min-h-screen bg-slate-50">
            {sidebarOpen && (
                <div
                    aria-hidden="true"
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
                />
            )}

            <CmsSidebar
                mobileOpen={sidebarOpen}
                onNavigate={() => setSidebarOpen(false)}
            />

            <div className="lg:ml-64">
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
                    <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Buka menu navigasi"
                                aria-expanded={sidebarOpen}
                                aria-controls="cms-sidebar"
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50 lg:hidden"
                            >
                                <Menu size={20} aria-hidden="true" />
                            </button>

                            <p className="truncate text-sm text-slate-500">
                                CMS Pusat Bantuan
                            </p>
                        </div>

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-[#062E6F]">
                            A
                        </div>
                    </div>
                </header>

                <main className="p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
