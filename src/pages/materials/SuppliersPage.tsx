import { useState } from "react";
import { Download, Pencil, Plus, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { Select } from "@/components/ui/select";
import { debtTotals } from "@/services/selectors";
import { writeXlsx } from "@/utils/xlsx";
import { FormField } from "@/components/common/FormField";
import { KpiCard } from "@/components/common/KpiCard";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { createSupplier, deleteSupplier, updateSupplier } from "@/services/actions";
import { fmtMoneyShort, fmtVnd } from "@/utils/format";
import { nextCode } from "@/utils/id";
import type { Supplier } from "@/types";

export default function SuppliersPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [edit, setEdit] = useState<Partial<Supplier> | null>(null);
  const [type, setType] = useState("");
  const rows = db.suppliers.filter((s) => !type || (s.type ?? "ncc") === type);
  const editable = can("material.purchase") || can("admin") || can("payment.edit");
  const orders = (id: string) => db.materialRequests.filter((r) => r.supplierId === id);
  const owed = (id: string) => db.debts.filter((d) => d.supplierId === id).reduce((s, d) => s + debtTotals(d).owedInvoiced, 0);
  const save = () => {
    if (!edit?.name?.trim()) return toast.error("Nhập tên nhà cung cấp");
    const isTp = edit.type === "thau_phu";
    const data = { type: (isTp ? "thau_phu" : "ncc") as Supplier["type"], code: edit.code || nextCode(isTp ? "TP" : "NCC", db.suppliers.filter((s) => (s.type === "thau_phu") === isTp).map((s) => s.code)), name: edit.name, taxCode: edit.taxCode ?? "", address: edit.address ?? "", contact: edit.contact ?? "", phone: edit.phone ?? "", materialGroups: edit.materialGroups ?? [], rating: Number(edit.rating) || 4 };
    if (edit.id) run(updateSupplier, edit.id, data); else run(createSupplier, data);
    toast.success("Đã lưu nhà cung cấp");
    setEdit(null);
  };
  const cols: Column<Supplier>[] = [
    { key: "type", header: "Loại", sortValue: (s) => s.type ?? "ncc", cell: (s) => <Badge tone={s.type === "thau_phu" ? "purple" : "info"}>{s.type === "thau_phu" ? "Thầu phụ" : "NCC"}</Badge> },
    { key: "name", header: "NCC / thầu phụ", sortValue: (s) => s.name, cell: (s) => <div><div className="font-medium text-slate-800">{s.name}</div><div className="text-[11px] text-slate-400">{s.code} · MST {s.taxCode}</div></div> },
    { key: "g", header: "Nhóm vật tư / phạm vi công việc", cell: (s) => <div className="flex flex-wrap gap-1">{s.materialGroups.map((g) => <Badge key={g} tone="outline">{g}</Badge>)}</div> },
    { key: "c", header: "Liên hệ", cell: (s) => <div className="text-xs"><div>{s.contact}</div><div className="text-slate-400">{s.phone}</div></div> },
    { key: "r", header: "Đánh giá", sortValue: (s) => s.rating, cell: (s) => <span className="flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5" fill="currentColor" /><span className="text-slate-700">{s.rating.toFixed(1)}</span></span> },
    { key: "o", header: "Đơn hàng", align: "right", sortValue: (s) => orders(s.id).length, cell: (s) => orders(s.id).length },
    { key: "d", header: "Công nợ phải trả (theo hóa đơn)", align: "right", sortValue: (s) => owed(s.id), cell: (s) => owed(s.id) > 0 ? <span className="font-semibold text-rose-600">{fmtVnd(owed(s.id))} đ</span> : <span className="text-slate-400">0</span> },
    { key: "a", header: "", cell: (s) => editable && <div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" onClick={() => setEdit(s)}><Pencil /></Button><Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (orders(s.id).length) return toast.error("NCC đã có đơn hàng – không thể xóa"); if (await confirm({ title: `Xóa ${s.name}?`, destructive: true, confirmText: "Xóa" })) { run(deleteSupplier, s.id); toast.success("Đã xóa"); } }}><Trash2 /></Button></div> },
  ];
  return (
    <div>
      <PageHeader title="Danh mục NCC và thầu phụ" actions={editable && <><Button variant="outline" onClick={() => toast.info("Chọn file Excel danh mục NCC / thầu phụ theo mẫu (mô phỏng)")}><Upload /> Import</Button><Button variant="outline" onClick={() => writeXlsx("Danh-muc-NCC-thau-phu.xlsx", "NCC", [["Mã", "Loại", "Tên", "MST", "Địa chỉ", "Liên hệ", "Điện thoại", "Nhóm vật tư / phạm vi"], ...rows.map((s) => [s.code, s.type === "thau_phu" ? "Thầu phụ" : "NCC", s.name, s.taxCode, s.address, s.contact, s.phone, s.materialGroups.join(", ")])], [8, 10, 44, 14, 24, 18, 14, 36])}><Download /> Export</Button><Button onClick={() => setEdit({ rating: 4, materialGroups: [], type: "ncc" })}><Plus /> Thêm mới</Button></>} />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label="Nhà cung cấp" value={db.suppliers.filter((s) => s.type !== "thau_phu").length} tone="navy" onClick={() => setType("ncc")} />
        <KpiCard label="Thầu phụ" value={db.suppliers.filter((s) => s.type === "thau_phu").length} tone="info" onClick={() => setType("thau_phu")} />
        <KpiCard label="Tổng công nợ phải trả (theo hóa đơn)" value={fmtMoneyShort(db.suppliers.reduce((s, x) => s + owed(x.id), 0))} tone="danger" />
      </div>
      <Card><DataTable columns={cols} rows={rows} rowKey={(s) => s.id} loading={loading} resetKey={type} searchText={(s) => `${s.name} ${s.code} ${s.materialGroups.join(" ")}`} searchPlaceholder="Tìm NCC, thầu phụ..." toolbar={<FilterSelect value={type} onChange={setType} allLabel="NCC & thầu phụ" options={[{ value: "ncc", label: "Nhà cung cấp" }, { value: "thau_phu", label: "Thầu phụ" }]} />} /></Card>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Cập nhật NCC / thầu phụ" : "Thêm NCC / thầu phụ"}</DialogTitle></DialogHeader>
          <DialogBody className="grid gap-3 sm:grid-cols-2">
            <FormField label="Loại"><Select value={edit?.type ?? "ncc"} onChange={(e) => setEdit({ ...edit, type: e.target.value as Supplier["type"] })} options={[{ value: "ncc", label: "Nhà cung cấp" }, { value: "thau_phu", label: "Thầu phụ" }]} /></FormField>
            <div />
            <FormField label="Tên NCC / thầu phụ" required className="sm:col-span-2"><Input value={edit?.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></FormField>
            <FormField label="Mã số thuế"><Input value={edit?.taxCode ?? ""} onChange={(e) => setEdit({ ...edit, taxCode: e.target.value })} /></FormField>
            <FormField label="Đánh giá (1–5)"><Input type="number" min={1} max={5} step={0.1} value={edit?.rating ?? 4} onChange={(e) => setEdit({ ...edit, rating: Number(e.target.value) })} /></FormField>
            <FormField label="Người liên hệ"><Input value={edit?.contact ?? ""} onChange={(e) => setEdit({ ...edit, contact: e.target.value })} /></FormField>
            <FormField label="Điện thoại"><Input value={edit?.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></FormField>
            <FormField label="Địa chỉ" className="sm:col-span-2"><Input value={edit?.address ?? ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></FormField>
            <FormField label="Nhóm vật tư / phạm vi công việc (phân cách bởi dấu phẩy)" className="sm:col-span-2"><Input value={(edit?.materialGroups ?? []).join(", ")} onChange={(e) => setEdit({ ...edit, materialGroups: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></FormField>
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={save}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
