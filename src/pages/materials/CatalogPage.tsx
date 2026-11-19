import { useState } from "react";
import { Download, MoreHorizontal, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NumberInput } from "@/components/ui/number-input";
import { KpiCard } from "@/components/common/KpiCard";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { createMaterial, deleteMaterial, updateMaterial } from "@/services/actions";
import { fmtVnd } from "@/utils/format";
import { nextCode } from "@/utils/id";
import type { Material } from "@/types";

export default function CatalogPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [edit, setEdit] = useState<Partial<Material> | null>(null);
  const [err, setErr] = useState("");
  const groups = [...new Set(db.materials.map((m) => m.group))];
  const rows = db.materials;
  const usedIn = (id: string) => new Set(db.inventory.filter((i) => i.materialId === id).map((i) => i.projectId)).size;
  const editable = can("material.purchase") || can("admin");

  const save = () => {
    if (!edit?.name?.trim() || !edit.unit?.trim() || !edit.group?.trim()) return setErr("Nhập đủ tên, nhóm và đơn vị tính");
    const data = { code: edit.code || nextCode("VL", db.materials.map((m) => m.code)), name: edit.name, group: edit.group, unit: edit.unit, unitPrice: Number(edit.unitPrice) || 0, spec: edit.spec ?? "" };
    if (edit.id) run(updateMaterial, edit.id, data); else run(createMaterial, data);
    toast.success(edit.id ? "Đã cập nhật vật tư" : "Đã thêm vật tư vào danh mục");
    setEdit(null);
  };
  const cols: Column<Material>[] = [
    { key: "code", header: "Mã", sortValue: (m) => m.code, cell: (m) => <span className="font-semibold">{m.code}</span> },
    { key: "name", header: "Tên vật tư", sortValue: (m) => m.name, filter: "text", filterValue: (m) => `${m.name} ${m.spec}`, cell: (m) => <div><div className="font-semibold text-slate-900">{m.name}</div><div className="text-[12.5px] text-slate-600">{m.spec}</div></div> },
    { key: "unit", header: "ĐVT", cell: (m) => m.unit },
    { key: "price", header: "Đơn giá tham chiếu (đ)", align: "right", sortValue: (m) => m.unitPrice, cell: (m) => fmtVnd(m.unitPrice) },
    { key: "used", header: "Số kho đang dùng", align: "right", sortValue: (m) => usedIn(m.id), filter: false, cell: (m) => (usedIn(m.id) ? <b>{usedIn(m.id)}</b> : <span className="text-slate-300">—</span>) },
    { key: "a", header: "", cell: (m) => editable && (
      <div className="flex justify-end gap-1">
        <Button size="icon-sm" variant="ghost" onClick={() => { setErr(""); setEdit(m); }}><Pencil /></Button>
        <Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => {
          if (usedIn(m.id)) return toast.error("Vật tư đang được sử dụng tại kho dự án – không thể xóa");
          if (await confirm({ title: `Xóa vật tư ${m.name}?`, destructive: true, confirmText: "Xóa" })) { run(deleteMaterial, m.id); toast.success("Đã xóa vật tư"); }
        }}><Trash2 /></Button>
      </div>
    ) },
  ];
  return (
    <div>
      <PageHeader title="Danh mục vật tư vật liệu" description="Danh mục dùng chung toàn Tổng công ty: mã hiệu, quy cách, đơn vị tính, đơn giá tham chiếu." actions={<>
        {editable && <Button size="lg" onClick={() => { setErr(""); setEdit({ unitPrice: 0, group: groups[0], unit: "m³" }); }}><Plus /> Thêm vật tư</Button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Thao tác khác"><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toast.info("Chọn file Excel danh mục vật tư theo mẫu (mô phỏng)")}><Upload /> Import</DropdownMenuItem>
            <DropdownMenuItem onClick={() => import("xlsx").then((X) => { const ws = X.utils.json_to_sheet(rows.map((m) => ({ "Mã": m.code, "Tên vật tư": m.name, "Quy cách": m.spec, "ĐVT": m.unit, "Đơn giá": m.unitPrice, "Nhóm": m.group }))); const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, "Vat tu"); X.writeFile(wb, "Danh-muc-vat-tu.xlsx"); toast.success("Đã xuất Excel"); })}><Download /> Export</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>} />
      <div className="mb-4 grid grid-cols-3 gap-4">
        <KpiCard label="Tổng số mã vật tư" value={db.materials.length} tone="navy" />
        <KpiCard label="Đang dùng tại kho dự án" value={db.materials.filter((m) => usedIn(m.id)).length} tone="info" />
        <KpiCard label="Chưa dùng ở kho nào" value={db.materials.filter((m) => !usedIn(m.id)).length} tone="warning" />
      </div>
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(m) => m.id} loading={loading} searchText={(m) => `${m.code} ${m.name} ${m.spec}`} searchPlaceholder="Tìm mã, tên, quy cách..." pageSize={15} />
      </Card>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Sửa vật tư" : "Thêm vật tư"}</DialogTitle></DialogHeader>
          <DialogBody className="grid gap-3 sm:grid-cols-2">
            <FormField label="Mã vật tư" hint="Để trống để tự sinh"><Input value={edit?.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></FormField>
            <FormField label="Nhóm" required><Input list="mat-groups" value={edit?.group ?? ""} onChange={(e) => setEdit({ ...edit, group: e.target.value })} /><datalist id="mat-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist></FormField>
            <FormField label="Tên vật tư" required error={err} className="sm:col-span-2"><Input value={edit?.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></FormField>
            <FormField label="Đơn vị tính" required><Input value={edit?.unit ?? ""} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></FormField>
            <FormField label="Đơn giá tham chiếu (đ)"><NumberInput value={edit?.unitPrice ?? 0} onChange={(v) => setEdit({ ...edit, unitPrice: v })} /></FormField>
            <FormField label="Quy cách / tiêu chuẩn" className="sm:col-span-2"><Input value={edit?.spec ?? ""} onChange={(e) => setEdit({ ...edit, spec: e.target.value })} /></FormField>
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={save}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
