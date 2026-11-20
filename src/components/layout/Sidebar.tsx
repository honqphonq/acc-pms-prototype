import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { NAV } from "./navigation";
import { cn } from "@/utils/cn";
import { Tip } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useDb } from "@/hooks/useDb";
import { getAlerts } from "@/services/selectors";

export function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }: { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onCloseMobile: () => void }) {
  const { pathname } = useLocation();
  const { db } = useDb();
  const { user } = useAuth();
  const counts = {
    alerts: getAlerts(db).filter((a) => a.severity === "danger").length,
    approvals: db.materialRequests.filter((r) => r.status === "cho_duyet").length,
    directives: db.directives.filter((d) => d.status !== "hoan_thanh" && d.assigneeId === user?.id).length,
  };
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const groupActive = (item: (typeof NAV)[number]) => isActive(item.to) || item.children?.some((c) => pathname.startsWith(c.to));
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(NAV.filter((n) => n.children).map((n) => [n.to, !!groupActive(n)])));

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onCloseMobile} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar text-slate-200 transition-all duration-200",
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          mobileOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:translate-x-0",
        )}
      >
        <div className={cn("flex h-16 items-center gap-3 border-b border-sidebar-border px-4", collapsed && "lg:justify-center lg:px-0")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1"><img src={`${import.meta.env.BASE_URL}assets/acc-logo.webp`} alt="ACC" className="h-full w-full object-contain" /></span>
          <div className={cn("min-w-0", collapsed && "lg:hidden")}>
            <div className="truncate text-[15px] font-bold text-white">Tổng công ty ACC</div>
            <div className="truncate text-[11px] text-sidebar-muted">Quản lý dự án thi công</div>
          </div>
        </div>
        <nav className="scrollbar-dark flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = groupActive(item);
            const badge = item.badgeKey ? counts[item.badgeKey] : 0;
            const content = (
              <>
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className={cn("line-clamp-2 flex-1 text-left leading-snug", collapsed && "lg:hidden")}>{item.label}</span>
                {badge > 0 && <span className={cn("rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-white", collapsed && "lg:absolute lg:right-2 lg:top-1")}>{badge}</span>}
                {item.children && <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open[item.to] && "rotate-180", collapsed && "lg:hidden")} />}
              </>
            );
            const cls = cn(
              "relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
              active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-sidebar-hover hover:text-white",
              collapsed && "lg:justify-center lg:px-0",
            );
            const node = item.children ? (
              collapsed ? (
                <NavLink to={item.children[0].to} className={cls} onClick={onCloseMobile}>{content}</NavLink>
              ) : (
                <button className={cls} onClick={() => setOpen((o) => ({ ...o, [item.to]: !o[item.to] }))}>{content}</button>
              )
            ) : (
              <NavLink to={item.to} end={item.to === "/"} className={cls} onClick={onCloseMobile}>
                {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-primary" />}
                {content}
              </NavLink>
            );
            return (
              <div key={item.to}>
                {collapsed ? <Tip content={item.label} side="right">{node}</Tip> : node}
                {item.children && open[item.to] && !collapsed && (
                  <div className="mb-1 ml-[22px] mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                    {item.children.map((c) => (
                      <NavLink
                        key={c.to}
                        to={c.to}
                        end={c.to === "/projects"}
                        onClick={onCloseMobile}
                        className={({ isActive: a }) => cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors", a ? "bg-white/10 font-semibold text-white" : c.soon ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-white")}
                      >
                        <span className="min-w-0 flex-1">{c.label}</span>
                        {c.soon && <span className="shrink-0 rounded bg-white/10 px-1 text-[9.5px] font-medium text-slate-400">Sắp có</span>}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="hidden border-t border-sidebar-border p-3 lg:block">
          <button onClick={onToggle} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-sidebar-hover hover:text-white", collapsed && "justify-center px-0")}>
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Thu gọn menu</>}
          </button>
        </div>
      </aside>
    </>
  );
}
