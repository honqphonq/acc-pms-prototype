import { useEffect, useState } from "react";
import { AlertTriangle, Camera, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { NumberInput } from "@/components/ui/number-input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { readFiles } from "@/components/common/Attachments";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormField, FormSection } from "@/components/common/FormField";
import { SitePhoto } from "@/components/common/SitePhoto";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { addConstructionLog, updateConstructionLog, updateTask } from "@/services/actions";
import { PHOTO_LABELS, TASK_STATUS } from "@/utils/constants";
import { DEMO_TODAY } from "@/utils/date";
import { fmtNumber } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { LaborLine, TaskStatus } from "@/types";

export const p1 = (v: number) => `${(v * 100).toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
export const n1 = (v: number) => v.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Cập nhật kết quả hằng ngày: mỗi lần lưu là một bản ghi (ngày, khối lượng, nội dung, nhân công, ảnh).
 * Khối lượng được cộng dồn; trạng thái, ngày bắt đầu / kết thúc thực tế tự tính theo lịch sử.
 */
export function TaskUpdateForm({ taskId, active = true, onDone, onCancel, footerExtra, className, editLogId, onEditDone }: { taskId: string; active?: boolean; onDone?: () => void; onCancel?: () => void; footerExtra?: React.ReactNode; className?: string; editLogId?: string | null; onEditDone?: () => void }) {
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const task = db.constructionPlans.find((t) => t.id === taskId);
  const editing = db.constructionLogs.find((l) => l.id === editLogId) ?? null;

  const [date, setDate] = useState(DEMO_TODAY);
  const [qty, setQty] = useState(0);
  const [content, setContent] = useState("");
  const [expectedEnd, setExpectedEnd] = useState("");
  const [labor, setLabor] = useState<LaborLine[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!active || !task) return;
    if (editing) {
      setDate(editing.date); setQty(editing.qty); setContent(editing.content); setLabor(editing.labor); setPhotos(editing.photos);
    } else {
      setDate(DEMO_TODAY); setQty(0); setContent(""); setPhotos([]);
      setLabor([{ role: "Thợ chính", grade: "3,5/7", people: 8, workdays: 8 }, { role: "Phụ hồ", grade: "2/7", people: 6, workdays: 6 }]);
    }
    setExpectedEnd(task.expectedEnd ?? task.plannedEnd);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, taskId, version, editLogId]);

  if (!task) return null;
  const contract = task.contractQty;
  const before = Math.round((task.actualQty - (editing && editing.status !== "nhap" ? editing.qty : 0)) * 100) / 100;
  const after = Math.round((before + (qty || 0)) * 100) / 100;
  const pctBefore = contract ? Math.min(1, before / contract) : 0;
  const pctAfter = contract ? Math.min(1, after / contract) : 0;
  const over = contract > 0 && after > contract ? Math.round((after - contract) * 100) / 100 : 0;
  const autoStatus: TaskStatus = contract && after >= contract ? "hoan_thanh" : after > 0 ? "dang_thuc_hien" : "chua_thuc_hien";
  const canEdit = can("progress.update");

  const submit = (draft: boolean) => {
    if (!date) return setError("Chọn ngày cập nhật");
    if (date > DEMO_TODAY) return setError("Không cập nhật cho ngày trong tương lai");
    if (!draft && !(qty > 0)) return setError("Nhập khối lượng thực hiện trong ngày (> 0)");
    const body = { date, qty: qty || 0, content: content || `Thực hiện ${fmtNumber(qty || 0)} ${task.unit} ${task.name.toLowerCase()}`, labor, photos };
    if (editing) {
      run(updateConstructionLog, editing.id, { ...body, status: draft ? "nhap" : editing.status === "nhap" ? "da_gui" : editing.status });
      toast.success("Đã cập nhật bản ghi ngày " + date.split("-").reverse().join("/"));
      onEditDone?.();
    } else {
      run(addConstructionLog, { taskId: task.id, ...body, shift: "Ca ngày 07:00 – 17:00", weather: "Nắng", reporterId: user!.id, status: draft ? "nhap" : "da_gui" });
      toast.success(draft ? "Đã lưu nháp" : `Đã cập nhật: lũy kế ${n1(after)} ${task.unit} (${p1(pctAfter)})`, { description: over ? `Vượt khối lượng hợp đồng ${n1(over)} ${task.unit} – khối lượng phát sinh` : draft ? undefined : "Tiến độ hạng mục, dự án và Gantt đã được tính lại." });
    }
    if (!draft && expectedEnd && expectedEnd !== (task.expectedEnd ?? task.plannedEnd)) run(updateTask, task.id, { expectedEnd });
    setVersion((v) => v + 1);
    onDone?.();
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="grid flex-1 gap-4 overflow-y-auto bg-slate-50/60 p-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <FormSection title={editing ? `Sửa bản ghi ngày ${editing.date.split("-").reverse().join("/")}` : "Cập nhật kết quả trong ngày"} right={<span className="flex items-center gap-2 text-[12px] text-slate-500">Trạng thái sau khi lưu: <StatusBadge map={TASK_STATUS} value={autoStatus} /></span>}>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Ngày cập nhật" required><Input type="date" value={date} max={DEMO_TODAY} disabled={!canEdit} onChange={(e) => { setDate(e.target.value); setError(""); }} /></FormField>
              <FormField label="Khối lượng thực hiện trong ngày" required error={error}>
                <div className="relative">
                  <NumberInput autoFocus value={qty} onChange={(v) => { setQty(v); setError(""); }} className="border-success/60 pr-12 font-semibold focus-visible:ring-success/20" placeholder="0" disabled={!canEdit} />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{task.unit}</span>
                </div>
              </FormField>
              <FormField label="Dự kiến kết thúc" hint={`Kế hoạch: ${task.plannedEnd.split("-").reverse().join("/")}`}><Input type="date" value={expectedEnd} disabled={!canEdit} onChange={(e) => setExpectedEnd(e.target.value)} /></FormField>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <FormField label="KL hợp đồng"><Suffixed value={n1(contract)} suffix={task.unit} /></FormField>
              <FormField label="Lũy kế trước"><Suffixed value={n1(before)} suffix={p1(pctBefore)} /></FormField>
              <FormField label="Lũy kế sau khi lưu"><Suffixed value={n1(after)} suffix={p1(pctAfter)} strong /></FormField>
              <FormField label="Còn lại"><Suffixed value={n1(Math.max(0, contract - after))} suffix={task.unit} /></FormField>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-slate-600"><span>Tiến độ công việc (theo khối lượng)</span><span className="tabular font-semibold">{p1(pctBefore)} → <span className="text-success-fg">{p1(pctAfter)}</span></span></div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div className="absolute inset-y-0 left-0 bg-success/40" style={{ width: `${pctAfter * 100}%` }} />
                <div className="absolute inset-y-0 left-0 bg-success" style={{ width: `${pctBefore * 100}%` }} />
              </div>
            </div>
            {over > 0 && <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />Vượt khối lượng hợp đồng <b>{n1(over)} {task.unit}</b> – khối lượng phát sinh. Vẫn cho lưu; tiến độ dừng ở 100%.</div>}
            <FormField label="Nội dung đã thực hiện / ghi chú" className="mt-3">
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="VD: Đã rải 600 m³ BTXM M350 làn 8–9 CHC zone R2, phủ nilon bảo dưỡng; lấy 3 tổ mẫu uốn gửi thí nghiệm." />
            </FormField>
          </FormSection>

          <FormSection title="Nhân công" right={<span className="text-[11px] text-slate-500">{task.team} · 07:00 – 17:00</span>}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="text-[11px] uppercase text-slate-500">
                  <tr><th className="py-1 text-left font-medium">Nhân công</th><th className="text-left font-medium">Bậc thợ</th><th className="text-right font-medium">Số người</th><th className="text-right font-medium">Số công</th><th /></tr>
                </thead>
                <tbody>
                  {labor.map((l, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1 pr-2"><Input className="h-8" value={l.role} onChange={(e) => setLabor(labor.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} /></td>
                      <td className="pr-2"><Input className="h-8 w-20" value={l.grade} onChange={(e) => setLabor(labor.map((x, j) => (j === i ? { ...x, grade: e.target.value } : x)))} /></td>
                      <td className="pr-2"><Input className="h-8 w-20 text-right" type="number" value={l.people} onChange={(e) => setLabor(labor.map((x, j) => (j === i ? { ...x, people: Number(e.target.value), workdays: Number(e.target.value) } : x)))} /></td>
                      <td className="pr-2"><Input className="h-8 w-20 text-right" type="number" step="0.5" value={l.workdays} onChange={(e) => setLabor(labor.map((x, j) => (j === i ? { ...x, workdays: Number(e.target.value) } : x)))} /></td>
                      <td className="w-8"><button className="text-slate-400 hover:text-rose-600" onClick={() => setLabor(labor.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                  <tr className="border-t font-semibold"><td className="py-1.5">Tổng</td><td /><td className="tabular text-right">{labor.reduce((s, l) => s + l.people, 0)}</td><td className="tabular text-right">{fmtNumber(labor.reduce((s, l) => s + l.workdays, 0))}</td><td /></tr>
                </tbody>
              </table>
            </div>
            <button className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline" onClick={() => setLabor([...labor, { role: "Thợ vận hành", grade: "3/7", people: 1, workdays: 1 }])}><Plus className="h-3.5 w-3.5" /> Thêm nhân công</button>
          </FormSection>
        </div>

        <FormSection title="Hình ảnh thi công" className="h-fit">
          <div className="grid grid-cols-2 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <SitePhoto kind={p} />
                <button className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-primary-soft/40 px-3 py-6 text-center hover:bg-primary-soft">
            <Camera className="h-6 w-6 text-primary" />
            <span className="mt-1 text-[13px] font-medium text-primary">Tải ảnh lên / chụp ảnh</span>
            <span className="text-[11px] text-slate-500">JPG, PNG · lưu trên trình duyệt (prototype)</span>
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={async (e) => { const a = await readFiles(e.target.files); e.target.value = ""; setPhotos([...photos, ...a.map((x) => x.url ?? "site")]); }} />
          </label>
          <div className="mt-3 text-[11px] font-medium text-slate-500">Hoặc chọn ảnh hiện trường mẫu:</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {Object.keys(PHOTO_LABELS).map((k) => (
              <button key={k} onClick={() => setPhotos([...photos, k])}>
                <Badge tone="outline" className="cursor-pointer hover:border-primary hover:text-primary"><ImagePlus className="h-3 w-3" />{PHOTO_LABELS[k]}</Badge>
              </button>
            ))}
          </div>
        </FormSection>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-white px-5 py-3">
        <span className="text-[11.5px] text-slate-500">Mỗi lần lưu là một bản ghi trong ngày; khối lượng được cộng dồn vào lũy kế công việc.{footerExtra}</span>
        <div className="flex gap-2">
          {editing && <Button variant="outline" onClick={() => onEditDone?.()}>Hủy sửa</Button>}
          {onCancel && !editing && <Button variant="outline" onClick={onCancel}>Hủy</Button>}
          {!editing && <Button variant="outline" onClick={() => submit(true)} disabled={!canEdit}>Lưu nháp</Button>}
          <Button variant="success" onClick={() => submit(false)} disabled={!canEdit}>{editing ? "Lưu thay đổi" : "Lưu cập nhật"}</Button>
        </div>
      </div>
    </div>
  );
}

/** Ô chỉ đọc có hậu tố (đơn vị hoặc %) bên phải */
function Suffixed({ value, suffix, strong }: { value: string; suffix?: string; strong?: boolean }) {
  return (
    <div className="flex h-9 items-center justify-between rounded-md border border-input bg-slate-50 px-3 text-sm">
      <span className={strong ? "font-semibold text-slate-900" : "text-slate-700"}>{value}</span>
      {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
    </div>
  );
}
