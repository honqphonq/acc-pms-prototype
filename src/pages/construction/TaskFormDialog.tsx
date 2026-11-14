import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/common/FormField";
import { useDb } from "@/hooks/useDb";
import { createItem, createTask, updateTask, type TaskInput } from "@/services/actions";
import { DEMO_TODAY, addDays, diffDays } from "@/utils/date";
import { fmtVnd } from "@/utils/format";
import type { PlanTask } from "@/types";

const UNITS = ["m³", "m²", "m", "tấn", "kg", "cái", "bộ", "gói", "lần", "m² sàn"];

export function TaskFormDialog({ open, onOpenChange, projectId, task, defaults }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; task?: PlanTask; defaults?: { itemId?: string; parentId?: string | null } }) {
  const { db, run } = useDb();
  const items = db.constructionItems.filter((i) => i.projectId === projectId).sort((a, b) => a.order - b.order);
  const project = db.projects.find((p) => p.id === projectId);
  const people = db.users.filter((u) => !u.isOperator && ["to_truong", "chi_huy_truong", "phong_ktkt"].includes(u.role));
  const init = (): TaskInput => ({
    projectId, itemId: defaults?.itemId ?? items[0]?.id ?? "", parentId: defaults?.parentId ?? null, name: "", assigneeId: people[0]?.id ?? "", team: "",
    unit: "m³", contractQty: 0, unitPrice: 0, plannedStart: DEMO_TODAY, plannedEnd: addDays(DEMO_TODAY, 14), isGroup: false, note: "",
  });
  const [f, setF] = useState<TaskInput>(init);
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open) {
      setF(task ? { ...task, note: task.note ?? "" } : init());
      setErr({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);
  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const groups = db.constructionPlans.filter((t) => t.itemId === f.itemId && t.isGroup && t.id !== task?.id);

  const save = () => {
    const e: Record<string, string> = {};
    if (!f.itemId) e.itemId = "Chọn hạng mục";
    if (!f.name.trim()) e.name = "Nhập tên công việc";
    if (f.plannedEnd < f.plannedStart) e.plannedEnd = "Ngày kết thúc phải sau ngày bắt đầu";
    if (!f.isGroup && f.contractQty <= 0) e.contractQty = "Khối lượng kế hoạch phải > 0";
    setErr(e);
    if (Object.keys(e).length) return;
    if (task) {
      run(updateTask, task.id, f);
      toast.success("Đã cập nhật công việc");
    } else {
      run(createTask, f);
      toast.success("Đã thêm công việc và gửi thông báo giao việc cho người phụ trách");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? `Chỉnh sửa công việc ${task.code}` : "Thêm công việc / phân giao kế hoạch"}</DialogTitle>
          <DialogDescription>{project?.name}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Hạng mục" required error={err.itemId}>
              <Select value={f.itemId} onChange={(e) => { set("itemId", e.target.value); set("parentId", null); }} options={items.map((i) => ({ value: i.id, label: `${i.code} ${i.name}` }))} placeholder="— Chọn hạng mục —" />
            </FormField>
            <FormField label="Thuộc nhóm công việc">
              <Select value={f.parentId ?? ""} onChange={(e) => set("parentId", e.target.value || null)} options={groups.map((g) => ({ value: g.id, label: `${g.code} ${g.name}` }))} placeholder="— Trực thuộc hạng mục —" />
            </FormField>
            <FormField label="Tên công việc" required error={err.name} className="md:col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="VD: Đổ bê tông đài móng, giằng móng" /></FormField>
            <label className="flex items-center gap-2 text-[13px] text-slate-600 md:col-span-2">
              <input type="checkbox" checked={f.isGroup} onChange={(e) => set("isGroup", e.target.checked)} className="accent-[#E60028]" /> Là nhóm công việc (phân rã thành các đầu việc con, tiến độ tự tổng hợp)
            </label>
            <FormField label="Giao cho (người phụ trách)"><Select value={f.assigneeId} onChange={(e) => set("assigneeId", e.target.value)} options={people.map((u) => ({ value: u.id, label: `${u.name} – ${u.title}` }))} /></FormField>
            <FormField label="Tổ đội thực hiện"><Input value={f.team} onChange={(e) => set("team", e.target.value)} placeholder="VD: Tổ bê tông số 2" /></FormField>
            <FormField label="Bắt đầu kế hoạch"><Input type="date" value={f.plannedStart} onChange={(e) => set("plannedStart", e.target.value)} /></FormField>
            <FormField label="Kết thúc kế hoạch" error={err.plannedEnd} hint={`Thời gian: ${Math.max(0, diffDays(f.plannedStart, f.plannedEnd) + 1)} ngày`}><Input type="date" value={f.plannedEnd} onChange={(e) => set("plannedEnd", e.target.value)} /></FormField>
            {!f.isGroup && (
              <>
                <FormField label="Đơn vị tính"><Select value={f.unit} onChange={(e) => set("unit", e.target.value)} options={UNITS.map((u) => ({ value: u, label: u }))} /></FormField>
                <FormField label="Khối lượng kế hoạch (hợp đồng)" required error={err.contractQty}><Input type="number" value={f.contractQty || ""} onChange={(e) => set("contractQty", Number(e.target.value))} /></FormField>
                <FormField label="Đơn giá (VNĐ)"><Input type="number" value={f.unitPrice || ""} onChange={(e) => set("unitPrice", Number(e.target.value))} /></FormField>
                <FormField label="Giá trị kế hoạch"><Input disabled value={`${fmtVnd(f.contractQty * f.unitPrice)} đ`} /></FormField>
              </>
            )}
            <FormField label="Ghi chú / yêu cầu kỹ thuật" className="md:col-span-2"><Textarea value={f.note} onChange={(e) => set("note", e.target.value)} /></FormField>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={save}>{task ? "Lưu" : "Thêm & giao việc"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ItemFormDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string }) {
  const { db, run } = useDb();
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("u04");
  useEffect(() => { if (open) setName(""); }, [open]);
  const people = db.users.filter((u) => !u.isOperator && ["to_truong", "chi_huy_truong"].includes(u.role));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Thêm hạng mục thi công</DialogTitle></DialogHeader>
        <DialogBody className="space-y-3">
          <FormField label="Tên hạng mục" required><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Phần thân – Nhà học B" /></FormField>
          <FormField label="Phụ trách hạng mục"><Select value={managerId} onChange={(e) => setManagerId(e.target.value)} options={people.map((u) => ({ value: u.id, label: u.name }))} /></FormField>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button disabled={!name.trim()} onClick={() => { run(createItem, projectId, name.trim(), managerId); toast.success("Đã thêm hạng mục"); onOpenChange(false); }}>Thêm hạng mục</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
