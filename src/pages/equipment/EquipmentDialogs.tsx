import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/FormField";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { approveDispatch, createEquipment, requestDispatch, updateEquipment } from "@/services/actions";
import { EQUIPMENT_STATUS } from "@/utils/constants";
import { DEMO_TODAY, addDays } from "@/utils/date";
import type { Equipment } from "@/types";

export const EQUIPMENT_GROUPS = ["Máy rải bê tông", "Máy xúc", "Máy ủi", "Máy lu rung", "Máy tưới nước", "Máy cắt khe", "Ô tô tự đổ", "Cần trục tháp", "Trạm trộn BTXM"];

type EqForm = Omit<Equipment, "id" | "maintenances">;
export function EquipmentFormDialog({ open, onOpenChange, equipment }: { open: boolean; onOpenChange: (o: boolean) => void; equipment?: Equipment }) {
  const { db, run } = useDb();
  const empty: EqForm = { code: "", name: "", group: EQUIPMENT_GROUPS[0], ownership: "so_huu", plate: "", brand: "", year: 2024, manageUnitId: "d-acc244", status: "nhan_roi", currentProjectId: null, operatorId: null, totalHours: 0, fuelNorm: 15, maintenanceInterval: 250, lastMaintenanceHours: 0, kind: "may_thiet_bi", assetCode: "", chassisNo: "", engineNo: "", qualityGrade: "Cấp 1", decisionNo: "", inspectionDue: null, insuranceDue: null, ownerProof: true };
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
        <DialogHeader><DialogTitle>{equipment ? `Sửa thiết bị ${equipment.code}` : "Thêm xe máy thiết bị"}</DialogTitle></DialogHeader>
        <DialogBody className="grid gap-3 md:grid-cols-3">
          <FormField label="Mã máy" required error={err}><Input value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="M244.0250" /></FormField>
          <FormField label="Tên máy thi công" required className="md:col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></FormField>
          <FormField label="Nhóm máy"><Select value={f.group} onChange={(e) => set("group", e.target.value)} options={EQUIPMENT_GROUPS.map((g) => ({ value: g, label: g }))} /></FormField>
          <FormField label="Hình thức"><Select value={f.ownership} onChange={(e) => set("ownership", e.target.value as EqForm["ownership"])} options={[{ value: "so_huu", label: "Sở hữu" }, { value: "thue_ngoai", label: "Thuê ngoài" }]} /></FormField>
          <FormField label="Trạng thái"><Select value={f.status} onChange={(e) => set("status", e.target.value as EqForm["status"])} options={Object.entries(EQUIPMENT_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} /></FormField>
          <FormField label="Biển số / số hiệu"><Input value={f.plate} onChange={(e) => set("plate", e.target.value)} /></FormField>
          <FormField label="Hãng / model"><Input value={f.brand} onChange={(e) => set("brand", e.target.value)} /></FormField>
          <FormField label="Năm sản xuất"><Input type="number" value={f.year} onChange={(e) => set("year", Number(e.target.value))} /></FormField>
          <FormField label="Đơn vị quản lý"><Select value={f.manageUnitId} onChange={(e) => set("manageUnitId", e.target.value)} options={db.departments.filter((d) => d.type === "cong_ty_con" || d.id === "d-tbcn").map((d) => ({ value: d.id, label: d.code }))} /></FormField>
          <FormField label="Định mức nhiên liệu (lít/giờ)"><Input type="number" value={f.fuelNorm} onChange={(e) => set("fuelNorm", Number(e.target.value))} /></FormField>
          <FormField label="Chu kỳ bảo dưỡng (giờ)"><Input type="number" value={f.maintenanceInterval} onChange={(e) => set("maintenanceInterval", Number(e.target.value))} /></FormField>
          <FormField label="Tổng giờ máy"><Input type="number" value={f.totalHours} onChange={(e) => set("totalHours", Number(e.target.value))} /></FormField>
          <FormField label="Loại"><Select value={f.kind} onChange={(e) => set("kind", e.target.value as EqForm["kind"])} options={[{ value: "o_to", label: "Xe ô tô" }, { value: "xe_bien_do", label: "Xe biển đỏ" }, { value: "may_thiet_bi", label: "Máy thiết bị" }]} /></FormField>
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
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={save}>Lưu</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** QT phân công xe – máy: Bước 1 lập yêu cầu → Bước 2 phân công nhân sự, thiết bị */
export function DispatchDialog({ open, onOpenChange, equipmentId, toProjectId }: { open: boolean; onOpenChange: (o: boolean) => void; equipmentId?: string; toProjectId?: string }) {
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const [eqId, setEqId] = useState("");
  const [pid, setPid] = useState("");
  const [op, setOp] = useState("");
  const [start, setStart] = useState(DEMO_TODAY);
  const [end, setEnd] = useState(addDays(DEMO_TODAY, 90));
  const [reason, setReason] = useState("");
  const [immediate, setImmediate] = useState(true);
  useEffect(() => {
    if (open) { setEqId(equipmentId ?? ""); setPid(toProjectId ?? ""); setOp(db.equipment.find((e) => e.id === equipmentId)?.operatorId ?? ""); setStart(DEMO_TODAY); setEnd(addDays(DEMO_TODAY, 90)); setReason(""); setImmediate(can("equipment.dispatch.approve")); }
  }, [open, equipmentId, toProjectId]); // eslint-disable-line react-hooks/exhaustive-deps
  const eq = db.equipment.find((e) => e.id === eqId);
  const operators = db.users.filter((u) => u.isOperator);
  const busyOps = new Set(db.equipment.filter((e) => e.operatorId && e.id !== eqId).map((e) => e.operatorId));
  const save = () => {
    if (!eqId || !pid) return toast.error("Chọn thiết bị và công trình");
    if (eq?.currentProjectId === pid) return toast.error("Thiết bị đang ở công trình này");
    if (eq?.status === "ngung") return toast.error("Thiết bị đã ngừng sử dụng – không thể điều động");
    const next = run(requestDispatch, { equipmentId: eqId, toProjectId: pid, operatorId: op || null, startDate: start, endDate: end, reason: reason || "Phục vụ thi công theo kế hoạch" }, user!.id);
    if (immediate && can("equipment.dispatch.approve")) {
      run(approveDispatch, next.equipmentAssignments[0].id, op || null);
      toast.success(`Đã ban hành quyết định điều động ${eq?.code} đến ${db.projects.find((p) => p.id === pid)?.shortName}`);
    } else toast.success("Đã gửi đề nghị điều động – chờ Phòng Thiết bị duyệt");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Điều động xe máy thiết bị</DialogTitle><DialogDescription>Quyết định điều động xe, máy, thiết bị giữa các công trình</DialogDescription></DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          <FormField label="Thiết bị" required className="sm:col-span-2"><Select value={eqId} onChange={(e) => { setEqId(e.target.value); setOp(db.equipment.find((x) => x.id === e.target.value)?.operatorId ?? ""); }} placeholder="— Chọn thiết bị —" options={db.equipment.filter((e) => e.status !== "ngung").map((e) => ({ value: e.id, label: `${e.code} – ${e.name} (${EQUIPMENT_STATUS[e.status].label})` }))} /></FormField>
          {eq && <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:col-span-2">Hiện đang phục vụ tại: <b>{db.projects.find((p) => p.id === eq.currentProjectId)?.shortName ?? "Chưa phân bổ – sẵn sàng điều động"}</b> · {eq.ownership === "so_huu" ? "Sở hữu" : `Thuê ngoài (${eq.rentalSupplier})`}</div>}
          <FormField label="Về phục vụ thi công cho" required className="sm:col-span-2"><Select value={pid} onChange={(e) => setPid(e.target.value)} placeholder="— Chọn công trình —" options={db.projects.filter((p) => p.status === "dang_thi_cong" || p.status === "chuan_bi").map((p) => ({ value: p.id, label: p.name }))} /></FormField>
          <FormField label="Từ ngày"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></FormField>
          <FormField label="Đến ngày (dự kiến)"><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></FormField>
          <FormField label="Phân công lái xe / thợ vận hành" className="sm:col-span-2"><Select value={op} onChange={(e) => setOp(e.target.value)} placeholder="— Chưa phân công —" options={operators.map((u) => ({ value: u.id, label: `${u.name}${busyOps.has(u.id) ? " (đang vận hành máy khác)" : ""}` }))} /></FormField>
          <FormField label="Lý do / nhiệm vụ" className="sm:col-span-2"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[56px]" /></FormField>
          {can("equipment.dispatch.approve") && <label className="flex items-center gap-2 text-[13px] text-slate-600 sm:col-span-2"><input type="checkbox" className="accent-[#E60028]" checked={immediate} onChange={(e) => setImmediate(e.target.checked)} /> Ban hành quyết định điều động ngay (Phòng Thiết bị – Công nghệ)</label>}
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={save}>{immediate && can("equipment.dispatch.approve") ? "Điều động" : "Gửi đề nghị"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
