import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
  const [group, setGroup] = useState("");
  const [edit, setEdit] = useState<Partial<Material> | null>(null);
  const [err, setErr] = useState("");
  const groups = [...new Set(db.materials.map((m) => m.group))];
  const rows = db.materials.filter((m) => !group || m.group === group);
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
    { key: "code", header: "Mã", sortValue: (m) => m.code, cell: (m) => <span className="font-medium">{m.code}</span> },
    { key: "name", header: "Tên vật tư", sortValue: (m) => m.name, cell: (m) => <div><div className="font-medium text-slate-800">{m.name}</div><div className="text-[11px] text-slate-400">{m.spec}</div></div> },
    { key: "group", header: "Nhóm", sortValue: (m) => m.group, cell: (m) => <Badge tone="outline">{m.group}</Badge> },
    { key: "unit", header: "ĐVT", cell: (m) => m.unit },
    { key: "price", header: "Đơn giá tham chiếu (đ)", align: "right", sortValue: (m) => m.unitPrice, cell: (m) => fmtVnd(m.unitPrice) },
    { key: "used", header: "Số kho đang dùng", align: "right", sortValue: (m) => usedIn(m.id), cell: (m) => usedIn(m.id) },
    { key: "a", header: "", cell: (m) => editable && (
      <div className="flex justify-end gap-1">
        <Button size="icon-sm" variant="ghost" onClick={() => { setErr(""); setEdit(m); }}><Pencil /></Button>
        <Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => {
          if (usedIn(m.id)) return toast.error("Vật tư đang được sử dụng tại kho công trình – không thể xóa");
          if (await confirm({ title: `Xóa vật tư ${m.name}?`, destructive: true, confirmText: "Xóa" })) { run(deleteMaterial, m.id); toast.success("Đã xóa vật tư"); }
        }}><Trash2 /></Button>
      </div>
    ) },
  ];
  return (
    <div>
      <PageHeader title="Danh mục vật tư vật liệu" description="Danh mục dùng chung toàn Tổng công ty: mã hiệu, quy cách, đơn vị tính, đơn giá tham chiếu." actions={editable && <Button onClick={() => { setErr(""); setEdit({ unitPrice: 0, group: groups[0], unit: "m³" }); }}><Plus /> Thêm vật tư</Button>} />
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(m) => m.id} loading={loading} searchText={(m) => `${m.code} ${m.name} ${m.spec}`} searchPlaceholder="Tìm mã, tên, quy cách..." toolbar={<FilterSelect value={group} onChange={setGroup} allLabel="Tất cả nhóm" options={groups.map((g) => ({ value: g, label: g }))} />} pageSize={15} />
      </Card>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Sửa vật tư" : "Thêm vật tư"}</DialogTitle></DialogHeader>
          <DialogBody className="grid gap-3 sm:grid-cols-2">
            <FormField label="Mã vật tư" hint="Để trống để tự sinh"><Input value={edit?.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></FormField>
            <FormField label="Nhóm" required><Input list="mat-groups" value={edit?.group ?? ""} onChange={(e) => setEdit({ ...edit, group: e.target.value })} /><datalist id="mat-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist></FormField>
            <FormField label="Tên vật tư" required error={err} className="sm:col-span-2"><Input value={edit?.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></FormField>
            <FormField label="Đơn vị tính" required><Input value={edit?.unit ?? ""} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></FormField>
            <FormField label="Đơn giá tham chiếu (đ)"><Input type="number" value={edit?.unitPrice ?? 0} onChange={(e) => setEdit({ ...edit, unitPrice: Number(e.target.value) })} /></FormField>
            <FormField label="Quy cách / tiêu chuẩn" className="sm:col-span-2"><Input value={edit?.spec ?? ""} onChange={(e) => setEdit({ ...edit, spec: e.target.value })} /></FormField>
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={save}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
