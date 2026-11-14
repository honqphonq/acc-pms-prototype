import { useMemo } from "react";
import { cn } from "@/utils/cn";
import { DEMO_TODAY, diffDays, monthsBetween } from "@/utils/date";
import { fmtDate, fmtPct } from "@/utils/format";
import { Tip } from "@/components/ui/tooltip";
import type { TaskHealth } from "@/services/selectors";

export interface GanttRow {
  id: string;
  label: string;
  code: string;
  depth: number;
  kind: "project" | "item" | "group" | "task";
  start: string;
  end: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  actual: number;
  planned: number;
  health: TaskHealth;
}

const HEALTH_COLOR: Record<TaskHealth, string> = {
  hoan_thanh: "bg-success",
  qua_han: "bg-rose-500",
  cham: "bg-amber-500",
  dung: "bg-blue-600",
  chua_bat_dau: "bg-slate-400",
};

/** Biểu đồ Gantt: thanh kế hoạch (baseline) + phần đã hoàn thành + mốc hôm nay */
export function GanttChart({ rows, onRowClick, showBaseline = true }: { rows: GanttRow[]; onRowClick?: (id: string) => void; showBaseline?: boolean }) {
  const { start, months, totalDays } = useMemo(() => {
    const s = rows.map((r) => r.start).sort()[0] ?? DEMO_TODAY;
    const e = rows.map((r) => r.end).sort().pop() ?? DEMO_TODAY;
    const ms = monthsBetween(s, e);
    const first = `${ms[0]}-01`;
    const last = ms[ms.length - 1];
    const [y, m] = last.split("-").map(Number);
    const endD = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return { start: first, months: ms, totalDays: diffDays(first, endD) + 1 };
  }, [rows]);
  const DAY = Math.max(2.2, Math.min(6, 1400 / totalDays));
  const width = totalDays * DAY;
  const x = (d: string) => diffDays(start, d) * DAY;
  const todayX = x(DEMO_TODAY);

  return (
    <div className="flex overflow-hidden rounded-b-xl">
      <div className="w-[300px] shrink-0 border-r bg-white">
        <div className="flex h-10 items-center border-b bg-slate-50 px-3 text-[11.5px] font-semibold uppercase text-slate-500">Công việc</div>
        {rows.map((r) => (
          <div key={r.id} onClick={() => onRowClick?.(r.id)} className={cn("flex h-9 cursor-pointer items-center gap-1.5 truncate border-b border-slate-100 pr-2 text-[12.5px] hover:bg-slate-50", r.kind === "project" && "bg-orange-50 font-bold", r.kind === "item" && "bg-sky-50/70 font-semibold", r.kind === "group" && "font-semibold")} style={{ paddingLeft: 10 + r.depth * 14 }}>
            <span className="shrink-0 text-[11px] text-slate-400">{r.code}</span>
            <span className="truncate">{r.label}</span>
          </div>
        ))}
      </div>
      <div className="scrollbar-thin flex-1 overflow-x-auto">
        <div style={{ width }} className="relative">
          <div className="flex h-10 border-b bg-slate-50">
            {months.map((m) => {
              const [y, mm] = m.split("-").map(Number);
              const days = new Date(Date.UTC(y, mm, 0)).getUTCDate();
              return (
                <div key={m} style={{ width: days * DAY }} className="flex shrink-0 flex-col justify-center border-r border-slate-200 px-1 text-[10.5px] text-slate-500">
                  <span className="font-semibold text-slate-600">T{mm}</span>
                  {(mm === 1 || m === months[0]) && <span>{y}</span>}
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute bottom-0 top-10 z-10 w-0.5 bg-primary/80" style={{ left: todayX }}>
            <span className="absolute -top-0 left-1 whitespace-nowrap rounded bg-primary px-1 text-[9.5px] font-semibold text-white">Hôm nay</span>
          </div>
          {rows.map((r) => {
            const left = x(r.start);
            const w = Math.max(DAY * 1.5, (diffDays(r.start, r.end) + 1) * DAY);
            return (
              <div key={r.id} className={cn("relative h-9 border-b border-slate-100", r.kind === "project" && "bg-orange-50/50", r.kind === "item" && "bg-sky-50/40")} onClick={() => onRowClick?.(r.id)}>
                <Tip content={<div><div className="font-semibold">{r.code} {r.label}</div><div>KH: {fmtDate(r.start)} – {fmtDate(r.end)}</div>{r.actualStart && <div>TT: {fmtDate(r.actualStart)} – {r.actualEnd ? fmtDate(r.actualEnd) : "…"}</div>}<div>Hoàn thành {fmtPct(r.actual)} · KH {fmtPct(r.planned)}</div></div>}>
                  <div className={cn("absolute top-1/2 -translate-y-1/2 cursor-pointer overflow-hidden rounded", r.kind === "task" ? "h-4" : "h-3", showBaseline ? "bg-slate-200 ring-1 ring-inset ring-slate-300" : "bg-slate-100")} style={{ left, width: w }}>
                    <div className={cn("h-full", HEALTH_COLOR[r.health], r.kind !== "task" && "opacity-80")} style={{ width: `${r.actual * 100}%` }} />
                  </div>
                </Tip>
                {r.kind === "task" && <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-500" style={{ left: left + w + 4 }}>{Math.round(r.actual * 100)}%</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GanttLegend() {
  const items: [string, string][] = [["bg-success", "Hoàn thành"], ["bg-blue-600", "Đúng kế hoạch"], ["bg-amber-500", "Chậm"], ["bg-rose-500", "Quá hạn"], ["bg-slate-200 ring-1 ring-slate-300", "Kế hoạch (baseline)"]];
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-slate-500">
      {items.map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className={cn("h-2.5 w-5 rounded-sm", c)} />{l}</span>)}
      <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-primary" /> Hôm nay</span>
    </div>
  );
}
