import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/cn";

export function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("acc-pms:sidebar") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    localStorage.setItem("acc-pms:sidebar", collapsed ? "1" : "0");
  }, [collapsed]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden"><Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} /></div>
      <div className={cn("flex min-h-screen flex-col transition-all duration-200", collapsed ? "lg:pl-[72px]" : "lg:pl-64", "print:!pl-0")}>
        <div className="print:hidden"><Header onOpenMobile={() => setMobileOpen(true)} /></div>
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 md:px-6 md:py-6 print:max-w-none print:p-0">
          <Outlet />
        </main>
        <footer className="print:hidden border-t border-slate-200 px-6 py-3 text-[11px] text-slate-400">
          Prototype trình diễn giải pháp – Hệ thống quản lý dự án thi công TCT Xây dựng Công trình Hàng không ACC · Dữ liệu giả lập, lưu trên trình duyệt (localStorage)
        </footer>
      </div>
    </div>
  );
}
