import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/utils/cn";
import { DEMO_TODAY, diffDays, monthsBetween } from "@/utils/date";
import { fmtDate, fmtNumber } from "@/utils/format";
import { Tip } from "@/components/ui/tooltip";

const pctTxt = (v: number) => (v >= 1 ? "100%" : `${(Math.floor(v * 1000) / 10).toLocaleString("vi-VN")}%`);
const dmy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}`;

/** Trạng thái thanh Gantt */
export type GanttStatus = "dung_tien_do" | "dang_thuc_hien" | "cham_tien_do" | "hoan_thanh_muon" | "chua_bat_dau";

/** 5 trạng thái (cột, bộ lọc, tooltip) – thanh Gantt chỉ 2 màu: xanh = đúng tiến độ / hoàn thành, đỏ = chậm / hoàn thành muộn */
const GREEN = { color: "#16A34A", soft: "#BBF7D0" };
const RED = { color: "#DC2626", soft: "#FECACA" };
export const GANTT_STATUS: Record<GanttStatus, { label: string; color: string; soft: string }> = {
  chua_bat_dau: { label: "Chưa bắt đầu", color: "#94A3B8", soft: "#E2E8F0" },
  dang_thuc_hien: { label: "Đúng tiến độ", ...GREEN },
  cham_tien_do: { label: "Chậm tiến độ", ...RED },
  dung_tien_do: { label: "Hoàn thành", ...GREEN },
  hoan_thanh_muon: { label: "Hoàn thành muộn", ...RED },
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
  lastUpdate?: string | null; // ngày cập nhật kết quả gần nhất
  progress?: number; // 0..1
  planned?: number; // % kế hoạch đến hôm nay 0..1
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
/**
 * Kiểu Tracking Gantt: mỗi dòng 1 làn – thanh kế hoạch xám mờ làm nền (chỉ Chỉ huy trưởng điều chỉnh),
 * thanh thực tế đè lên từ ngày bắt đầu thực tế đến ngày hoàn thành (hoặc hạn kế hoạch): phần đậm = % đã làm, phần nhạt = còn lại.
 * Xanh = đúng tiến độ / hoàn thành; đỏ = chậm tiến độ / hoàn thành muộn. Công trường chưa nhập thì không có thanh thực tế.
 */
export function GanttChart({ rows, onRowClick, zoom = "month" }: { rows: GanttRow[]; onRowClick?: (id: string) => void; zoom?: GanttZoom }) {
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

  const leftCols = "grid-cols-[34px_minmax(0,1fr)_40px_66px_66px_52px_62px_72px_72px_78px]";
  const doneDate = (r: GanttRow) => ((r.progress ?? 0) >= 1 ? r.actualEnd ?? r.lastUpdate ?? null : null);
  return (
    <div className="gantt-root flex overflow-hidden rounded-b-xl text-[12px]">
      {/* Bảng công việc */}
      <div className="gantt-left w-[840px] shrink-0 border-r border-slate-300 bg-white max-lg:w-[360px]">
        <div className={cn("grid border-b border-slate-300 bg-slate-100 text-center text-[11.5px] font-semibold text-slate-700", leftCols)} style={{ height: HEAD }}>
          {["ID", "Nội dung công việc", "ĐVT", "KL hợp đồng", "KL thực tế", "% HT", "Thời gian", "Bắt đầu", "Kết thúc", "Hoàn thành thực tế"].map((h, i) => <div key={h} className={cn("flex items-center justify-center border-r border-slate-200 px-1 leading-tight", i >= 2 && "max-lg:hidden")}>{h}</div>)}
        </div>
        {rows.map((r) => {
          const sum = r.kind !== "task";
          const dd = doneDate(r);
          return (
            <div key={r.id} onClick={() => onRowClick?.(r.id)} title={r.label}
              className={cn("grid cursor-pointer border-b border-slate-200 hover:bg-amber-50/60", leftCols, r.kind === "project" && "bg-[#DCE6F2] font-bold", r.kind === "item" && "bg-[#DCE6F2] font-bold text-[#1F3A68]", r.kind === "group" && "font-semibold")}
              style={{ height: ROW }}>
              <div className="flex items-center justify-center border-r border-slate-200 text-slate-500">{r.code}</div>
              <div className="flex min-w-0 items-center border-r border-slate-200 pr-1" style={{ paddingLeft: 6 + r.depth * 12 }}><span className="truncate">{r.label}</span></div>
              <div className="flex items-center justify-center border-r border-slate-200 max-lg:hidden">{r.unit}</div>
              <div className="tabular flex items-center justify-end border-r border-slate-200 pr-2 max-lg:hidden">{r.qty ? fmtNumber(r.qty, 0) : ""}</div>
              <div className="tabular flex items-center justify-end border-r border-slate-200 pr-2 max-lg:hidden">{r.kind === "task" && r.qty ? `${r.qty && (r.actualQty ?? 0) > r.qty ? "+" : ""}${fmtNumber(r.actualQty ?? 0, 0)}` : ""}</div>
              <div className="tabular flex items-center justify-end border-r border-slate-200 pr-2 max-lg:hidden">{pctTxt(r.progress ?? 0)}</div>
              <div className={cn("tabular flex items-center justify-end whitespace-nowrap border-r border-slate-200 pr-2 max-lg:hidden", sum && "font-semibold")}>{diffDays(r.start, r.end) + 1} ngày</div>
              <div className="tabular flex items-center justify-center border-r border-slate-300 px-1 max-lg:hidden">{dmy(r.start)}</div>
              <div className="tabular flex items-center justify-center border-r border-slate-300 px-1 max-lg:hidden">{dmy(r.end)}</div>
              <div className="tabular flex items-center justify-center px-1 max-lg:hidden">{dd ? dmy(dd) : ""}</div>
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
          <div className="pointer-events-none absolute bottom-0 z-10 border-l-2 border-dashed border-sky-600/80" style={{ left: todayX, top: HEAD }}>
            <span className="absolute -top-0 left-1 whitespace-nowrap rounded bg-sky-600 px-1 py-0.5 text-[10px] font-semibold text-white">Hôm nay {dmy(DEMO_TODAY)}</span>
          </div>

          <div className="relative">
            {rows.map((r) => {
              const left = x(r.start);
              const w = Math.max(DAY, xe(r.end) - left);
              const st = GANTT_STATUS[r.status];
              const done = (r.progress ?? 0) >= 1;
              const dd = doneDate(r);
              // thanh thực tế: từ ngày bắt đầu thực tế → ngày hoàn thành; đang làm thì kéo tới hạn kế hoạch (quá hạn thì tới hôm nay)
              const aEnd = !r.actualStart ? null : done ? dd ?? r.actualEnd ?? r.end : r.end >= DEMO_TODAY ? r.end : DEMO_TODAY;
              const aLeft = r.actualStart ? x(r.actualStart) : 0;
              const aW = r.actualStart && aEnd ? Math.max(DAY * 2, xe(aEnd) - aLeft) : 0;
              const pct = Math.min(1, r.progress ?? 0);
              const isTask = r.kind === "task" && !!r.qty;
              const remain = Math.max(0, diffDays(DEMO_TODAY, r.end));
              const planQty = isTask && r.planned !== undefined ? r.planned * r.qty! : null;
              const gap = planQty !== null ? (r.actualQty ?? 0) - planQty : null;
              const need = isTask && !done && remain > 0 ? ((r.qty ?? 0) - (r.actualQty ?? 0)) / remain : null;
              const planRate = isTask ? r.qty! / (diffDays(r.start, r.end) + 1) : null;
              const tip = (
                <div className="space-y-0.5">
                  <div className="font-semibold">{r.code ? `[${r.code}] ` : ""}{r.label}</div>
                  <div>Kế hoạch: {fmtDate(r.start)} – {fmtDate(r.end)} ({diffDays(r.start, r.end) + 1} ngày)</div>
                  <div>Ngày thực tế: {r.actualStart ? `bắt đầu ${fmtDate(r.actualStart)}${dd ? ` · hoàn thành ${fmtDate(dd)}` : r.lastUpdate ? ` · cập nhật gần nhất ${fmtDate(r.lastUpdate)}` : ""}` : "chưa bắt đầu"}</div>
                  {r.planned !== undefined && !done && (
                    <div>Kế hoạch đến hôm nay: <b>{isTask ? `${fmtNumber(planQty!, 1)} ${r.unit ?? ""} (${pctTxt(r.planned)})` : pctTxt(r.planned)}</b></div>
                  )}
                  {r.progress !== undefined && <div>Thực tế: <b>{isTask ? `${fmtNumber(r.actualQty ?? 0, 1)} ${r.unit ?? ""} (${pctTxt(r.progress)})` : pctTxt(r.progress)}</b>{!done && r.planned !== undefined && (
                    gap !== null ? <span className={gap < -1e-6 ? "text-rose-300" : "text-emerald-300"}> → {gap < -1e-6 ? `chậm ${fmtNumber(-gap, 1)} ${r.unit ?? ""}` : gap > 1e-6 ? `vượt ${fmtNumber(gap, 1)} ${r.unit ?? ""}` : "đúng kế hoạch"}</span>
                      : <span className={(r.progress ?? 0) + 1e-9 < r.planned ? "text-rose-300" : "text-emerald-300"}> → {(r.progress ?? 0) + 1e-9 < r.planned ? `chậm ${fmtNumber((r.planned - (r.progress ?? 0)) * 100, 1)}%` : "đúng tiến độ"}</span>
                  )}</div>}
                  {need !== null && planRate !== null && <div>Năng suất cần để kịp hạn: <b>{fmtNumber(need, 1)} {r.unit}/ngày</b> ({remain} ngày còn lại · kế hoạch {fmtNumber(planRate, 1)} {r.unit}/ngày)</div>}
                  {isTask && !done && remain === 0 && r.end < DEMO_TODAY && <div className="text-rose-300">Đã quá hạn kết thúc {fmtDate(r.end)}</div>}
                  <div>Trạng thái: <b>{st.label}</b></div>
                  {r.assignee && <div>Phụ trách: {r.assignee}</div>}
                </div>
              );
              const summary = r.kind !== "task";
              return (
                <div key={r.id} className={cn("relative border-b border-slate-100", (r.kind === "project" || r.kind === "item") && "bg-[#DCE6F2]/40")} style={{ height: ROW }} onClick={() => onRowClick?.(r.id)}>
                  <Tip content={tip}>
                    <div className="absolute cursor-pointer" style={{ top: 0, left: Math.min(left, aW ? aLeft : left), width: Math.max(left + w, aW ? aLeft + aW : 0) - Math.min(left, aW ? aLeft : left), height: ROW }}>
                      {/* kế hoạch: xám mờ làm nền */}
                      <div className="absolute rounded-[2px] bg-slate-400/35 ring-1 ring-inset ring-slate-400/50" style={{ top: 6, height: 16, left: left - Math.min(left, aW ? aLeft : left), width: w }} />
                      {summary && <><span className="absolute bg-slate-500/70" style={{ top: 6, height: 19, width: 2, left: left - Math.min(left, aW ? aLeft : left) }} /><span className="absolute bg-slate-500/70" style={{ top: 6, height: 19, width: 2, left: left - Math.min(left, aW ? aLeft : left) + w - 2 }} /></>}
                      {/* thực tế: đậm = đã làm, nhạt = còn lại */}
                      {aW > 0 && (
                        <div className="absolute overflow-hidden rounded-[2px]" style={{ top: 10, height: 8, left: aLeft - Math.min(left, aLeft), width: aW, background: st.soft, boxShadow: `inset 0 0 0 1px ${st.color}` }}>
                          <div className="h-full" style={{ width: `${(done ? 1 : pct) * 100}%`, background: st.color }} />
                        </div>
                      )}
                    </div>
                  </Tip>
                  <span className={cn("pointer-events-none absolute whitespace-nowrap text-[11px] font-medium", aW ? "" : "text-slate-500")} style={{ top: 7, left: Math.max(left + w, aW ? aLeft + aW : 0) + 4, color: aW ? st.color : undefined }}>{aW ? pctTxt(pct) : r.kind === "task" ? `${diffDays(r.start, r.end) + 1} ngày` : ""}</span>
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

export function GanttLegend() {
  const Bar = ({ c }: { c: { color: string; soft: string } }) => <span className="relative h-4 w-9 rounded-[2px] bg-slate-400/35 ring-1 ring-inset ring-slate-400/50"><span className="absolute inset-x-0.5 top-1 flex h-2 overflow-hidden rounded-[2px]" style={{ background: c.soft, boxShadow: `inset 0 0 0 1px ${c.color}` }}><span className="h-full w-3/5" style={{ background: c.color }} /></span></span>;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-slate-600">
      <span className="flex items-center gap-1.5"><span className="h-4 w-9 rounded-[2px] bg-slate-400/35 ring-1 ring-inset ring-slate-400/50" />Kế hoạch</span>
      <span className="flex items-center gap-1.5"><Bar c={GREEN} />Đúng tiến độ</span>
      <span className="flex items-center gap-1.5"><Bar c={RED} />Chậm tiến độ</span>
      <span className="flex items-center gap-1.5"><svg width="26" height="12"><path d="M1,2 H8 V10 H24" fill="none" stroke="#1F4E9A" /><path d="M20,7 L25,10 L20,13" fill="#1F4E9A" /></svg>Liên kết</span>
      <span className="flex items-center gap-1.5"><span className="h-3.5 border-l-2 border-dashed border-sky-600" />Hôm nay</span>
    </div>
  );
}
