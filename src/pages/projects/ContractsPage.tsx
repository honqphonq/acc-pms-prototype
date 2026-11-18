import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FormField } from "@/components/common/FormField";
import { saveRow } from "@/services/actions";
import { PROJECT_STATUS } from "@/utils/constants";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate, fmtNumber, fmtVnd } from "@/utils/format";
import { genId } from "@/utils/id";
import type { ContractAppendix, Project } from "@/types";

/** Quản lý hợp đồng nhận thầu và phụ lục hợp đồng */
export default function ContractsPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const loading = useSimulatedLoading();
  const [unit, setUnit] = useState("");
  const [view, setView] = useState<string | null>(null);
  const [pl, setPl] = useState<Partial<ContractAppendix> | null>(null);
  const rows = db.projects.filter((p) => !unit || p.unitId === unit);
  const cur = db.projects.find((p) => p.id === view);
  const total = (p: Project) => p.contractValue + (p.appendices ?? []).reduce((s, a) => s + a.valueChange, 0);

  const cols: Column<Project>[] = [
    { key: "no", header: "Số hợp đồng", sortValue: (p) => p.contractNo, cell: (p) => <div><div className="whitespace-nowrap font-medium text-slate-800">{p.contractNo}</div><div className="text-[11px] text-slate-400">Ký {fmtDate(p.contractDate)}</div></div> },
    { key: "proj", header: "Công trình / gói thầu", sortValue: (p) => p.name, cell: (p) => <div className="min-w-[240px] max-w-[360px]"><div className="text-slate-800">{p.name}</div><div className="truncate text-[11px] text-slate-400">{p.packageName}</div></div> },
    { key: "inv", header: "Chủ đầu tư", cell: (p) => <div className="min-w-[180px] max-w-[240px] text-xs text-slate-600">{p.investor}</div> },
    { key: "unit", header: "Đơn vị", cell: (p) => <span className="whitespace-nowrap text-xs">{db.departments.find((d) => d.id === p.unitId)?.code}</span> },
    { key: "val", header: "Giá trị HĐ (tỷ)", align: "right", sortValue: (p) => total(p), cell: (p) => <div><div>{fmtNumber(total(p) / 1e9)}</div>{total(p) !== p.contractValue && <div className="text-[11px] text-slate-400">gốc {fmtNumber(p.contractValue / 1e9)}</div>}</div> },
    { key: "pl", header: "Phụ lục", align: "center", sortValue: (p) => p.appendices?.length ?? 0, cell: (p) => (p.appendices?.length ? <Badge tone="info">{p.appendices.length} PL</Badge> : <span className="text-slate-300">—</span>) },
    { key: "time", header: "Thời gian thực hiện", sortValue: (p) => p.startDate, cell: (p) => <span className="whitespace-nowrap text-xs">{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</span> },
    { key: "st", header: "Trạng thái", cell: (p) => <StatusBadge map={PROJECT_STATUS} value={p.status} dot={false} /> },
  ];
  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows.map((p) => ({ "Số HĐ": p.contractNo, "Ngày ký": p.contractDate, "Công trình": p.name, "Chủ đầu tư": p.investor, "Giá trị HĐ": p.contractValue, "Số phụ lục": p.appendices?.length ?? 0, "Giá trị sau PL": total(p) })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Hop dong"); XLSX.writeFile(wb, "Hop-dong-nhan-thau.xlsx");
  };
  return (
    <div>
      <PageHeader title="Quản lý hợp đồng và phụ lục hợp đồng" description={`${db.projects.length} hợp đồng · ${db.projects.reduce((s, p) => s + (p.appendices?.length ?? 0), 0)} phụ lục · tổng giá trị ${fmtNumber(db.projects.reduce((s, p) => s + total(p), 0) / 1e9, 0)} tỷ đồng`}
        actions={<><Button variant="outline" onClick={() => toast.info("Chọn file Excel hợp đồng theo mẫu để nhập (mô phỏng)")}><Upload /> Import</Button><Button variant="outline" onClick={exportXlsx}><Download /> Export</Button>{can("project.edit") && <Button onClick={() => navigate("/projects?new=1")}><Plus /> Thêm hợp đồng</Button>}</>} />
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(p) => p.id} loading={loading} onRowClick={(p) => setView(p.id)} searchText={(p) => `${p.contractNo} ${p.name} ${p.investor}`} searchPlaceholder="Tìm số hợp đồng, công trình, chủ đầu tư..."
          toolbar={<FilterSelect value={unit} onChange={setUnit} allLabel="Tất cả đơn vị" options={db.departments.filter((d) => d.type === "cong_ty_con").map((d) => ({ value: d.id, label: d.code }))} />} />
      </Card>
      <Sheet open={!!cur} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="sm:max-w-2xl">
          {cur && <>
            <SheetHeader><SheetTitle>Hợp đồng {cur.contractNo}</SheetTitle><p className="text-xs text-slate-500">{cur.name}</p></SheetHeader>
            <SheetBody className="space-y-5">
              <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
                {[["Gói thầu", cur.packageName], ["Chủ đầu tư", cur.investor], ["Nhà thầu", cur.contractor], ["Ngày ký", fmtDate(cur.contractDate)], ["Giá trị hợp đồng gốc", `${fmtVnd(cur.contractValue)} đ`], ["Giá trị sau phụ lục", `${fmtVnd(total(cur))} đ`], ["Thời gian thực hiện", `${fmtDate(cur.startDate)} – ${fmtDate(cur.endDate)}`], ["Chỉ huy trưởng", db.users.find((u) => u.id === cur.commanderId)?.name ?? ""]].map(([k, v]) => <div key={k} className={k === "Gói thầu" ? "sm:col-span-2" : ""}><dt className="text-[11.5px] text-slate-500">{k}</dt><dd className="text-slate-800">{v}</dd></div>)}
              </dl>
              <section>
                <div className="mb-2 flex items-center justify-between"><h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Phụ lục hợp đồng ({cur.appendices?.length ?? 0})</h4>{can("project.edit") && <Button size="xs" variant="soft" onClick={() => setPl({ date: DEMO_TODAY, valueChange: 0, note: "", code: `PL${String((cur.appendices?.length ?? 0) + 1).padStart(2, "0")}/${cur.contractNo}` })}><Plus /> Thêm phụ lục</Button>}</div>
                <div className="divide-y rounded-lg border">
                  {(cur.appendices ?? []).map((a) => (
                    <div key={a.id} className="flex items-start gap-3 px-3 py-2.5 text-[13px]">
                      <div className="min-w-0 flex-1"><div className="font-medium text-slate-800">{a.code} · {a.title}</div><div className="text-[11.5px] text-slate-500">Ký {fmtDate(a.date)}{a.note ? ` · ${a.note}` : ""}</div></div>
                      <div className={a.valueChange ? "whitespace-nowrap font-medium text-slate-800" : "text-slate-400"}>{a.valueChange ? `${a.valueChange > 0 ? "+" : ""}${fmtVnd(a.valueChange)} đ` : "Không đổi giá trị"}</div>
                      {can("project.edit") && <Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => { run(saveRow, "projects", { ...cur, appendices: (cur.appendices ?? []).filter((x) => x.id !== a.id) }); toast.success("Đã xóa phụ lục"); }}><Trash2 /></Button>}
                    </div>
                  ))}
                  {!cur.appendices?.length && <div className="px-3 py-4 text-center text-xs text-slate-400">Chưa có phụ lục</div>}
                </div>
                {pl && (
                  <div className="mt-3 grid gap-3 rounded-lg border bg-slate-50 p-3 sm:grid-cols-2">
                    <FormField label="Số phụ lục"><Input value={pl.code ?? ""} onChange={(e) => setPl({ ...pl, code: e.target.value })} /></FormField>
                    <FormField label="Ngày ký"><Input type="date" value={pl.date ?? ""} onChange={(e) => setPl({ ...pl, date: e.target.value })} /></FormField>
                    <FormField label="Nội dung phụ lục" required className="sm:col-span-2"><Input value={pl.title ?? ""} onChange={(e) => setPl({ ...pl, title: e.target.value })} /></FormField>
                    <FormField label="Giá trị điều chỉnh (đ)"><Input type="number" value={pl.valueChange ?? 0} onChange={(e) => setPl({ ...pl, valueChange: Number(e.target.value) })} /></FormField>
                    <FormField label="Ghi chú"><Input value={pl.note ?? ""} onChange={(e) => setPl({ ...pl, note: e.target.value })} /></FormField>
                    <div className="flex justify-end gap-2 sm:col-span-2"><Button size="sm" variant="outline" onClick={() => setPl(null)}>Hủy</Button><Button size="sm" onClick={() => { if (!pl.title?.trim()) return toast.error("Nhập nội dung phụ lục"); run(saveRow, "projects", { ...cur, appendices: [...(cur.appendices ?? []), { id: genId("pl"), code: pl.code ?? "", date: pl.date ?? DEMO_TODAY, title: pl.title, valueChange: pl.valueChange ?? 0, note: pl.note ?? "" }] }); setPl(null); toast.success("Đã thêm phụ lục hợp đồng"); }}>Lưu phụ lục</Button></div>
                  </div>
                )}
              </section>
            </SheetBody>
            <SheetFooter><Button variant="outline" onClick={() => navigate(`/projects/${cur.id}`)}>Mở công trình</Button></SheetFooter>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
