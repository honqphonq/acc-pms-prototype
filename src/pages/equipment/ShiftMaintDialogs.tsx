import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/FormField";
import { useDb } from "@/hooks/useDb";
import { addMaintenance, addShift } from "@/services/actions";
import { DEMO_TODAY } from "@/utils/date";
import { fmtNumber } from "@/utils/format";

/** Bước 3–5 QT phân công xe – máy: ghi nhận ca làm việc, giờ máy, nhiên liệu, khối lượng */
export function ShiftDialog({ open, onOpenChange, equipmentId }: { open: boolean; onOpenChange: (o: boolean) => void; equipmentId?: string }) {
  const { db, run } = useDb();
  const [eqId, setEqId] = useState("");
  const [f, setF] = useState({ date: DEMO_TODAY, shift: "Ca 1" as "Ca 1" | "Ca 2" | "Ca 3", hours: "8", km: "", fuel: "", output: "", operatorId: "", note: "" });
  useEffect(() => {
    if (open) {
      const e = db.equipment.find((x) => x.id === equipmentId);
      setEqId(equipmentId ?? "");
      setF({ date: DEMO_TODAY, shift: "Ca 1", hours: "8", km: "", fuel: e && e.kind === "may_thiet_bi" ? String(Math.round(e.fuelNorm * 8)) : "", output: "", operatorId: e?.operatorId ?? "", note: "" });
    }
  }, [open, equipmentId]); // eslint-disable-line react-hooks/exhaustive-deps
  const e = db.equipment.find((x) => x.id === eqId);
  const veh = !!e && e.kind !== "may_thiet_bi";
  const norm = !e ? 0 : veh ? (e.fuelNorm * Number(f.km || 0)) / 100 : e.fuelNorm * Number(f.hours || 0);
  const over = norm > 0 && Number(f.fuel) > norm * 1.08;
  const save = () => {
    if (!e || !e.currentProjectId) return toast.error("Chọn thiết bị đang hoạt động tại công trình");
    if (!(Number(f.hours) > 0 && Number(f.hours) <= 12)) return toast.error("Giờ máy trong ca phải từ 0 – 12 giờ");
    if (veh && !(Number(f.km) > 0)) return toast.error("Nhập số km đã chạy");
    run(addShift, { equipmentId: e.id, projectId: e.currentProjectId, date: f.date, shift: f.shift, operatorId: f.operatorId || e.operatorId || "", hours: Number(f.hours), km: Number(f.km) || 0, fuelLiters: Number(f.fuel) || 0, output: f.output, note: f.note || (over ? "Tiêu hao nhiên liệu cao hơn định mức – cần kiểm tra" : "") });
    toast.success("Đã ghi nhận ca máy", { description: over ? "⚠ Nhiên liệu vượt định mức – hệ thống đã tạo cảnh báo" : undefined });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Ghi nhận ca máy / chấm công</DialogTitle><DialogDescription>Giờ máy, nhiên liệu tiêu hao, khối lượng công việc trong ca</DialogDescription></DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          <FormField label="Thiết bị" required className="sm:col-span-2"><Select value={eqId} onChange={(ev) => { setEqId(ev.target.value); const x = db.equipment.find((q) => q.id === ev.target.value); setF((s) => ({ ...s, operatorId: x?.operatorId ?? "", fuel: x && x.kind === "may_thiet_bi" ? String(Math.round(x.fuelNorm * Number(s.hours || 0))) : "" })); }} placeholder="— Chọn thiết bị đang hoạt động —" options={db.equipment.filter((x) => x.status === "hoat_dong" && x.currentProjectId).map((x) => ({ value: x.id, label: `${x.code} – ${x.name} · ${db.projects.find((p) => p.id === x.currentProjectId)?.shortName}` }))} /></FormField>
          <FormField label="Ngày"><Input type="date" value={f.date} max={DEMO_TODAY} onChange={(ev) => setF({ ...f, date: ev.target.value })} /></FormField>
          <FormField label="Ca làm việc"><Select value={f.shift} onChange={(ev) => setF({ ...f, shift: ev.target.value as typeof f.shift })} options={["Ca 1", "Ca 2", "Ca 3"].map((s) => ({ value: s, label: s }))} /></FormField>
          <FormField label="Người vận hành" className="sm:col-span-2"><Select value={f.operatorId} onChange={(ev) => setF({ ...f, operatorId: ev.target.value })} placeholder="—" options={db.users.filter((u) => u.isOperator).map((u) => ({ value: u.id, label: u.name }))} /></FormField>
          <FormField label="Giờ máy (giờ)"><Input type="number" step="0.5" value={f.hours} onChange={(ev) => setF({ ...f, hours: ev.target.value })} /></FormField>
          {veh && <FormField label="Số km đã chạy" required><Input type="number" value={f.km} onChange={(ev) => setF({ ...f, km: ev.target.value })} /></FormField>}
          <FormField label="Nhiên liệu (lít)" hint={e ? `Định mức: ${e.fuelNorm} ${veh ? "lít/100 km" : "lít/giờ"} → ${fmtNumber(norm)} lít` : undefined} error={over ? `Vượt định mức ${Math.round((Number(f.fuel) / norm - 1) * 100)}%` : undefined}><Input type="number" value={f.fuel} onChange={(ev) => setF({ ...f, fuel: ev.target.value })} /></FormField>
          <FormField label="Khối lượng / sản phẩm" className="sm:col-span-2"><Input value={f.output} onChange={(ev) => setF({ ...f, output: ev.target.value })} placeholder="VD: 320 m³ đất đào" /></FormField>
          <FormField label="Ghi chú" className="sm:col-span-2"><Textarea value={f.note} onChange={(ev) => setF({ ...f, note: ev.target.value })} className="min-h-[50px]" /></FormField>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={save}>Lưu ca máy</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceDialog({ open, onOpenChange, equipmentId }: { open: boolean; onOpenChange: (o: boolean) => void; equipmentId?: string }) {
  const { db, run } = useDb();
  const [eqId, setEqId] = useState("");
  const [f, setF] = useState({ type: "bao_duong" as "bao_duong" | "sua_chua", content: "", cost: "", date: DEMO_TODAY, finish: true });
  useEffect(() => { if (open) { setEqId(equipmentId ?? ""); setF({ type: "bao_duong", content: "Bảo dưỡng định kỳ cấp 1: thay dầu động cơ, lọc nhớt, lọc nhiên liệu", cost: "15000000", date: DEMO_TODAY, finish: true }); } }, [open, equipmentId]);
  const save = () => {
    if (!eqId || !f.content.trim()) return toast.error("Chọn thiết bị và nhập nội dung");
    run(addMaintenance, eqId, { type: f.type, content: f.content, cost: Number(f.cost) || 0, date: f.date }, f.finish);
    toast.success(f.finish ? "Đã ghi nhận bảo dưỡng – thiết bị sẵn sàng hoạt động" : "Đã chuyển thiết bị sang trạng thái Bảo trì");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ghi nhận bảo dưỡng, sửa chữa</DialogTitle></DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          <FormField label="Thiết bị" required className="sm:col-span-2"><Select value={eqId} onChange={(ev) => setEqId(ev.target.value)} placeholder="— Chọn thiết bị —" options={db.equipment.map((x) => ({ value: x.id, label: `${x.code} – ${x.name}` }))} /></FormField>
          <FormField label="Loại"><Select value={f.type} onChange={(ev) => setF({ ...f, type: ev.target.value as typeof f.type })} options={[{ value: "bao_duong", label: "Bảo dưỡng định kỳ" }, { value: "sua_chua", label: "Sửa chữa" }]} /></FormField>
          <FormField label="Ngày"><Input type="date" value={f.date} onChange={(ev) => setF({ ...f, date: ev.target.value })} /></FormField>
          <FormField label="Nội dung" required className="sm:col-span-2"><Textarea value={f.content} onChange={(ev) => setF({ ...f, content: ev.target.value })} /></FormField>
          <FormField label="Chi phí (đ)"><Input type="number" value={f.cost} onChange={(ev) => setF({ ...f, cost: ev.target.value })} /></FormField>
          <label className="flex items-end gap-2 pb-2 text-[13px] text-slate-600"><input type="checkbox" className="accent-[#E60028]" checked={f.finish} onChange={(ev) => setF({ ...f, finish: ev.target.checked })} /> Đã hoàn thành (thiết bị sẵn sàng)</label>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={save}>Lưu</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
