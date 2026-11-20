import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useQueryParam } from "@/hooks/useQueryParam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FilterSelect } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { leafTasks } from "@/services/selectors";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate, fmtNumber, fmtPct, fmtVnd } from "@/utils/format";
import { exportCsv } from "@/utils/export";
import { cn } from "@/utils/cn";
import { activeProjects } from "@/utils/labels";

/** Báo cáo giá trị thực hiện (tham chiếu trang 18): Giá trị thực hiện = KL thực hiện × đơn giá, KL lấy tự động từ nhật ký */
export default function ValueReportPage() {
  const { db } = useDb();
  const [projectId, setProjectId] = useQueryParam("project", "p01");
  const [asOf, setAsOf] = useState(DEMO_TODAY);
  const [contingency, setContingency] = useState("0");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const project = db.projects.find((p) => p.id === projectId);
  const unit = db.departments.find((d) => d.id === project?.unitId);
  const cf = 1 + Number(contingency) / 100;
  const tasks = project ? leafTasks(db, project.id).filter((t) => t.contractQty > 0 && t.unitPrice > 0).sort((a, b) => a.order - b.order) : [];
  const logsOf = (id: string) => db.constructionLogs.filter((l) => l.taskId === id && l.status !== "nhap" && l.date <= asOf).sort((a, b) => a.date.localeCompare(b.date));
  const rows = tasks.map((t) => {
    const qty = Math.min(t.contractQty, logsOf(t.id).reduce((s, l) => s + l.qty, 0));
    return { t, qty, cv: t.contractQty * t.unitPrice * cf, ev: qty * t.unitPrice * cf };
  });
  const totalC = rows.reduce((s, r) => s + r.cv, 0);
  const totalE = rows.reduce((s, r) => s + r.ev, 0);
  const ratio = totalC ? totalE / totalC : 0;

  const doExport = () => {
    exportCsv(`Bao-cao-gia-tri-thuc-hien_${project?.code}_${asOf}`, ["TT", "Mã", "Tên hạng mục/công việc", "ĐVT", "KL hợp đồng", "Đơn giá (VNĐ)", "Giá trị HĐ (VNĐ)", "KL thực hiện", "Giá trị thực hiện (VNĐ)", "% so với HĐ"],
      [...rows.map((r, i) => [i + 1, r.t.code, r.t.name, r.t.unit, r.t.contractQty, r.t.unitPrice, Math.round(r.cv), r.qty, Math.round(r.ev), (r.ev / r.cv * 100).toFixed(1)]), ["", "", "Tổng cộng", "", "", "", Math.round(totalC), "", Math.round(totalE), (ratio * 100).toFixed(1)]]);
    toast.success("Đã xuất file báo cáo (CSV mở bằng Excel)");
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="text-[11.5px] text-slate-500">{project?.name} · Đơn vị thực hiện: {unit?.code}</div>
          <h1 className="text-lg font-bold uppercase text-slate-900">Báo cáo giá trị thực hiện</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect value={projectId} onChange={(v) => v && setProjectId(v)} allLabel="— Dự án —" options={activeProjects(db).filter((p) => db.constructionPlans.some((t) => t.projectId === p.id)).map((p) => ({ value: p.id, label: p.shortName }))} />
          <label className="flex items-center gap-2 rounded-md border bg-white px-2.5 text-xs text-slate-500">Đến ngày <Input type="date" value={asOf} max={DEMO_TODAY} onChange={(e) => setAsOf(e.target.value || DEMO_TODAY)} className="h-8 w-36 border-0 px-0 shadow-none" /></label>
          <label className="flex items-center gap-2 rounded-md border bg-white px-2.5 py-1 text-xs text-slate-500">Phí dự phòng
            <select value={contingency} onChange={(e) => setContingency(e.target.value)} className="h-7 bg-transparent text-[13px] text-slate-800 focus:outline-none"><option value="0">Không bao gồm</option><option value="5">Bao gồm 5%</option><option value="10">Bao gồm 10%</option></select>
          </label>
          <Button variant="success" onClick={doExport} disabled={!rows.length}><Download /> Xuất Excel</Button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-slate-500">Giá trị hợp đồng (VNĐ)</div><div className="tabular mt-1 text-2xl font-bold">{fmtVnd(totalC)}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Giá trị thực hiện (VNĐ)</div><div className="tabular mt-1 text-2xl font-bold">{fmtVnd(totalE)}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Tỷ lệ thực hiện so với hợp đồng</div><div className="mt-1 flex items-baseline gap-2"><span className="tabular text-2xl font-bold">{fmtPct(ratio)}</span><span className="text-xs text-slate-500">còn lại {fmtPct(1 - ratio)}</span></div><Progress value={ratio} tone="success" className="mt-2" /></Card>
      </div>
      <Card>
        {!rows.length ? <EmptyState title="Dự án chưa có kế hoạch / khối lượng" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-[13px]">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr className="border-b"><th className="px-3 py-2.5 text-left">TT</th><th className="px-2 text-left">Tên hạng mục / công việc</th><th className="px-2">ĐVT</th><th className="px-2 text-right">KL hợp đồng</th><th className="px-2 text-right">Đơn giá (VNĐ)</th><th className="px-2 text-right">Giá trị HĐ (VNĐ)</th><th className="px-2 text-right">KL thực hiện</th><th className="px-2 text-right">Giá trị thực hiện (VNĐ)</th><th className="px-3 text-right">% so với HĐ</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const pct = r.cv ? r.ev / r.cv : 0;
                  const logs = logsOf(r.t.id);
                  return (
                    <Fragment key={r.t.id}>
                      <tr className={cn("cursor-pointer border-b hover:bg-slate-50", pct >= 1 && "bg-green-50/50", pct === 0 && "text-slate-400")} onClick={() => setOpen((o) => ({ ...o, [r.t.id]: !o[r.t.id] }))}>
                        <td className="px-3 py-2.5">{i + 1}</td>
                        <td className="px-2"><span className="inline-flex items-center gap-1">{open[r.t.id] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}<span className="font-medium">{r.t.name}</span></span></td>
                        <td className="px-2 text-center">{r.t.unit}</td>
                        <td className="tabular px-2 text-right">{fmtNumber(r.t.contractQty)}</td>
                        <td className="tabular px-2 text-right">{fmtVnd(r.t.unitPrice * cf)}</td>
                        <td className="tabular px-2 text-right">{fmtVnd(r.cv)}</td>
                        <td className="tabular px-2 text-right">{fmtNumber(r.qty)}</td>
                        <td className="tabular px-2 text-right">{fmtVnd(r.ev)}</td>
                        <td className="px-3"><div className="flex items-center justify-end gap-2"><Progress value={pct} tone={pct >= 1 ? "success" : "info"} className="h-1.5 w-20" /><span className={cn("tabular w-12 text-right font-semibold", pct >= 1 ? "text-success-fg" : pct > 0 ? "text-info-fg" : "")}>{fmtPct(pct, pct > 0 && pct < 1 ? 1 : 0)}</span></div></td>
                      </tr>
                      {open[r.t.id] && (
                        <tr className="border-b bg-slate-50/70"><td /><td colSpan={8} className="px-2 py-2">
                          {logs.length === 0 ? <span className="text-xs text-slate-500">Chưa có nhật ký đến ngày {fmtDate(asOf)}</span> : (
                            <div className="flex flex-wrap gap-1.5">{logs.map((l) => <span key={l.id} className="rounded border bg-white px-2 py-1 text-[11.5px]">{fmtDate(l.date)}: <b className="text-success-fg">+{fmtNumber(l.qty)}</b> {r.t.unit}</span>)}</div>
                          )}
                        </td></tr>
                      )}
                    </Fragment>
                  );
                })}
                <tr className="bg-success-soft/60 font-bold"><td /><td className="px-2 py-3 text-center" colSpan={4}>Tổng cộng</td><td className="tabular px-2 text-right">{fmtVnd(totalC)}</td><td /><td className="tabular px-2 text-right">{fmtVnd(totalE)}</td><td className="tabular px-3 text-right">{fmtPct(ratio)}</td></tr>
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-2 border-t px-4 py-2.5 text-[11.5px] text-slate-500"><span>Giá trị thực hiện = Khối lượng thực hiện × Đơn giá · khối lượng lấy tự động từ nhật ký cập nhật công việc</span><span>Bấm vào hạng mục để xem các nhật ký</span></div>
      </Card>
    </div>
  );
}
