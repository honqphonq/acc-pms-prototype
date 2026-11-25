import { useState } from "react";
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { deleteRow, saveRow } from "@/services/actions";
import { debtLeft } from "@/services/selectors";
import { activeProjects, projectOptions } from "@/utils/labels";
import { DEMO_TODAY } from "@/utils/date";
import { fmtVnd } from "@/utils/format";
import { genId, nextCode } from "@/utils/id";
import { writeXlsx } from "@/utils/xlsx";
import { SupplierCatalog } from "@/pages/materials/SuppliersPage";
import type { Debt } from "@/types";

const TYPE_OPTS = [{ value: "ncc", label: "Nhà cung cấp" }, { value: "thau_phu", label: "Thầu phụ" }];

/** Công nợ thầu phụ, NCC: 1 bảng (Giá trị HĐ · Giá trị thực hiện · Đã thanh toán · Công nợ còn lại) + tab Danh mục NCC và thầu phụ */
export default function DebtsPage() {
  const { db } = useDb();
  const [tab, setTab] = useQueryParam("tab", "cong-no");
  return (
    <div>
      <PageHeader title="Công nợ thầu phụ, NCC" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 rounded-xl bg-white px-2">
          <TabsTrigger value="cong-no">Công nợ ({db.debts.length})</TabsTrigger>
          <TabsTrigger value="danh-muc">Danh mục NCC và thầu phụ ({db.suppliers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="cong-no"><DebtTable /></TabsContent>
        <TabsContent value="danh-muc"><SupplierCatalog /></TabsContent>
      </Tabs>
    </div>
  );
}

function DebtTable() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [pid, setPid] = useState("");
  const [type, setType] = useState("");
  const [edit, setEdit] = useState<Partial<Debt> | null>(null);
  const editable = can("payment.edit");
  const sup = (id: string) => db.suppliers.find((s) => s.id === id);
  const pj = (id: string) => db.projects.find((p) => p.id === id);
  const rows = db.debts.filter((d) => (!pid || d.projectId === pid) && (!type || (sup(d.supplierId)?.type ?? "ncc") === type));
  const sum = (f: (d: Debt) => number) => rows.reduce((s, d) => s + f(d), 0);
  const money = (v: number, cls = "") => <span className={`tabular whitespace-nowrap ${cls}`}>{fmtVnd(v)}</span>;

  const cols: Column<Debt>[] = [
    { key: "s", header: "Nhà thầu phụ / NCC", sortValue: (d) => sup(d.supplierId)?.name ?? "", cell: (d) => (
      <div className="min-w-[260px]">
        <div className="flex items-center gap-1.5"><span className="font-semibold text-slate-800">{sup(d.supplierId)?.name}</span><Badge tone={sup(d.supplierId)?.type === "thau_phu" ? "purple" : "info"}>{sup(d.supplierId)?.type === "thau_phu" ? "Thầu phụ" : "NCC"}</Badge></div>
        <div className="text-[11.5px] text-slate-400">{pj(d.projectId)?.shortName} · HĐ {d.contractNo}</div>
      </div>
    ) },
    { key: "v", header: "Giá trị HĐ", align: "right", sortValue: (d) => d.contractValue, cell: (d) => money(d.contractValue) },
    { key: "t", header: "Giá trị thực hiện", align: "right", sortValue: (d) => d.doneValue, cell: (d) => money(d.doneValue) },
    { key: "p", header: "Đã thanh toán", align: "right", sortValue: (d) => d.paidValue, cell: (d) => money(d.paidValue, "text-emerald-700") },
    { key: "l", header: "Công nợ còn lại", align: "right", sortValue: debtLeft, cell: (d) => money(debtLeft(d), debtLeft(d) > 0 ? "font-bold text-rose-600" : "text-slate-400") },
    { key: "a", header: "", cell: (d) => editable && <div className="flex justify-end gap-0.5"><Button size="icon-sm" variant="ghost" onClick={() => setEdit({ ...d })}><Pencil /></Button><Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (await confirm({ title: `Xóa công nợ ${sup(d.supplierId)?.name} – HĐ ${d.contractNo}?`, destructive: true, confirmText: "Xóa" })) { run(deleteRow, "debts", d.id); toast.success("Đã xóa"); } }}><Trash2 /></Button></div> },
  ];
  const exportXlsx = () => writeXlsx("Cong-no-thau-phu-NCC.xlsx", "Công nợ", [
    ["CÔNG NỢ THẦU PHỤ, NHÀ CUNG CẤP"], [pid ? `Dự án: ${pj(pid)?.name}` : "Tất cả dự án"], [],
    ["STT", "Nhà thầu phụ / NCC", "Loại", "Dự án", "Số HĐ", "Giá trị HĐ", "Giá trị thực hiện", "Đã thanh toán", "Công nợ còn lại"],
    ...rows.map((d, i) => [i + 1, sup(d.supplierId)?.name ?? "", sup(d.supplierId)?.type === "thau_phu" ? "Thầu phụ" : "NCC", pj(d.projectId)?.shortName ?? "", d.contractNo, d.contractValue, d.doneValue, d.paidValue, debtLeft(d)]),
    ["", "TỔNG CỘNG", "", "", "", sum((d) => d.contractValue), sum((d) => d.doneValue), sum((d) => d.paidValue), sum(debtLeft)],
  ], [5, 42, 10, 22, 22, 17, 17, 17, 17]);
  const save = () => {
    if (!edit?.supplierId || !edit.projectId) return toast.error("Chọn nhà thầu phụ / NCC và dự án");
    const d: Debt = { id: edit.id ?? genId("cn"), code: edit.code ?? nextCode("CN-", db.debts.map((x) => x.code)), projectId: edit.projectId, supplierId: edit.supplierId, contractNo: edit.contractNo ?? "", contractValue: Number(edit.contractValue) || 0, doneValue: Number(edit.doneValue) || 0, paidValue: Number(edit.paidValue) || 0, note: edit.note ?? "", updatedAt: DEMO_TODAY };
    if (d.doneValue > d.contractValue && d.contractValue > 0) toast.warning("Giá trị thực hiện đang lớn hơn giá trị hợp đồng");
    run(saveRow, "debts", d);
    toast.success(edit.id ? "Đã cập nhật công nợ" : "Đã thêm công nợ");
    setEdit(null);
  };
  const left = (Number(edit?.doneValue) || 0) - (Number(edit?.paidValue) || 0);

  return (
    <>
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(d) => d.id} loading={loading} pageSize={15} resetKey={pid + type}
          searchText={(d) => `${sup(d.supplierId)?.name} ${d.contractNo} ${pj(d.projectId)?.shortName}`} searchPlaceholder="Tìm NCC, thầu phụ, số HĐ…"
          toolbar={<>
            <FilterSelect value={pid} onChange={setPid} allLabel="Tất cả dự án" options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />
            <FilterSelect value={type} onChange={setType} allLabel="NCC & thầu phụ" options={TYPE_OPTS} />
          </>}
          toolbarRight={<>
            {editable && <Button variant="outline" onClick={() => toast.info("Chọn file Excel công nợ theo mẫu (mô phỏng)")}><Upload /> Import</Button>}
            <Button variant="outline" onClick={exportXlsx}><Download /> Export</Button>
            {editable && <Button onClick={() => setEdit({ projectId: pid || "p01", contractValue: 0, doneValue: 0, paidValue: 0 })}><Plus /> Thêm công nợ</Button>}
          </>} />
        <div className="grid grid-cols-[1fr_repeat(4,auto)] items-center gap-x-6 border-t bg-slate-50 px-4 py-3 text-[13px] font-bold text-slate-900 max-md:grid-cols-2">
          <span>TỔNG CỘNG ({rows.length} hợp đồng)</span>
          <span className="text-right"><span className="block text-[11px] font-medium text-slate-500">Giá trị HĐ</span>{fmtVnd(sum((d) => d.contractValue))}</span>
          <span className="text-right"><span className="block text-[11px] font-medium text-slate-500">Giá trị thực hiện</span>{fmtVnd(sum((d) => d.doneValue))}</span>
          <span className="text-right text-emerald-700"><span className="block text-[11px] font-medium text-slate-500">Đã thanh toán</span>{fmtVnd(sum((d) => d.paidValue))}</span>
          <span className="text-right text-rose-600"><span className="block text-[11px] font-medium text-slate-500">Công nợ còn lại</span>{fmtVnd(sum(debtLeft))}</span>
        </div>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Cập nhật công nợ" : "Thêm công nợ"}</DialogTitle></DialogHeader>
          {edit && (
            <DialogBody className="grid gap-3 sm:grid-cols-2">
              <FormField label="Nhà thầu phụ / NCC" required className="sm:col-span-2" hint="Chọn từ tab Danh mục NCC và thầu phụ"><Select value={edit.supplierId ?? ""} onChange={(e) => setEdit({ ...edit, supplierId: e.target.value })} placeholder="— Chọn —" options={db.suppliers.filter((s) => s.active !== false || s.id === edit.supplierId).map((s) => ({ value: s.id, label: `${s.name} (${s.type === "thau_phu" ? "Thầu phụ" : "NCC"})` }))} /></FormField>
              <FormField label="Dự án" required><Select value={edit.projectId ?? ""} onChange={(e) => setEdit({ ...edit, projectId: e.target.value })} options={projectOptions(db)} /></FormField>
              <FormField label="Số hợp đồng"><Input value={edit.contractNo ?? ""} onChange={(e) => setEdit({ ...edit, contractNo: e.target.value })} placeholder="65/2026/HĐMB-P01" /></FormField>
              <FormField label="Giá trị HĐ (đ)"><Input type="number" value={edit.contractValue ?? ""} onChange={(e) => setEdit({ ...edit, contractValue: Number(e.target.value) })} /></FormField>
              <FormField label="Giá trị thực hiện (đ)" hint="Thầu phụ đã làm / hàng NCC đã cung cấp"><Input type="number" value={edit.doneValue ?? ""} onChange={(e) => setEdit({ ...edit, doneValue: Number(e.target.value) })} /></FormField>
              <FormField label="Đã thanh toán (đ)"><Input type="number" value={edit.paidValue ?? ""} onChange={(e) => setEdit({ ...edit, paidValue: Number(e.target.value) })} /></FormField>
              <div className="flex flex-col justify-end"><div className="rounded-md bg-slate-50 px-3 py-2 text-[13px]">Công nợ còn lại: <b className={left > 0 ? "text-rose-600" : "text-slate-900"}>{fmtVnd(left)} đ</b></div></div>
              <FormField label="Ghi chú" className="sm:col-span-2"><Input value={edit.note ?? ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></FormField>
            </DialogBody>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={save}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
