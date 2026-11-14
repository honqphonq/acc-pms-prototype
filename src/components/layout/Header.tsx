import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Building2, CalendarRange, ChevronRight, ClipboardList, LogOut, Menu, Package, RefreshCcw, Search, Truck, UserCog, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/common/UserAvatar";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { PATH_LABELS } from "./navigation";
import { DATA_UPDATED_AT } from "@/utils/date";
import { ROLE_LABELS } from "@/utils/constants";
import { fmtDateTime } from "@/utils/format";
import { markAllNotificationsRead, markNotificationRead } from "@/services/actions";
import { cn } from "@/utils/cn";

function useBreadcrumb() {
  const { pathname } = useLocation();
  const { db } = useDb();
  return useMemo(() => {
    const segs = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; to: string }[] = [{ label: "Trang chủ", to: "/" }];
    let acc = "";
    segs.forEach((s) => {
      acc += "/" + s;
      let label = PATH_LABELS[s];
      if (!label) {
        label =
          db.projects.find((p) => p.id === s)?.shortName ??
          db.materialRequests.find((r) => r.id === s)?.code ??
          db.equipment.find((e) => e.id === s)?.code ??
          db.acceptanceRecords.find((a) => a.id === s)?.code ??
          s;
      }
      crumbs.push({ label, to: acc });
    });
    return crumbs;
  }, [pathname, db]);
}

export function Header({ onOpenMobile }: { onOpenMobile: () => void }) {
  const crumbs = useBreadcrumb();
  const { db, run, resetDemo } = useDb();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const unread = db.notifications.filter((n) => !n.read).length;

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const out: { icon: typeof Building2; label: string; sub: string; to: string }[] = [];
    db.projects.filter((p) => `${p.name} ${p.code} ${p.location}`.toLowerCase().includes(s)).slice(0, 4).forEach((p) => out.push({ icon: Building2, label: p.name, sub: `Dự án · ${p.code}`, to: `/projects/${p.id}` }));
    db.constructionPlans.filter((t) => `${t.code} ${t.name}`.toLowerCase().includes(s)).slice(0, 4).forEach((t) => out.push({ icon: CalendarRange, label: `${t.code} ${t.name}`, sub: `Công việc · ${db.projects.find((p) => p.id === t.projectId)?.shortName}`, to: `/construction/plan/${t.projectId}?task=${t.id}` }));
    db.materialRequests.filter((r) => `${r.code} ${r.title}`.toLowerCase().includes(s)).slice(0, 3).forEach((r) => out.push({ icon: ClipboardList, label: r.title, sub: `Đề xuất vật tư · ${r.code}`, to: `/materials/requests/${r.id}` }));
    db.materials.filter((m) => `${m.code} ${m.name}`.toLowerCase().includes(s)).slice(0, 3).forEach((m) => out.push({ icon: Package, label: m.name, sub: `Vật tư · ${m.code}`, to: `/materials/inventory?material=${m.id}` }));
    db.equipment.filter((e) => `${e.code} ${e.name} ${e.plate}`.toLowerCase().includes(s)).slice(0, 4).forEach((e) => out.push({ icon: Truck, label: `${e.code} – ${e.name}`, sub: `Thiết bị · ${e.group}`, to: `/equipment/${e.id}` }));
    return out;
  }, [q, db]);

  const doReset = async () => {
    if (await confirm({ title: "Khôi phục dữ liệu demo?", description: "Toàn bộ thao tác đã thực hiện (tạo, sửa, xóa, phê duyệt...) sẽ bị xóa và dữ liệu trở về trạng thái ban đầu từ các file JSON.", confirmText: "Khôi phục", destructive: true })) {
      resetDemo();
      toast.success("Đã khôi phục dữ liệu demo ban đầu");
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
      <button className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={onOpenMobile} aria-label="Mở menu">
        <Menu className="h-5 w-5" />
      </button>
      <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-hidden text-[13px] text-slate-500 md:flex">
        {crumbs.map((c, i) => (
          <span key={c.to} className={cn("flex items-center gap-1", i === crumbs.length - 1 ? "min-w-0" : "shrink-0")}>
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
            {i === crumbs.length - 1 ? <span className="truncate font-medium text-slate-800">{c.label}</span> : <Link to={c.to} className="truncate hover:text-primary">{c.label}</Link>}
          </span>
        ))}
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
        <div className="hidden whitespace-nowrap text-right text-[11px] leading-tight text-slate-400 2xl:block">
          Dữ liệu cập nhật
          <div className="font-medium text-slate-600">{DATA_UPDATED_AT}</div>
        </div>
        <Popover open={searchOpen && results.length > 0} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <div className="relative hidden w-56 sm:block lg:w-72">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder="Tìm dự án, công việc, vật tư, thiết bị..." className="h-9 bg-slate-50 pl-8" />
            </div>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[380px] p-1.5" onOpenAutoFocus={(e) => e.preventDefault()}>
            <div className="max-h-96 overflow-y-auto">
              {results.map((r, i) => (
                <button key={i} onClick={() => { navigate(r.to); setQ(""); setSearchOpen(false); }} className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-slate-50">
                  <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-slate-800">{r.label}</div>
                    <div className="truncate text-[11px] text-slate-500">{r.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button className="relative rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Thông báo">
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{unread}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[380px] p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-semibold">Thông báo</div>
              <button className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={() => run(markAllNotificationsRead)}>
                <CheckCheck className="h-3.5 w-3.5" /> Đánh dấu đã đọc
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {db.notifications.slice(0, 15).map((n) => (
                <button
                  key={n.id}
                  onClick={() => { run(markNotificationRead, n.id); navigate(n.link); }}
                  className={cn("flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50", !n.read && "bg-rose-50/40")}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", { danger: "bg-rose-500", warning: "bg-amber-500", success: "bg-green-500", info: "bg-blue-500" }[n.severity])} />
                  <div className="min-w-0">
                    <div className={cn("text-[13px] text-slate-800", !n.read && "font-semibold")}>{n.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</div>
                    <div className="mt-1 text-[10.5px] text-slate-400">{fmtDateTime(n.createdAt)}</div>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-50">
                <Avatar name={user.name} size="md" />
                <div className="hidden whitespace-nowrap text-left leading-tight md:block">
                  <div className="text-[13px] font-semibold text-slate-800">{user.name}</div>
                  <div className="text-[11px] text-slate-500">{ROLE_LABELS[user.role]}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="text-sm font-semibold text-slate-800">{user.name}</div>
                <div className="font-normal">{user.title}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { logout(); navigate("/login"); }}>
                <UserCog /> Đổi vai trò demo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={doReset}>
                <RefreshCcw /> Khôi phục dữ liệu demo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={() => { logout(); navigate("/login"); }}>
                <LogOut /> Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
