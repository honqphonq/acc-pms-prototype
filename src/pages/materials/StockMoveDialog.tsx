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
import { issueStock, receiveStock } from "@/services/actions";
import { stockOf } from "@/services/selectors";
import { DEMO_TODAY } from "@/utils/date";
import { fmtNumber } from "@/utils/format";

export function StockMoveDialog({ open, onOpenChange, type, projectId, materialId }: { open: boolean; onOpenChange: (o: boolean) => void; type: "nhap" | "xuat"; projectId?: string; materialId?: string }) {
  const { db, run } = useDb();
  const { user } = useAuth();
  const [pid, setPid] = useState("");
  const [mid, setMid] = useState("");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(DEMO_TODAY);
  const [supplierId, setSupplierId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    if (open) {
      setPid(projectId ?? "p01");
      setMid(materialId ?? "");
      setQty("");
      setDate(DEMO_TODAY);
      setSupplierId("");
      setTaskId("");
      setNote("");
      setErr("");
    }
  }, [open, projectId, materialId]);
  const material = db.materials.find((m) => m.id === mid);
  const stock = pid && mid ? stockOf(db, pid, mid) : undefined;
  const onHand = stock?.onHand ?? 0;
  const tasks = db.constructionPlans.filter((t) => t.projectId === pid && !t.isGroup && t.status !== "hoan_thanh");
  const projMaterials = type === "xuat" ? db.inventory.filter((i) => i.projectId === pid).map((i) => db.materials.find((m) => m.id === i.materialId)!) : db.materials;

  const save = () => {
    const q = Number(qty);
    if (!pid || !mid) return setErr("Chọn kho công trình và vật tư");
    if (!(q > 0)) return setErr("Số lượng phải lớn hơn 0");
    if (type === "xuat" && q > onHand) return setErr(`Không đủ tồn kho (hiện tồn ${fmtNumber(onHand)} ${material?.unit})`);
    const base = { projectId: pid, materialId: mid, qty: q, date, byId: user!.id, note: note || (type === "nhap" ? "Nhập kho" : "Xuất sử dụng thi công") };
    if (type === "nhap") run(receiveStock, { ...base, supplierId: supplierId || null });
    else run(issueStock, { ...base, taskId: taskId || null });
    toast.success(type === "nhap" ? `Đã nhập kho ${fmtNumber(q)} ${material?.unit} ${material?.name}` : `Đã xuất ${fmtNumber(q)} ${material?.unit} ${material?.name}`, { description: `Tồn kho mới: ${fmtNumber(type === "nhap" ? onHand + q : onHand - q)} ${material?.unit}` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{type === "nhap" ? "Lập phiếu nhập kho" : "Lập phiếu xuất kho sử dụng"}</DialogTitle>
          <DialogDescription>{type === "nhap" ? "Ghi nhận vật tư nhập về kho công trường" : "Xuất vật tư cho tổ đội thi công – theo dõi tiêu hao thực tế theo công việc"}</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          <FormField label="Kho công trường" required className="sm:col-span-2"><Select value={pid} onChange={(e) => { setPid(e.target.value); setErr(""); }} options={db.projects.filter((p) => p.status !== "hoan_thanh").map((p) => ({ value: p.id, label: `Kho ${p.shortName}` }))} /></FormField>
          <FormField label="Vật tư" required className="sm:col-span-2"><Select value={mid} onChange={(e) => { setMid(e.target.value); setErr(""); }} placeholder="— Chọn vật tư —" options={projMaterials.map((m) => ({ value: m.id, label: `${m.code} – ${m.name} (${m.unit})` }))} /></FormField>
          {stock && (
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-xs sm:col-span-2">
              <div><div className="text-slate-500">Tồn hiện tại</div><b className="text-sm">{fmtNumber(onHand)} {material?.unit}</b></div>
              <div><div className="text-slate-500">Định mức dự toán</div><b className="text-sm">{fmtNumber(stock.inv.normQty)}</b></div>
              <div><div className="text-slate-500">Đã xuất dùng</div><b className="text-sm">{fmtNumber(stock.issued)} ({Math.round(stock.usage * 100)}%)</b></div>
            </div>
          )}
          <FormField label={`Số lượng${material ? ` (${material.unit})` : ""}`} required error={err}><Input type="number" min={0} value={qty} onChange={(e) => { setQty(e.target.value); setErr(""); }} autoFocus /></FormField>
          <FormField label={type === "nhap" ? "Ngày nhập" : "Ngày xuất"}><Input type="date" value={date} max={DEMO_TODAY} onChange={(e) => setDate(e.target.value)} /></FormField>
          {type === "nhap" ? (
            <FormField label="Nhà cung cấp" className="sm:col-span-2"><Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="— Không chọn / điều chuyển nội bộ —" options={db.suppliers.map((s) => ({ value: s.id, label: s.name }))} /></FormField>
          ) : (
            <FormField label="Xuất cho công việc" className="sm:col-span-2"><Select value={taskId} onChange={(e) => setTaskId(e.target.value)} placeholder="— Chọn công việc —" options={tasks.map((t) => ({ value: t.id, label: `${t.code} ${t.name}` }))} /></FormField>
          )}
          {type === "xuat" && stock && Number(qty) > 0 && stock.inv.normQty > 0 && (stock.issued + Number(qty)) / stock.inv.normQty >= 0.9 && (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 sm:col-span-2">⚠ Sau khi xuất, lũy kế tiêu hao đạt {Math.round(((stock.issued + Number(qty)) / stock.inv.normQty) * 100)}% định mức dự toán – hệ thống sẽ cảnh báo vượt định mức.</div>
          )}
          <FormField label="Ghi chú" className="sm:col-span-2"><Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[56px]" /></FormField>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button variant={type === "nhap" ? "default" : "navy"} onClick={save}>{type === "nhap" ? "Nhập kho" : "Xuất kho"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
