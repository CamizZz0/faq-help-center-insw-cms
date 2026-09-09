import { Outlet } from "react-router-dom";
import CmsSidebar from "./CmsSidebar";

export default function CmsLayout() {
    return (
        <div className="min-h-screen bg-slate-50">
            <CmsSidebar />

            <div className="lg:ml-64">
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
                    <div className="flex min-h-16 items-center justify-between px-6">
                        <p className="text-sm text-slate-500">
                            CMS Pusat Bantuan
                        </p>

                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-semibold text-[#062E6F]">
                            A
                        </div>
                    </div>
                </header>

                <main className="p-5 sm:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}