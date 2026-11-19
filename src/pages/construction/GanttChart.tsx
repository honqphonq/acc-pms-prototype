import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/utils/cn";
import { DEMO_TODAY, diffDays, monthsBetween } from "@/utils/date";
import { fmtDate, fmtNumber } from "@/utils/format";
import { Tip } from "@/components/ui/tooltip";

const pctTxt = (v: number) => (v >= 1 ? "100%" : `${(Math.floor(v * 1000) / 10).toLocaleString("vi-VN")}%`);
const dmy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}`;

/** Trạng thái thanh Gantt */
export type GanttStatus = "dung_tien_do" | "dang_thuc_hien" | "cham_tien_do" | "hoan_thanh_muon" | "chua_bat_dau";

export const GANTT_STATUS: Record<GanttStatus, { label: string; color: string; soft: string }> = {
  dung_tien_do: { label: "Hoàn thành đúng hạn", color: "#16A34A", soft: "#BBF7D0" },
  dang_thuc_hien: { label: "Đang thực hiện", color: "#2F80ED", soft: "#BFDBFE" },
  cham_tien_do: { label: "Chậm tiến độ", color: "#DC2626", soft: "#FECACA" },
  hoan_thanh_muon: { label: "Hoàn thành muộn", color: "#F59E0B", soft: "#FDE68A" },
  chua_bat_dau: { label: "Chưa bắt đầu", color: "#7FA7E0", soft: "#DBE7F7" },
};

export interface GanttRow {
  id: string;
  label: string;
  code: string;
  depth: number;
  kind: "project" | "item" | "group" | "task";
  unit?: string;
  qty?: number;
  actualQty?: number;
  start: string; // kế hoạch
  end: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  progress?: number; // 0..1
  status: GanttStatus;
  assignee?: string;
  predecessors?: { id: string; type: "FS" | "SS" }[];
}

export type GanttZoom = "week" | "month" | "quarter" | "print";
export const ZOOM_DAY: Record<GanttZoom, number> = { week: 9, month: 3.2, quarter: 1.6, print: 1.25 };
const ROW = 28;
const HEAD = 44;
const MONTHS = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];

/** Biểu đồ Gantt kiểu MS Project: bảng công việc bên trái, thanh tiến độ + liên kết công việc bên phải */
export function GanttChart({ rows, onRowClick, showBaseline = false, zoom = "month" }: { rows: GanttRow[]; onRowClick?: (id: string) => void; showBaseline?: boolean; zoom?: GanttZoom }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const DAY = ZOOM_DAY[zoom];
  const { start, months, totalDays } = useMemo(() => {
    const dates = rows.flatMap((r) => [r.start, r.end, r.actualEnd ?? r.end]).concat(DEMO_TODAY);
    const sorted = dates.slice().sort();
    const ms = monthsBetween(sorted[0], sorted[sorted.length - 1]);
    const first = `${ms[0]}-01`;
    const [y, m] = ms[ms.length - 1].split("-").map(Number);
    const endD = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    return { start: first, months: ms, totalDays: diffDays(first, endD) + 1 };
  }, [rows]);
  const width = totalDays * DAY;
  const x = (d: string) => diffDays(start, d) * DAY;
  const xe = (d: string) => (diffDays(start, d) + 1) * DAY;
  const todayX = x(DEMO_TODAY) + DAY / 2;
  const index = useMemo(() => new Map(rows.map((r, i) => [r.id, i])), [rows]);

  useEffect(() => {
    if (scrollRef.current && zoom !== "print") scrollRef.current.scrollLeft = Math.max(0, todayX - scrollRef.current.clientWidth * 0.55);
  }, [todayX, zoom]);

  // tuần (thứ Hai) cho thang thời gian dưới
  const weeks = useMemo(() => {
    const out: string[] = [];
    const s = new Date(start + "T00:00:00Z");
    while (s.getUTCDay() !== 1) s.setUTCDate(s.getUTCDate() + 1);
    for (let i = 0; i * 7 < totalDays; i++) {
      const d = new Date(s.getTime() + i * 7 * 86400000).toISOString().slice(0, 10);
      if (diffDays(start, d) < totalDays) out.push(d);
    }
    return out;
  }, [start, totalDays]);

  // đường liên kết công việc (FS / SS)
  const links = rows.flatMap((r, i) =>
    (r.predecessors ?? []).flatMap((p) => {
      const j = index.get(p.id);
      if (j === undefined) return [];
      const pr = rows[j];
      const py = j * ROW + ROW / 2;
      const sy = i * ROW + ROW / 2;
      const sx = x(r.start);
      const down = sy > py ? 1 : -1;
      let d: string;
      if (p.type === "SS") {
        const px = x(pr.start);
        const lx = Math.min(px, sx) - 7;
        d = `M${px},${py} H${lx} V${sy} H${sx - 1}`;
      } else {
        const px = xe(pr.end);
        if (sx >= px + 8) d = `M${px},${py} H${px + 6} V${sy} H${sx - 1}`;
        else {
          const mid = py + down * (ROW / 2);
          d = `M${px},${py} H${px + 6} V${mid} H${sx - 7} V${sy} H${sx - 1}`;
        }
      }
      return [{ key: `${p.id}-${r.id}`, d }];
    }),
  );

  const leftCols = "grid-cols-[34px_minmax(0,1fr)_34px_60px_60px_46px_64px_58px_58px]";
  return (
    <div className="gantt-root flex overflow-hidden rounded-b-xl text-[12px]">
      {/* Bảng công việc */}
      <div className="gantt-left w-[700px] shrink-0 border-r border-slate-300 bg-white max-lg:w-[360px]">
        <div className={cn("grid border-b border-slate-300 bg-slate-100 text-center text-[11.5px] font-semibold text-slate-700", leftCols)} style={{ height: HEAD }}>
          {["ID", "Nội dung công việc", "ĐVT", "KL hợp đồng", "KL thực tế", "% HT", "Thời gian", "Bắt đầu", "Kết thúc"].map((h, i) => <div key={h} className={cn("flex items-center justify-center border-r border-slate-200 px-1 leading-tight", i >= 2 && "max-lg:hidden")}>{h}</div>)}
        </div>
        {rows.map((r) => {
          const sum = r.kind !== "task";
          const late = r.status === "cham_tien_do";
          return (
            <div key={r.id} onClick={() => onRowClick?.(r.id)} title={r.label}
              className={cn("grid cursor-pointer border-b border-slate-200 hover:bg-amber-50/60", leftCols, r.kind === "project" && "bg-[#DCE6F2] font-bold", r.kind === "item" && "bg-[#DCE6F2] font-bold text-[#C00000]", r.kind === "group" && "font-semibold")}
              style={{ height: ROW }}>
              <div className="flex items-center justify-center border-r border-slate-200 text-slate-500">{r.code}</div>
              <div className="flex min-w-0 items-center border-r border-slate-200 pr-1" style={{ paddingLeft: 6 + r.depth * 12 }}><span className="truncate">{r.label}</span></div>
              <div className="flex items-center justify-center border-r border-slate-200 max-lg:hidden">{r.unit}</div>
              <div className="tabular flex items-center justify-end border-r border-slate-200 pr-1.5 max-lg:hidden">{r.qty ? fmtNumber(r.qty, 0) : ""}</div>
              <div className={cn("tabular flex items-center justify-end border-r border-slate-200 pr-1.5 max-lg:hidden", r.kind === "task" && (r.qty && (r.actualQty ?? 0) > r.qty ? "font-semibold text-amber-600" : (r.progress ?? 0) >= 1 ? "font-semibold text-green-700" : late ? "font-semibold text-[#C00000]" : ""))}>{r.kind === "task" && r.qty ? `${r.qty && (r.actualQty ?? 0) > r.qty ? "+" : ""}${fmtNumber(r.actualQty ?? 0, 0)}` : ""}</div>
              <div className={cn("tabular flex items-center justify-end border-r border-slate-200 pr-1.5 max-lg:hidden", (r.progress ?? 0) >= 1 ? "font-semibold text-green-700" : late ? "font-semibold text-[#C00000]" : "")}>{pctTxt(r.progress ?? 0)}</div>
              <div className={cn("tabular flex items-center justify-end whitespace-nowrap border-r border-slate-200 pr-1.5 max-lg:hidden", sum && "font-semibold")}>{diffDays(r.start, r.end) + 1} ngày</div>
              <div className={cn("tabular flex items-center justify-center border-r border-slate-200 max-lg:hidden", late && r.kind === "task" && "text-[#C00000]")}>{dmy(r.start)}</div>
              <div className="tabular flex items-center justify-center max-lg:hidden">{dmy(r.end)}</div>
            </div>
          );
        })}
      </div>

      {/* Biểu đồ */}
      <div ref={scrollRef} className="gantt-right scrollbar-visible flex-1 overflow-x-auto">
        <div style={{ width }} className="relative">
          <div className="border-b border-slate-300 bg-slate-100" style={{ height: HEAD }}>
            <div className="flex h-1/2 border-b border-slate-200">
              {months.map((m) => {
                const [y, mm] = m.split("-").map(Number);
                const days = new Date(Date.UTC(y, mm, 0)).getUTCDate();
                return <div key={m} style={{ width: days * DAY }} className="flex shrink-0 items-center overflow-hidden whitespace-nowrap border-r border-slate-300 px-1.5 text-[11px] font-semibold text-slate-700">{days * DAY > 46 ? `${MONTHS[mm - 1]} '${String(y).slice(2)}` : mm}</div>;
              })}
            </div>
            <div className="relative h-1/2">
              {DAY * 7 >= 16 && weeks.map((w) => <span key={w} className="absolute top-0 flex h-full items-center border-l border-slate-200 pl-0.5 text-[10px] text-slate-500" style={{ left: x(w) }}>{Number(w.slice(8, 10))}</span>)}
            </div>
          </div>
          {/* lưới */}
          <div className="pointer-events-none absolute bottom-0 left-0 flex" style={{ top: HEAD }}>
            {months.map((m) => { const [y, mm] = m.split("-").map(Number); return <div key={m} style={{ width: new Date(Date.UTC(y, mm, 0)).getUTCDate() * DAY }} className="h-full border-r border-slate-200/80" />; })}
          </div>
          <div className="pointer-events-none absolute bottom-0 z-10 border-l-2 border-dashed border-[#C00000]/80" style={{ left: todayX, top: HEAD }}>
            <span className="absolute -top-0 left-1 whitespace-nowrap rounded bg-[#C00000] px-1 py-0.5 text-[10px] font-semibold text-white">Hôm nay {dmy(DEMO_TODAY)}</span>
          </div>

          <div className="relative">
            {rows.map((r) => {
              const left = x(r.start);
              const w = Math.max(DAY, xe(r.end) - left);
              const st = GANTT_STATUS[r.status];
              const tip = (
                <div>
                  <div className="font-semibold">[{r.code}] {r.label}</div>
                  <div>Kế hoạch: {fmtDate(r.start)} – {fmtDate(r.end)} ({diffDays(r.start, r.end) + 1} ngày)</div>
                  {r.actualStart && <div>Thực tế: {fmtDate(r.actualStart)} – {r.actualEnd ? fmtDate(r.actualEnd) : "đang thực hiện"}</div>}
                  {r.progress !== undefined && <div>Hoàn thành: {Math.floor(r.progress * 1000) / 10}%</div>}
                  <div>Trạng thái: {st.label}</div>
                  {r.assignee && <div>Phụ trách: {r.assignee}</div>}
                </div>
              );
              return (
                <div key={r.id} className={cn("relative border-b border-slate-100", (r.kind === "project" || r.kind === "item") && "bg-[#DCE6F2]/40")} style={{ height: ROW }} onClick={() => onRowClick?.(r.id)}>
                  {r.kind === "task" ? (
                    <>
                      {showBaseline && r.actualStart && <div className="absolute h-1 rounded-full bg-slate-400/70" style={{ top: ROW - 6, left: x(r.actualStart), width: Math.max(DAY, xe(r.actualEnd ?? DEMO_TODAY) - x(r.actualStart)) }} title="Thực tế" />}
                      <Tip content={tip}>
                        <div className="absolute cursor-pointer overflow-hidden rounded-[2px] border" style={{ top: 8, height: 12, left, width: w, background: st.soft, borderColor: st.color }}>
                          <div className="h-full" style={{ width: `${Math.min(1, r.progress ?? 0) * 100}%`, background: st.color }} />
                        </div>
                      </Tip>
                      <span className={cn("pointer-events-none absolute whitespace-nowrap text-[11px] font-semibold", r.status === "cham_tien_do" ? "text-[#C00000]" : "text-slate-800")} style={{ top: 6, left: left + w + 4 }}>{diffDays(r.start, r.end) + 1} ngày</span>
                    </>
                  ) : (
                    <Tip content={tip}>
                      <div className="absolute cursor-pointer" style={{ top: 9, left, width: w, height: 10 }}>
                        <div className={cn("h-[5px]", r.kind === "project" ? "bg-slate-900" : r.kind === "item" ? "bg-slate-800" : "bg-slate-700")} />
                        <div className="h-[5px] overflow-hidden" style={{ width: `${Math.min(1, r.progress ?? 0) * 100}%` }}><div className="h-full bg-[#2F80ED]/50" /></div>
                        <span className="absolute left-0 top-0 h-[10px] w-[3px] bg-slate-900" />
                        <span className="absolute right-0 top-0 h-[10px] w-[3px] bg-slate-900" />
                      </div>
                    </Tip>
                  )}
                </div>
              );
            })}
            {/* liên kết công việc */}
            <svg className="pointer-events-none absolute left-0 top-0" width={width} height={rows.length * ROW}>
              <defs><marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#1F4E9A" /></marker></defs>
              {links.map((l) => <path key={l.key} d={l.d} fill="none" stroke="#1F4E9A" strokeWidth={1} markerEnd="url(#gantt-arrow)" />)}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GanttLegend({ showBaseline }: { showBaseline?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-slate-600">
      <span className="flex items-center gap-1.5"><span className="relative h-2.5 w-7"><span className="absolute inset-x-0 top-0 h-1 bg-slate-900" /><span className="absolute left-0 top-0 h-2.5 w-[3px] bg-slate-900" /><span className="absolute right-0 top-0 h-2.5 w-[3px] bg-slate-900" /></span>Hạng mục / nhóm</span>
      {(Object.keys(GANTT_STATUS) as GanttStatus[]).map((k) => (
        <span key={k} className="flex items-center gap-1.5"><span className="h-3 w-7 overflow-hidden rounded-[2px] border" style={{ background: GANTT_STATUS[k].soft, borderColor: GANTT_STATUS[k].color }}><span className="block h-full w-1/2" style={{ background: GANTT_STATUS[k].color }} /></span>{GANTT_STATUS[k].label}</span>
      ))}
      <span className="flex items-center gap-1.5"><svg width="26" height="12"><path d="M1,2 H8 V10 H24" fill="none" stroke="#1F4E9A" /><path d="M20,7 L25,10 L20,13" fill="#1F4E9A" /></svg>Liên kết công việc</span>
      {showBaseline && <span className="flex items-center gap-1.5"><span className="h-1 w-7 rounded-full bg-slate-400/70" />Thực tế</span>}
      <span className="flex items-center gap-1.5"><span className="h-3.5 border-l-2 border-dashed border-[#C00000]" />Hôm nay</span>
      <span className="text-slate-400">· Phần đậm của thanh = khối lượng đã hoàn thành</span>
    </div>
  );
}
