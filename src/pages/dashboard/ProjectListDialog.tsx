import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, LayoutGrid, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { fmtVnd } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { ProjectStats } from "@/services/selectors";

/** Một dòng trong popup: tên (có link) + các cột phụ */
export type ListRow = { id: string; name: string; link: string; cells: (string | number)[] };
export type ListTab = { key: string; label: string; color: string; rows: ListRow[] };
export type ListSpec = { title: string; subtitle: string; tabs: ListTab[]; tab?: string; nameLabel?: string; columns: { label: string; money?: boolean }[] };

/** Dòng dự án: Tên dự án, Chủ đầu tư (+ cột số tiền nếu có) */
export const projectRow = (s: ProjectStats, value?: (s: ProjectStats) => number): ListRow => ({
  id: s.project.id, name: s.project.name, link: `/projects/${s.project.id}`, cells: [s.project.investor, ...(value ? [value(s)] : [])],
});

/** Popup danh sách theo nhóm (tab) – dùng cho biểu đồ và các thẻ số liệu ở Trang chủ */
export function ProjectListDialog({ spec, onClose }: { spec: ListSpec | null; onClose: () => void }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => { if (spec) { setTab(spec.tab ?? spec.tabs[0]?.key ?? ""); setQ(""); } }, [spec]);
  if (!spec) return null;
  const nameLabel = spec.nameLabel ?? "Tên dự án";
  const cur = spec.tabs.find((t) => t.key === tab) ?? spec.tabs[0];
  const kw = q.trim().toLowerCase();
  const rows = (cur?.rows ?? []).filter((r) => !kw || `${r.name} ${r.cells.join(" ")}`.toLowerCase().includes(kw));
  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    spec.tabs.forEach((t) => {
      const ws = XLSX.utils.json_to_sheet(t.rows.map((r, i) => Object.fromEntries([["STT", i + 1], [nameLabel, r.name], ...spec.columns.map((c, k) => [c.money ? `${c.label} (đ)` : c.label, r.cells[k]])])));
      XLSX.utils.book_append_sheet(wb, ws, t.label.replace(/[\\/?*[\]:]/g, "").slice(0, 31));
    });
    XLSX.writeFile(wb, `${spec.title}.xlsx`);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl overflow-hidden p-0 [&>button]:right-5 [&>button]:top-5 [&>button]:text-white/80 [&>button:hover]:bg-white/15 [&>button:hover]:text-white">
        <div className="bg-primary px-6 py-4 text-white"><DialogTitle className="text-[17px] font-semibold text-white">{spec.title}</DialogTitle></div>
        <div className="flex items-center gap-4 border-b bg-slate-50 px-6 py-4">
          <LayoutGrid className="h-10 w-10 text-slate-700" strokeWidth={1.5} />
          <div><div className="text-[18px] font-semibold text-slate-900">{spec.title}</div><div className="text-[13px] text-slate-500">{spec.subtitle}</div></div>
        </div>
        <div className="flex overflow-x-auto border-b bg-slate-50">
          {spec.tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn("flex shrink-0 items-center gap-2 border-r px-5 py-3 text-[13.5px]", t.key === cur?.key ? "bg-white font-semibold text-slate-900" : "text-slate-500 hover:text-slate-800")}>
              <span className="h-3 w-3 rounded-sm" style={{ background: t.color, opacity: t.key === cur?.key ? 1 : 0.45 }} />{t.label} ({t.rows.length})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 border-b px-6 py-2.5">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nhập để tìm kiếm" className="h-8 flex-1 bg-transparent text-[13.5px] outline-none" />
          <button onClick={exportXlsx} className="flex items-center gap-1.5 text-[13.5px] font-medium text-primary hover:underline"><Download className="h-4 w-4" /> Xuất Excel</button>
        </div>
        <div className="max-h-[52vh] overflow-y-auto">
          <table className="w-full text-[13.5px]">
            <thead className="sticky top-0 bg-white text-left text-[12px] font-bold uppercase tracking-wide text-slate-500 shadow-[0_1px_0_#e2e8f0]">
              <tr><th className="w-16 px-6 py-2.5">STT</th><th className="py-2.5">{nameLabel}</th>{spec.columns.map((c) => <th key={c.label} className={cn("py-2.5 pr-6", c.money && "text-right")}>{c.label}{c.money ? " (đ)" : ""}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={spec.columns.length + 2} className="py-10 text-center text-slate-400">Không có dự án</td></tr>}
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="tabular px-6 py-3 text-slate-500">{String(i + 1).padStart(2, "0")}</td>
                  <td className="py-3 pr-4"><button onClick={() => { onClose(); navigate(r.link); }} className="text-left font-semibold text-primary hover:underline">{r.name}</button></td>
                  {spec.columns.map((c, k) => <td key={c.label} className={cn("py-3 pr-6 text-slate-700", c.money && "tabular whitespace-nowrap text-right font-semibold text-slate-900")}>{c.money ? fmtVnd(Number(r.cells[k])) : r.cells[k]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
