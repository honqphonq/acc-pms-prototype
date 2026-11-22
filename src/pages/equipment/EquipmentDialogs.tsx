import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/common/FormField";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { createEquipment, dispatchEquipment, updateEquipment } from "@/services/actions";
import { EQUIPMENT_STATUS } from "@/utils/constants";
import { DEMO_TODAY, addDays } from "@/utils/date";
import { FileUploader } from "@/components/common/Attachments";
import type { Attachment, Equipment } from "@/types";
import { fuelUnit, meterUnit } from "@/services/selectors";
import { activeProjects } from "@/utils/labels";

export const EQUIPMENT_GROUPS = ["Máy rải bê tông", "Máy xúc", "Máy ủi", "Máy lu rung", "Máy tưới nước", "Máy cắt khe", "Ô tô tự đổ", "Cần trục tháp", "Trạm trộn BTXM"];

type EqForm = Omit<Equipment, "id" | "maintenances">;
export function EquipmentFormDialog({ open, onOpenChange, equipment }: { open: boolean; onOpenChange: (o: boolean) => void; equipment?: Equipment }) {
  const { db, run } = useDb();
  const empty: EqForm = { code: "", name: "", group: EQUIPMENT_GROUPS[0], ownership: "so_huu", plate: "", brand: "", year: 2024, manageUnitId: "d-acc244", status: "nhan_roi", currentProjectId: null, operatorId: null, totalHours: 0, fuelNorm: 15, maintenanceInterval: 250, lastMaintenanceHours: 0, maintenanceMonths: 6, lastMaintenanceDate: DEMO_TODAY, kind: "may_thiet_bi", assetCode: "", chassisNo: "", engineNo: "", qualityGrade: "Cấp 1", decisionNo: "", inspectionDue: null, insuranceDue: null, ownerProof: true, images: [], docFiles: [] };
  const [f, setF] = useState<EqForm>(empty);
  const [err, setErr] = useState("");
  useEffect(() => { if (open) { setF(equipment ? { ...equipment } : empty); setErr(""); } }, [open, equipment]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof EqForm>(k: K, v: EqForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () => {
    if (!f.code.trim() || !f.name.trim()) return setErr("Nhập mã máy và tên máy");
    if (db.equipment.some((e) => e.code === f.code && e.id !== equipment?.id)) return setErr("Mã máy đã tồn tại");
    if (equipment) run(updateEquipment, equipment.id, f); else run(createEquipment, f);
    toast.success(equipment ? "Đã cập nhật thông tin thiết bị" : "Đã thêm thiết bị");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{equipment ? `Sửa XMTB ${equipment.code}` : "Thêm XMTB"}</DialogTitle></DialogHeader>
        <DialogBody className="grid gap-3 md:grid-cols-3">
          <FormField label="Mã máy" required error={err}><Input value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="M244.0250" /></FormField>
          <FormField label="Tên XMTB" required className="md:col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></FormField>
          <FormField label="Nhóm XMTB"><Select value={f.group} onChange={(e) => set("group", e.target.value)} options={EQUIPMENT_GROUPS.map((g) => ({ value: g, label: g }))} /></FormField>
          <FormField label="Nguồn gốc"><Select value={f.ownership} onChange={(e) => set("ownership", e.target.value as EqForm["ownership"])} options={[{ value: "so_huu", label: "Sở hữu" }, { value: "thue_ngoai", label: "Thuê ngoài" }]} /></FormField>
          <FormField label="Trạng thái"><Select value={f.status} onChange={(e) => set("status", e.target.value as EqForm["status"])} options={Object.entries(EQUIPMENT_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} /></FormField>
          <FormField label={f.kind === "may_thiet_bi" ? "Số hiệu công tác" : "Biển đăng ký"}><Input value={f.plate} onChange={(e) => set("plate", e.target.value)} /></FormField>
          <FormField label="Hãng / model"><Input value={f.brand} onChange={(e) => set("brand", e.target.value)} /></FormField>
          <FormField label="Năm sản xuất"><Input type="number" value={f.year} onChange={(e) => set("year", Number(e.target.value))} /></FormField>
          <FormField label="Đơn vị quản lý"><Select value={f.manageUnitId} onChange={(e) => set("manageUnitId", e.target.value)} options={db.departments.filter((d) => d.type === "cong_ty_con" || d.id === "d-tbcn").map((d) => ({ value: d.id, label: d.code }))} /></FormField>
          <FormField label="Loại" hint={f.kind === "may_thiet_bi" ? "Tính theo giờ máy" : "Tính theo km"}><Select value={f.kind} onChange={(e) => { const k = e.target.value as EqForm["kind"]; setF((x) => ({ ...x, kind: k, ...(k === "may_thiet_bi") !== (x.kind === "may_thiet_bi") ? (k === "may_thiet_bi" ? { maintenanceInterval: 250, fuelNorm: 15 } : { maintenanceInterval: 8000, fuelNorm: 35 }) : {} })); }} options={[{ value: "o_to", label: "Xe ô tô" }, { value: "xe_bien_do", label: "Xe biển đỏ" }, { value: "may_thiet_bi", label: "Máy thiết bị" }]} /></FormField>
          <FormField label={`Định mức nhiên liệu (${fuelUnit(f)})`}><Input type="number" value={f.fuelNorm} onChange={(e) => set("fuelNorm", Number(e.target.value))} /></FormField>
          <FormField label={`Chỉ số đồng hồ (${meterUnit(f)})`}><Input type="number" value={f.totalHours} onChange={(e) => set("totalHours", Number(e.target.value))} /></FormField>
          <FormField label={`Chu kỳ bảo dưỡng (${meterUnit(f)})`}><Input type="number" value={f.maintenanceInterval} onChange={(e) => set("maintenanceInterval", Number(e.target.value))} /></FormField>
          <FormField label="hoặc theo thời gian (tháng)" hint="Mốc nào đến trước thì bảo dưỡng trước"><Input type="number" value={f.maintenanceMonths ?? ""} onChange={(e) => set("maintenanceMonths", e.target.value ? Number(e.target.value) : undefined)} /></FormField>
          <FormField label="Ngày bảo dưỡng gần nhất"><Input type="date" value={f.lastMaintenanceDate ?? ""} onChange={(e) => set("lastMaintenanceDate", e.target.value || undefined)} /></FormField>
          <FormField label="Mã tài sản"><Input value={f.assetCode} onChange={(e) => set("assetCode", e.target.value)} /></FormField>
          <FormField label="Cấp chất lượng"><Input value={f.qualityGrade} onChange={(e) => set("qualityGrade", e.target.value)} /></FormField>
          <FormField label="Số khung"><Input value={f.chassisNo} onChange={(e) => set("chassisNo", e.target.value)} /></FormField>
          <FormField label="Số máy"><Input value={f.engineNo} onChange={(e) => set("engineNo", e.target.value)} /></FormField>
          <FormField label={f.ownership === "thue_ngoai" ? "Hợp đồng thuê ngoài" : "QĐ điều động về đơn vị"}><Input value={f.decisionNo} onChange={(e) => set("decisionNo", e.target.value)} /></FormField>
          <FormField label="Ngày đến hạn kiểm định"><Input type="date" value={f.inspectionDue ?? ""} onChange={(e) => set("inspectionDue", e.target.value || null)} /></FormField>
          {f.kind !== "may_thiet_bi" && <FormField label="Ngày hết hạn bảo hiểm"><Input type="date" value={f.insuranceDue ?? ""} onChange={(e) => set("insuranceDue", e.target.value || null)} /></FormField>}
          {f.kind === "xe_bien_do" && <FormField label="Mã thẻ VETC / ePass"><Input value={f.vetcCode ?? ""} onChange={(e) => set("vetcCode", e.target.value)} /></FormField>}
          {f.ownership === "thue_ngoai" && (
            <>
              <FormField label="Chứng minh chủ sở hữu"><label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" checked={f.ownerProof} onChange={(e) => set("ownerProof", e.target.checked)} /> Đã có</label></FormField>
              <FormField label="Đơn vị cho thuê" className="md:col-span-2"><Input value={f.rentalSupplier ?? ""} onChange={(e) => set("rentalSupplier", e.target.value)} /></FormField>
              <FormField label="Đơn giá thuê (đ/ca)"><Input type="number" value={f.rentalRate ?? 0} onChange={(e) => set("rentalRate", Number(e.target.value))} /></FormField>
            </>
          )}
          <FormField label="Hình ảnh XMTB" className="md:col-span-3"><FileUploader value={f.images ?? []} onChange={(v) => set("images", v)} accept="image/*" label="Tải ảnh máy" hint="Nhiều góc chụp" /></FormField>
          <FormField label={f.kind === "may_thiet_bi" ? "Giấy tờ: quyết định điều động, kiểm định, cấp chất lượng…" : "Giấy tờ: đăng ký, kiểm định, bảo hiểm" + (f.kind === "xe_bien_do" ? ", QĐ biên chế, thẻ VETC" : "")} className="md:col-span-3"><FileUploader value={f.docFiles ?? []} onChange={(v) => set("docFiles", v)} label="Tải giấy tờ" hint="Ảnh hoặc PDF" /></FormField>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={save}>Lưu</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** QT phân công xe – máy: Bước 1 lập yêu cầu → Bước 2 phân công nhân sự, thiết bị */
/** Điều động XMTB trực tiếp từ danh mục (một hoặc nhiều máy) – có hiệu lực ngay */
export function DispatchDialog({ open, onOpenChange, equipmentIds, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; equipmentIds: string[]; onDone?: () => void }) {
  const { db, run } = useDb();
  const { user } = useAuth();
  const [pid, setPid] = useState("");
  const [start, setStart] = useState(DEMO_TODAY);
  const [end, setEnd] = useState(addDays(DEMO_TODAY, 90));
  const [decision, setDecision] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) { setPid(""); setStart(DEMO_TODAY); setEnd(addDays(DEMO_TODAY, 90)); setDecision(""); setFiles([]); setReason(""); } }, [open]);
  const eqs = db.equipment.filter((e) => equipmentIds.includes(e.id));
  const recall = pid === "__kho";
  const save = () => {
    if (!pid) return toast.error("Chọn nơi điều động đến");
    const list = eqs.filter((e) => e.status !== "ngung" && (recall ? !!e.currentProjectId : e.currentProjectId !== pid));
    if (!list.length) return toast.error(recall ? "Các máy đã chọn đang ở kho" : "Các máy đã chọn đang ở dự án này");
    list.forEach((e) => run(dispatchEquipment, e.id, { toProjectId: recall ? null : pid, startDate: start, endDate: end, decisionNo: list.length > 1 ? "" : decision, files, reason }, user!.id));
    toast.success(recall ? `Đã thu hồi ${list.length} XMTB về kho TCT` : `Đã điều động ${list.length} XMTB đến ${db.projects.find((p) => p.id === pid)?.shortName}`);
    onOpenChange(false);
    onDone?.();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Điều động XMTB</DialogTitle><DialogDescription>Có hiệu lực ngay sau khi lưu</DialogDescription></DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          <div className="max-h-36 space-y-1 overflow-y-auto rounded-md bg-slate-50 px-3 py-2 text-[12.5px] sm:col-span-2">
            {eqs.map((e) => <div key={e.id} className="flex justify-between gap-3"><span><b>{e.code}</b> – {e.name}</span><span className="whitespace-nowrap text-slate-500">{db.projects.find((p) => p.id === e.currentProjectId)?.shortName ?? "Kho TCT"}</span></div>)}
          </div>
          <FormField label="Điều động đến" required className="sm:col-span-2"><Select value={pid} onChange={(e) => setPid(e.target.value)} placeholder="— Chọn dự án hoặc thu hồi về kho —" options={[{ value: "__kho", label: "↩ Thu hồi về kho Tổng công ty" }, ...activeProjects(db).map((p) => ({ value: p.id, label: p.name }))]} /></FormField>
          <FormField label="Từ ngày"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></FormField>
          {!recall ? <FormField label="Đến ngày (dự kiến)"><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></FormField> : <div />}
          <FormField label="Số quyết định" hint={eqs.length > 1 ? "Nhiều máy: hệ thống tự đánh số" : "Để trống: hệ thống tự đánh số"}><Input value={decision} disabled={eqs.length > 1} onChange={(e) => setDecision(e.target.value)} placeholder="QĐ-ĐĐ-2026-…" /></FormField>
          <FormField label="Lý do / nhiệm vụ"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
          <FormField label="File quyết định" className="sm:col-span-2"><FileUploader value={files} onChange={setFiles} label="Tải file quyết định" hint="PDF / ảnh – không bắt buộc" /></FormField>
          {!recall && <div className="rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-800 sm:col-span-2">Người vận hành được phân theo từng ca ở màn <b>Phân ca và nhật trình</b>.</div>}
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={save}>{recall ? "Thu hồi" : "Điều động"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
