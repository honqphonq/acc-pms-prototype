import { useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
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
import { DataTable, type Column } from "@/components/common/DataTable";
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
  const editable = can("material.purchase") || can("admin") || can("payment.edit");
  const orders = (id: string) => db.materialRequests.filter((r) => r.supplierId === id);
  const save = () => {
    if (!edit?.name?.trim()) return toast.error("Nhập tên nhà cung cấp");
    const data = { code: edit.code || nextCode("NCC", db.suppliers.map((s) => s.code)), name: edit.name, taxCode: edit.taxCode ?? "", address: edit.address ?? "", contact: edit.contact ?? "", phone: edit.phone ?? "", materialGroups: edit.materialGroups ?? [], rating: Number(edit.rating) || 4 };
    if (edit.id) run(updateSupplier, edit.id, data); else run(createSupplier, data);
    toast.success("Đã lưu nhà cung cấp");
    setEdit(null);
  };
  const cols: Column<Supplier>[] = [
    { key: "name", header: "Nhà cung cấp", sortValue: (s) => s.name, cell: (s) => <div><div className="font-medium text-slate-800">{s.name}</div><div className="text-[11px] text-slate-400">{s.code} · MST {s.taxCode}</div></div> },
    { key: "g", header: "Nhóm vật tư cung cấp", cell: (s) => <div className="flex flex-wrap gap-1">{s.materialGroups.map((g) => <Badge key={g} tone="outline">{g}</Badge>)}</div> },
    { key: "c", header: "Liên hệ", cell: (s) => <div className="text-xs"><div>{s.contact}</div><div className="text-slate-400">{s.phone}</div></div> },
    { key: "r", header: "Đánh giá", sortValue: (s) => s.rating, cell: (s) => <span className="flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5" fill="currentColor" /><span className="text-slate-700">{s.rating.toFixed(1)}</span></span> },
    { key: "o", header: "Đơn hàng", align: "right", sortValue: (s) => orders(s.id).length, cell: (s) => orders(s.id).length },
    { key: "d", header: "Công nợ phải trả", align: "right", sortValue: (s) => s.debt, cell: (s) => s.debt > 0 ? <span className="font-semibold text-rose-600">{fmtVnd(s.debt)} đ</span> : <span className="text-slate-400">0</span> },
    { key: "a", header: "", cell: (s) => editable && <div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" onClick={() => setEdit(s)}><Pencil /></Button><Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (orders(s.id).length) return toast.error("NCC đã có đơn hàng – không thể xóa"); if (await confirm({ title: `Xóa ${s.name}?`, destructive: true, confirmText: "Xóa" })) { run(deleteSupplier, s.id); toast.success("Đã xóa"); } }}><Trash2 /></Button></div> },
  ];
  return (
    <div>
      <PageHeader title="Nhà cung cấp" description="Danh mục nhà cung cấp vật tư, lịch sử đặt hàng và công nợ với NCC." actions={editable && <Button onClick={() => setEdit({ rating: 4, materialGroups: [] })}><Plus /> Thêm NCC</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label="Số nhà cung cấp" value={db.suppliers.length} tone="navy" />
        <KpiCard label="Đơn hàng đang thực hiện" value={db.materialRequests.filter((r) => r.status === "dat_hang").length} tone="info" />
        <KpiCard label="Tổng công nợ phải trả NCC" value={fmtMoneyShort(db.suppliers.reduce((s, x) => s + x.debt, 0))} tone="danger" />
      </div>
      <Card><DataTable columns={cols} rows={db.suppliers} rowKey={(s) => s.id} loading={loading} searchText={(s) => `${s.name} ${s.code} ${s.materialGroups.join(" ")}`} searchPlaceholder="Tìm NCC..." /></Card>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"}</DialogTitle></DialogHeader>
          <DialogBody className="grid gap-3 sm:grid-cols-2">
            <FormField label="Tên nhà cung cấp" required className="sm:col-span-2"><Input value={edit?.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></FormField>
            <FormField label="Mã số thuế"><Input value={edit?.taxCode ?? ""} onChange={(e) => setEdit({ ...edit, taxCode: e.target.value })} /></FormField>
            <FormField label="Đánh giá (1–5)"><Input type="number" min={1} max={5} step={0.1} value={edit?.rating ?? 4} onChange={(e) => setEdit({ ...edit, rating: Number(e.target.value) })} /></FormField>
            <FormField label="Người liên hệ"><Input value={edit?.contact ?? ""} onChange={(e) => setEdit({ ...edit, contact: e.target.value })} /></FormField>
            <FormField label="Điện thoại"><Input value={edit?.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></FormField>
            <FormField label="Địa chỉ" className="sm:col-span-2"><Input value={edit?.address ?? ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></FormField>
            <FormField label="Nhóm vật tư (phân cách bởi dấu phẩy)" className="sm:col-span-2"><Input value={(edit?.materialGroups ?? []).join(", ")} onChange={(e) => setEdit({ ...edit, materialGroups: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></FormField>
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={save}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
