import { useState } from "react";
import { Bell, Download, Eye, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { deleteRow, saveRow } from "@/services/actions";
import { debtDue, debtTotals, type DebtDue } from "@/services/selectors";
import { activeProjects, projectOptions } from "@/utils/labels";
import { DEMO_TODAY, addDays, diffDays } from "@/utils/date";
import { fmtDate, fmtNumber, fmtVnd } from "@/utils/format";
import { genId, nextCode } from "@/utils/id";
import { writeXlsx } from "@/utils/xlsx";
import { cn } from "@/utils/cn";
import type { Debt, DebtEntry } from "@/types";

const DUE: Record<DebtDue, { label: string; tone: "danger" | "warning" | "info" | "success" }> = {
  qua_han: { label: "Quá hạn", tone: "danger" },
  den_han: { label: "Đến hạn (≤ 7 ngày)", tone: "warning" },
  trong_han: { label: "Trong hạn", tone: "info" },
  da_tat_toan: { label: "Đã tất toán", tone: "success" },
};
const KIND: Record<DebtEntry["kind"], string> = { cung_cap: "(3) Giá trị NCC / thầu phụ đã cung cấp", hoa_don: "(4) Giá trị đã xuất hóa đơn", thanh_toan: "(5) ACC đã thanh toán / tạm ứng" };
const CATS = ["Chi phí NVL", "Chi phí thầu phụ", "Chi phí máy thi công", "Chi phí nhân công", "Chi phí chung"];
const ty = (v: number) => `${fmtNumber(v / 1e9, 2)} tỷ`;

/** Công nợ thầu phụ / NCC theo hợp đồng: (3) đã cung cấp, (4) đã xuất hóa đơn, (5) đã thanh toán → (6) = 3 − 5, (7) = 4 − 5; nhắc đến hạn / quá hạn */
export default function DebtsPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [pid, setPid] = useState("");
  const [type, setType] = useState("");
  const [due, setDue] = useState("");
  const [view, setView] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Debt> | null>(null);
  const [ent, setEnt] = useState<Partial<DebtEntry>>({ kind: "cung_cap", date: DEMO_TODAY });
  const editable = can("payment.edit");
  const sup = (id: string) => db.suppliers.find((s) => s.id === id);
  const base = db.debts.filter((d) => (!pid || d.projectId === pid) && (!type || (sup(d.supplierId)?.type ?? "ncc") === type));
  const rows = base.filter((d) => !due || debtDue(d) === due);
  const T = (list: Debt[]) => list.reduce((a, d) => { const t = debtTotals(d); return { s: a.s + t.supplied, i: a.i + t.invoiced, p: a.p + t.paid }; }, { s: 0, i: 0, p: 0 });
  const tot = T(rows);
  const overdue = base.filter((d) => debtDue(d) === "qua_han"), soon = base.filter((d) => debtDue(d) === "den_han");
  const cur = db.debts.find((d) => d.id === view);

  const cols: Column<Debt>[] = [
    { key: "s", header: "NCC / thầu phụ", sortValue: (d) => sup(d.supplierId)?.name ?? "", cell: (d) => <div className="min-w-[220px]"><div className="font-semibold text-slate-800">{sup(d.supplierId)?.name}</div><div className="text-[11.5px] text-slate-400">{sup(d.supplierId)?.type === "thau_phu" ? "Thầu phụ" : "Nhà cung cấp"} · HĐ {d.contractNo}</div></div> },
    { key: "p", header: "Dự án", sortValue: (d) => db.projects.find((p) => p.id === d.projectId)?.shortName ?? "", cell: (d) => <span className="whitespace-nowrap">{db.projects.find((p) => p.id === d.projectId)?.shortName}</span> },
    { key: "c", header: "Nhóm chi phí", sortValue: (d) => d.category, cell: (d) => <span className="whitespace-nowrap text-[12.5px]">{d.category}</span> },
    { key: "v", header: "Giá trị HĐ", align: "right", sortValue: (d) => d.contractValue, cell: (d) => <span className="whitespace-nowrap">{fmtVnd(d.contractValue)}</span> },
    { key: "3", header: "(3) Đã cung cấp", align: "right", sortValue: (d) => debtTotals(d).supplied, cell: (d) => <span className="whitespace-nowrap">{fmtVnd(debtTotals(d).supplied)}</span> },
    { key: "4", header: "(4) Đã xuất HĐ", align: "right", sortValue: (d) => debtTotals(d).invoiced, cell: (d) => <span className="whitespace-nowrap">{fmtVnd(debtTotals(d).invoiced)}</span> },
    { key: "5", header: "(5) Đã thanh toán", align: "right", sortValue: (d) => debtTotals(d).paid, cell: (d) => <span className="whitespace-nowrap text-emerald-700">{fmtVnd(debtTotals(d).paid)}</span> },
    { key: "6", header: "(6)=3−5 Còn nợ theo GT cung cấp", align: "right", sortValue: (d) => debtTotals(d).owedSupplied, cell: (d) => <span className="whitespace-nowrap font-semibold">{fmtVnd(debtTotals(d).owedSupplied)}</span> },
    { key: "7", header: "(7)=4−5 Còn nợ theo hóa đơn", align: "right", sortValue: (d) => debtTotals(d).owedInvoiced, cell: (d) => <span className="whitespace-nowrap font-semibold text-rose-700">{fmtVnd(debtTotals(d).owedInvoiced)}</span> },
    { key: "d", header: "Hạn thanh toán", sortValue: (d) => d.dueDate, cell: (d) => { const st = debtDue(d); return <div className="whitespace-nowrap"><div>{fmtDate(d.dueDate)}</div><Badge tone={DUE[st].tone}>{st === "qua_han" ? `Quá hạn ${diffDays(d.dueDate, DEMO_TODAY)} ngày` : st === "den_han" ? `Còn ${diffDays(DEMO_TODAY, d.dueDate)} ngày` : DUE[st].label}</Badge></div>; } },
    { key: "a", header: "", cell: (d) => <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}><Button size="icon-sm" variant="ghost" onClick={() => setView(d.id)}><Eye /></Button>{editable && <><Button size="icon-sm" variant="ghost" onClick={() => setEdit({ ...d })}><Pencil /></Button><Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (await confirm({ title: `Xóa công nợ ${d.code}?`, destructive: true, confirmText: "Xóa" })) { run(deleteRow, "debts", d.id); toast.success("Đã xóa"); } }}><Trash2 /></Button></>}</div> },
  ];
  const exportXlsx = () => writeXlsx("Cong-no-NCC-thau-phu.xlsx", "Công nợ", [["Mã", "NCC / thầu phụ", "Loại", "Dự án", "Số HĐ", "Nhóm chi phí", "Giá trị HĐ", "(3) Đã cung cấp", "(4) Đã xuất hóa đơn", "(5) Đã thanh toán", "(6)=3-5", "(7)=4-5", "Hạn thanh toán", "Tình trạng"], ...rows.map((d) => { const t = debtTotals(d); return [d.code, sup(d.supplierId)?.name ?? "", sup(d.supplierId)?.type === "thau_phu" ? "Thầu phụ" : "NCC", db.projects.find((p) => p.id === d.projectId)?.shortName ?? "", d.contractNo, d.category, d.contractValue, t.supplied, t.invoiced, t.paid, t.owedSupplied, t.owedInvoiced, fmtDate(d.dueDate), DUE[debtDue(d)].label]; })], [8, 40, 10, 22, 22, 18, 16, 16, 16, 16, 16, 16, 12, 14]);
  const saveDebt = () => {
    if (!edit?.projectId || !edit.supplierId) return toast.error("Chọn dự án và NCC / thầu phụ");
    const d: Debt = { id: edit.id ?? genId("cn"), code: edit.code ?? nextCode("CN-", db.debts.map((x) => x.code)), projectId: edit.projectId, supplierId: edit.supplierId, contractNo: edit.contractNo ?? "", category: edit.category ?? CATS[0], contractValue: Number(edit.contractValue) || 0, dueDate: edit.dueDate ?? addDays(DEMO_TODAY, 30), entries: edit.entries ?? [], note: edit.note ?? "" };
    run(saveRow, "debts", d);
    toast.success(edit.id ? "Đã cập nhật công nợ" : "Đã tạo công nợ");
    setEdit(null);
  };
  const addEntry = () => {
    if (!cur) return;
    if (!(Number(ent.amount) > 0)) return toast.error("Nhập số tiền");
    run(saveRow, "debts", { ...cur, entries: [...cur.entries, { id: genId("de"), date: ent.date ?? DEMO_TODAY, kind: ent.kind ?? "cung_cap", amount: Number(ent.amount), note: ent.note ?? "" }].sort((a, b) => a.date.localeCompare(b.date)) });
    toast.success("Đã ghi nhận");
    setEnt({ kind: ent.kind, date: DEMO_TODAY });
  };

  return (
    <div>
      <PageHeader title="Công nợ thầu phụ, NCC" actions={<>
        {editable && <Button variant="outline" onClick={() => toast.info("Chọn file Excel công nợ theo mẫu (mô phỏng)")}><Upload /> Import</Button>}
        <Button variant="outline" onClick={exportXlsx}><Download /> Export</Button>
        {editable && <Button onClick={() => setEdit({ projectId: pid || "p01", category: CATS[0], dueDate: addDays(DEMO_TODAY, 30), entries: [] })}><Plus /> Tạo công nợ</Button>}
      </>} />

      {(overdue.length > 0 || soon.length > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
          <Bell className="h-4 w-4" /> Nhắc công nợ:
          {overdue.length > 0 && <button className="font-semibold text-rose-700 hover:underline" onClick={() => setDue("qua_han")}>{overdue.length} khoản quá hạn ({ty(overdue.reduce((s, d) => s + debtTotals(d).owedInvoiced, 0))})</button>}
          {soon.length > 0 && <button className="font-semibold hover:underline" onClick={() => setDue("den_han")}>· {soon.length} khoản đến hạn trong 7 ngày ({ty(soon.reduce((s, d) => s + debtTotals(d).owedInvoiced, 0))})</button>}
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[["(3) Giá trị đã cung cấp", tot.s, ""], ["(4) Giá trị đã xuất hóa đơn", tot.i, ""], ["(5) ACC đã thanh toán, tạm ứng", tot.p, ""], ["(6) = 3 − 5 Còn nợ theo GT cung cấp", tot.s - tot.p, "font"], ["(7) = 4 − 5 Còn nợ theo hóa đơn", tot.i - tot.p, "red"]].map(([l, v, k]) => (
          <Card key={String(l)} className={cn("px-4 py-3", k === "red" && "border-rose-200 bg-rose-50/50")}>
            <div className="text-[12px] text-slate-500">{l}</div>
            <div className={cn("mt-1 text-[19px] font-bold", k === "red" ? "text-rose-700" : "text-slate-900")}>{ty(Number(v))}</div>
          </Card>
        ))}
      </div>

      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(d) => d.id} loading={loading} onRowClick={(d) => setView(d.id)} resetKey={pid + type + due} searchText={(d) => `${d.code} ${d.contractNo} ${sup(d.supplierId)?.name}`} searchPlaceholder="Tìm NCC, số hợp đồng…"
          toolbar={<>
            <FilterSelect value={pid} onChange={setPid} allLabel="Tất cả dự án" options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />
            <FilterSelect value={type} onChange={setType} allLabel="NCC & thầu phụ" options={[{ value: "ncc", label: "Nhà cung cấp" }, { value: "thau_phu", label: "Thầu phụ" }]} />
            <FilterSelect value={due} onChange={setDue} allLabel="Tất cả tình trạng" options={Object.entries(DUE).map(([v, l]) => ({ value: v, label: l.label }))} />
          </>} />
      </Card>

      <Sheet open={!!cur} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="sm:max-w-2xl">
          {cur && (() => { const t = debtTotals(cur); return <>
            <SheetHeader><SheetTitle>{cur.code} · {sup(cur.supplierId)?.name}</SheetTitle><p className="text-[12.5px] text-slate-500">{db.projects.find((p) => p.id === cur.projectId)?.name} · HĐ {cur.contractNo} · {cur.category} · hạn {fmtDate(cur.dueDate)}</p></SheetHeader>
            <SheetBody className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-[12.5px]">
                {[["Giá trị HĐ", cur.contractValue], ["(3) Đã cung cấp", t.supplied], ["(4) Đã xuất HĐ", t.invoiced], ["(5) Đã thanh toán", t.paid], ["(6) = 3 − 5", t.owedSupplied], ["(7) = 4 − 5", t.owedInvoiced]].map(([l, v]) => <div key={String(l)} className="rounded-md bg-slate-50 px-3 py-2"><div className="text-slate-500">{l}</div><b className="text-[14px] text-slate-900">{fmtVnd(Number(v))}</b></div>)}
              </div>
              {editable && (
                <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-4">
                  <FormField label="Ghi nhận" className="sm:col-span-2"><Select value={ent.kind ?? "cung_cap"} onChange={(e) => setEnt({ ...ent, kind: e.target.value as DebtEntry["kind"] })} options={Object.entries(KIND).map(([value, label]) => ({ value, label }))} /></FormField>
                  <FormField label="Ngày"><Input type="date" value={ent.date ?? DEMO_TODAY} onChange={(e) => setEnt({ ...ent, date: e.target.value })} /></FormField>
                  <FormField label="Số tiền (đ)"><Input type="number" value={ent.amount ?? ""} onChange={(e) => setEnt({ ...ent, amount: Number(e.target.value) })} /></FormField>
                  <FormField label="Chứng từ / ghi chú" className="sm:col-span-3"><Input value={ent.note ?? ""} onChange={(e) => setEnt({ ...ent, note: e.target.value })} placeholder="Biên bản giao nhận, hóa đơn số…, UNC…" /></FormField>
                  <div className="flex items-end"><Button className="w-full" onClick={addEntry}><Plus /> Ghi nhận</Button></div>
                </div>
              )}
              <table className="w-full text-[12.5px]">
                <thead className="bg-slate-100 text-left"><tr><th className="px-2 py-1.5">Ngày</th><th className="px-2">Nội dung</th><th className="px-2 text-right">Số tiền</th><th className="px-2">Chứng từ</th><th /></tr></thead>
                <tbody>
                  {[...cur.entries].reverse().map((e) => (
                    <tr key={e.id} className="border-t"><td className="whitespace-nowrap px-2 py-1.5">{fmtDate(e.date)}</td><td className="px-2"><Badge tone={e.kind === "thanh_toan" ? "success" : e.kind === "hoa_don" ? "info" : "neutral"}>{KIND[e.kind].replace(/^\(\d\) /, "")}</Badge></td><td className="tabular px-2 text-right">{fmtVnd(e.amount)}</td><td className="px-2 text-slate-600">{e.note}</td><td className="px-1 text-right">{editable && <Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => { run(saveRow, "debts", { ...cur, entries: cur.entries.filter((x) => x.id !== e.id) }); toast.success("Đã xóa dòng"); }}><Trash2 /></Button>}</td></tr>
                  ))}
                </tbody>
              </table>
            </SheetBody>
          </>; })()}
        </SheetContent>
      </Sheet>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{edit?.id ? `Cập nhật công nợ ${edit.code}` : "Tạo công nợ theo NCC / thầu phụ"}</DialogTitle><DialogDescription>Giá trị cung cấp, hóa đơn, thanh toán được ghi nhận trong chi tiết công nợ.</DialogDescription></DialogHeader>
          {edit && (
            <DialogBody className="grid gap-3 sm:grid-cols-2">
              <FormField label="Dự án" required><Select value={edit.projectId ?? ""} onChange={(e) => setEdit({ ...edit, projectId: e.target.value })} options={projectOptions(db)} /></FormField>
              <FormField label="NCC / thầu phụ" required><Select value={edit.supplierId ?? ""} placeholder="— Chọn —" onChange={(e) => setEdit({ ...edit, supplierId: e.target.value })} options={db.suppliers.map((s) => ({ value: s.id, label: `${s.type === "thau_phu" ? "[Thầu phụ] " : ""}${s.name}` }))} /></FormField>
              <FormField label="Số hợp đồng"><Input value={edit.contractNo ?? ""} onChange={(e) => setEdit({ ...edit, contractNo: e.target.value })} /></FormField>
              <FormField label="Nhóm chi phí"><Select value={edit.category ?? CATS[0]} onChange={(e) => setEdit({ ...edit, category: e.target.value })} options={CATS.map((c) => ({ value: c, label: c }))} /></FormField>
              <FormField label="Giá trị hợp đồng (đ)"><Input type="number" value={edit.contractValue ?? ""} onChange={(e) => setEdit({ ...edit, contractValue: Number(e.target.value) })} /></FormField>
              <FormField label="Hạn thanh toán"><Input type="date" value={edit.dueDate ?? ""} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} /></FormField>
            </DialogBody>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={saveDebt}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
