import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/utils/cn";
import { DEMO_TODAY, diffDays, monthsBetween } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { Tip } from "@/components/ui/tooltip";

/** Trạng thái thanh Gantt */
export type GanttStatus = "dung_tien_do" | "dang_thuc_hien" | "cham_tien_do" | "hoan_thanh_muon" | "chua_bat_dau";

export const GANTT_STATUS: Record<GanttStatus, { label: string; color: string }> = {
  dung_tien_do: { label: "Đúng tiến độ", color: "#16A34A" },
  dang_thuc_hien: { label: "Đang thực hiện", color: "#0EA5E9" },
  cham_tien_do: { label: "Chậm tiến độ", color: "#DC2626" },
  hoan_thanh_muon: { label: "Hoàn thành muộn", color: "#F59E0B" },
  chua_bat_dau: { label: "Chưa bắt đầu", color: "#CBD5E1" },
};

export interface GanttRow {
  id: string;
  label: string;
  code: string;
  depth: number;
  kind: "project" | "item" | "group" | "task";
  start: string; // kế hoạch
  end: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  status: GanttStatus;
}

/** Khoảng thời gian thanh chính: theo thực tế nếu đã bắt đầu, theo kế hoạch nếu chưa */
function barRange(r: GanttRow): [string, string] {
  if (!r.actualStart) return [r.start, r.end];
  if (r.actualEnd) return [r.actualStart, r.actualEnd];
  // đang làm: tới hạn kế hoạch, nếu đã quá hạn thì kéo tới hôm nay
  return [r.actualStart, r.end < DEMO_TODAY ? DEMO_TODAY : r.end];
}

const DAY = 5; // px / ngày

export function GanttChart({ rows, onRowClick, showBaseline = true }: { rows: GanttRow[]; onRowClick?: (id: string) => void; showBaseline?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { start, months, totalDays } = useMemo(() => {
    const dates = rows.flatMap((r) => [r.start, r.end, ...barRange(r)]);
    const s = dates.slice().sort()[0] ?? DEMO_TODAY;
    const e = dates.slice().sort().pop() ?? DEMO_TODAY;
    const ms = monthsBetween(s, e);
    const first = `${ms[0]}-01`;
    const [y, m] = ms[ms.length - 1].split("-").map(Number);
    const endD = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return { start: first, months: ms, totalDays: diffDays(first, endD) + 1 };
  }, [rows]);
  const width = totalDays * DAY;
  const x = (d: string) => diffDays(start, d) * DAY;
  const todayX = x(DEMO_TODAY);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayX - scrollRef.current.clientWidth * 0.45);
  }, [todayX]);

  return (
    <div className="flex overflow-hidden rounded-b-xl">
      <div className="w-[320px] shrink-0 border-r bg-white">
        <div className="flex h-11 items-center border-b bg-slate-50 px-3 text-[12px] font-medium text-slate-500">Công việc</div>
        {rows.map((r) => (
          <div
            key={r.id}
            onClick={() => onRowClick?.(r.id)}
            title={r.label}
            className={cn("flex h-10 cursor-pointer items-center gap-1.5 truncate border-b border-slate-100 pr-2 text-[12.5px] hover:bg-slate-50", r.kind === "project" && "bg-[#FFF4DF] font-bold", r.kind === "item" && "bg-[#EAF2FA] font-semibold", r.kind === "group" && "font-semibold")}
            style={{ paddingLeft: 10 + r.depth * 14 }}
          >
            <span className="shrink-0 text-[11px] font-normal text-slate-400">{r.code}</span>
            <span className="truncate">{r.label}</span>
          </div>
        ))}
      </div>
      <div ref={scrollRef} className="scrollbar-visible flex-1 overflow-x-auto">
        <div style={{ width }} className="relative">
          <div className="flex h-11 border-b bg-slate-50">
            {months.map((m) => {
              const [y, mm] = m.split("-").map(Number);
              const days = new Date(Date.UTC(y, mm, 0)).getUTCDate();
              return (
                <div key={m} style={{ width: days * DAY }} className="flex shrink-0 flex-col justify-center border-r border-slate-200 px-2 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-600">Tháng {mm}</span>
                  <span>{y}</span>
                </div>
              );
            })}
          </div>
          {/* lưới tháng */}
          <div className="pointer-events-none absolute bottom-0 left-0 top-11 flex">
            {months.map((m) => {
              const [y, mm] = m.split("-").map(Number);
              return <div key={m} style={{ width: new Date(Date.UTC(y, mm, 0)).getUTCDate() * DAY }} className="h-full border-r border-slate-100" />;
            })}
          </div>
          <div className="pointer-events-none absolute bottom-0 top-11 z-10 w-0.5 bg-slate-800" style={{ left: todayX }}>
            <span className="absolute left-1 top-0 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-white">Hôm nay</span>
          </div>
          {rows.map((r) => {
            const [bs, be] = barRange(r);
            const left = x(bs);
            const w = Math.max(DAY * 2, (diffDays(bs, be) + 1) * DAY);
            const st = GANTT_STATUS[r.status];
            return (
              <div key={r.id} className={cn("relative h-10 border-b border-slate-100", r.kind === "project" && "bg-[#FFF4DF]/60", r.kind === "item" && "bg-[#EAF2FA]/60")} onClick={() => onRowClick?.(r.id)}>
                {showBaseline && (
                  <div className="absolute bottom-1.5 h-1.5 rounded-full bg-slate-300" style={{ left: x(r.start), width: Math.max(DAY * 2, (diffDays(r.start, r.end) + 1) * DAY) }} title="Kế hoạch (baseline)" />
                )}
                <Tip
                  content={
                    <div>
                      <div className="font-semibold">{r.code} {r.label}</div>
                      <div>Trạng thái: {st.label}</div>
                      <div>Kế hoạch: {fmtDate(r.start)} – {fmtDate(r.end)}</div>
                      {r.actualStart && <div>Thực tế: {fmtDate(r.actualStart)} – {r.actualEnd ? fmtDate(r.actualEnd) : "đang thực hiện"}</div>}
                    </div>
                  }
                >
                  <div
                    className={cn("absolute cursor-pointer rounded-md shadow-sm", r.kind === "task" ? "h-5" : "h-4", showBaseline ? "top-2" : "top-1/2 -translate-y-1/2")}
                    style={{ left, width: w, background: st.color }}
                  />
                </Tip>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GanttLegend({ showBaseline }: { showBaseline?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[12px] text-slate-600">
      {(Object.keys(GANTT_STATUS) as GanttStatus[]).map((k) => (
        <span key={k} className="flex items-center gap-1.5"><span className="h-3 w-6 rounded" style={{ background: GANTT_STATUS[k].color }} />{GANTT_STATUS[k].label}</span>
      ))}
      {showBaseline && <span className="flex items-center gap-1.5"><span className="h-1.5 w-6 rounded-full bg-slate-300" />Kế hoạch (baseline)</span>}
      <span className="flex items-center gap-1.5"><span className="h-3.5 w-0.5 bg-slate-800" />Hôm nay</span>
    </div>
  );
}
