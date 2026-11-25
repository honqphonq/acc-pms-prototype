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
import { Select } from "@/components/ui/select";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { createSupplier, deleteSupplier, updateSupplier } from "@/services/actions";
import { writeXlsx } from "@/utils/xlsx";
import { nextCode } from "@/utils/id";
import { cn } from "@/utils/cn";
import type { Supplier } from "@/types";

/** Danh mục NCC và thầu phụ – thiết lập thông tin (tab trong màn Công nợ thầu phụ, NCC) */
export function SupplierCatalog() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [edit, setEdit] = useState<Partial<Supplier> | null>(null);
  const [type, setType] = useState("");
  const [st, setSt] = useState("");
  const rows = db.suppliers.filter((s) => (!type || (s.type ?? "ncc") === type) && (!st || (st === "on") === (s.active !== false)));
  const editable = can("material.purchase") || can("admin") || can("payment.edit");
  const used = (id: string) => db.materialRequests.some((r) => r.supplierId === id) || db.debts.some((d) => d.supplierId === id);
  const save = () => {
    if (!edit?.name?.trim()) return toast.error("Nhập tên nhà cung cấp / thầu phụ");
    const isTp = edit.type === "thau_phu";
    const data = { type: (isTp ? "thau_phu" : "ncc") as Supplier["type"], code: edit.code || nextCode(isTp ? "TP" : "NCC", db.suppliers.filter((s) => (s.type === "thau_phu") === isTp).map((s) => s.code)), name: edit.name.trim(), taxCode: edit.taxCode ?? "", address: edit.address ?? "", contact: edit.contact ?? "", phone: edit.phone ?? "", email: edit.email ?? "", bankAccount: edit.bankAccount ?? "", materialGroups: edit.materialGroups ?? [], rating: Number(edit.rating) || 4, active: edit.active !== false };
    if (edit.id) run(updateSupplier, edit.id, data); else run(createSupplier, data);
    toast.success(edit.id ? "Đã cập nhật" : "Đã thêm vào danh mục");
    setEdit(null);
  };
  const cols: Column<Supplier>[] = [
    { key: "name", header: "Tên NCC / thầu phụ", sortValue: (s) => s.name, cell: (s) => <div className={cn("min-w-[240px]", s.active === false && "opacity-60")}><div className="font-medium text-slate-800">{s.name}</div><div className="text-[11px] text-slate-400">{s.code} · MST {s.taxCode}</div></div> },
    { key: "type", header: "Loại", sortValue: (s) => s.type ?? "ncc", cell: (s) => <Badge tone={s.type === "thau_phu" ? "purple" : "info"}>{s.type === "thau_phu" ? "Thầu phụ" : "NCC"}</Badge> },
    { key: "g", header: "Lĩnh vực cung cấp", cell: (s) => <div className="flex max-w-[240px] flex-wrap gap-1">{s.materialGroups.map((g) => <Badge key={g} tone="outline">{g}</Badge>)}</div> },
    { key: "c", header: "Liên hệ", cell: (s) => <div className="whitespace-nowrap text-xs"><div>{s.contact}</div><div className="text-slate-400">{s.phone}{s.email ? ` · ${s.email}` : ""}</div></div> },
    { key: "b", header: "Tài khoản ngân hàng", cell: (s) => <span className="whitespace-nowrap text-xs text-slate-600">{s.bankAccount || "—"}</span> },
    { key: "r", header: "Đánh giá", sortValue: (s) => s.rating, cell: (s) => <span className="flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5" fill="currentColor" /><span className="text-slate-700">{s.rating.toFixed(1)}</span></span> },
    { key: "st", header: "Trạng thái", sortValue: (s) => (s.active === false ? 1 : 0), cell: (s) => (s.active === false ? <Badge tone="neutral">Ngừng hợp tác</Badge> : <Badge tone="success">Đang hợp tác</Badge>) },
    { key: "a", header: "", cell: (s) => editable && <div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" onClick={() => setEdit(s)}><Pencil /></Button><Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (used(s.id)) return toast.error("Đã có đơn hàng / công nợ – chuyển sang “Ngừng hợp tác” thay vì xóa"); if (await confirm({ title: `Xóa ${s.name}?`, destructive: true, confirmText: "Xóa" })) { run(deleteSupplier, s.id); toast.success("Đã xóa"); } }}><Trash2 /></Button></div> },
  ];
  const exportXlsx = () => writeXlsx("Danh-muc-NCC-thau-phu.xlsx", "NCC", [["Mã", "Loại", "Tên", "MST", "Địa chỉ", "Người liên hệ", "Điện thoại", "Email", "Tài khoản ngân hàng", "Lĩnh vực cung cấp", "Trạng thái"], ...rows.map((s) => [s.code, s.type === "thau_phu" ? "Thầu phụ" : "NCC", s.name, s.taxCode, s.address, s.contact, s.phone, s.email ?? "", s.bankAccount ?? "", s.materialGroups.join(", "), s.active === false ? "Ngừng hợp tác" : "Đang hợp tác"])], [8, 10, 44, 14, 30, 18, 14, 24, 30, 30, 14]);
  return (
    <>
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(s) => s.id} loading={loading} resetKey={type + st} searchText={(s) => `${s.name} ${s.code} ${s.taxCode} ${s.materialGroups.join(" ")}`} searchPlaceholder="Tìm tên, mã, MST..."
          toolbar={<>
            <FilterSelect value={type} onChange={setType} allLabel="NCC & thầu phụ" options={[{ value: "ncc", label: "Nhà cung cấp" }, { value: "thau_phu", label: "Thầu phụ" }]} />
            <FilterSelect value={st} onChange={setSt} allLabel="Mọi trạng thái" options={[{ value: "on", label: "Đang hợp tác" }, { value: "off", label: "Ngừng hợp tác" }]} />
          </>}
          toolbarRight={<>
            {editable && <Button variant="outline" onClick={() => toast.info("Chọn file Excel danh mục NCC / thầu phụ theo mẫu (mô phỏng)")}><Upload /> Import</Button>}
            <Button variant="outline" onClick={exportXlsx}><Download /> Export</Button>
            {editable && <Button onClick={() => setEdit({ rating: 4, materialGroups: [], type: "ncc", active: true })}><Plus /> Thêm NCC / thầu phụ</Button>}
          </>} />
      </Card>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? `Cập nhật ${edit.code}` : "Thêm NCC / thầu phụ"}</DialogTitle></DialogHeader>
          <DialogBody className="grid gap-3 sm:grid-cols-2">
            <FormField label="Loại"><Select value={edit?.type ?? "ncc"} onChange={(e) => setEdit({ ...edit, type: e.target.value as Supplier["type"] })} options={[{ value: "ncc", label: "Nhà cung cấp" }, { value: "thau_phu", label: "Thầu phụ" }]} /></FormField>
            <FormField label="Trạng thái"><Select value={edit?.active === false ? "off" : "on"} onChange={(e) => setEdit({ ...edit, active: e.target.value === "on" })} options={[{ value: "on", label: "Đang hợp tác" }, { value: "off", label: "Ngừng hợp tác" }]} /></FormField>
            <FormField label="Tên NCC / thầu phụ" required className="sm:col-span-2"><Input value={edit?.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></FormField>
            <FormField label="Mã số thuế"><Input value={edit?.taxCode ?? ""} onChange={(e) => setEdit({ ...edit, taxCode: e.target.value })} /></FormField>
            <FormField label="Đánh giá (1–5)"><Input type="number" min={1} max={5} step={0.1} value={edit?.rating ?? 4} onChange={(e) => setEdit({ ...edit, rating: Number(e.target.value) })} /></FormField>
            <FormField label="Địa chỉ" className="sm:col-span-2"><Input value={edit?.address ?? ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></FormField>
            <FormField label="Người liên hệ"><Input value={edit?.contact ?? ""} onChange={(e) => setEdit({ ...edit, contact: e.target.value })} /></FormField>
            <FormField label="Số điện thoại"><Input value={edit?.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></FormField>
            <FormField label="Email"><Input type="email" value={edit?.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></FormField>
            <FormField label="Tài khoản ngân hàng"><Input value={edit?.bankAccount ?? ""} onChange={(e) => setEdit({ ...edit, bankAccount: e.target.value })} placeholder="Số TK – Ngân hàng" /></FormField>
            <FormField label="Lĩnh vực cung cấp (phân cách bởi dấu phẩy)" className="sm:col-span-2"><Input value={(edit?.materialGroups ?? []).join(", ")} onChange={(e) => setEdit({ ...edit, materialGroups: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></FormField>
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={save}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
