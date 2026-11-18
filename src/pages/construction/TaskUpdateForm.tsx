import { useEffect, useState } from "react";
import { Camera, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormField, FormSection } from "@/components/common/FormField";
import { SitePhoto } from "@/components/common/SitePhoto";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { addConstructionLog, updateTask } from "@/services/actions";
import { PHOTO_LABELS, TASK_STATUS } from "@/utils/constants";
import { DEMO_TODAY } from "@/utils/date";
import { fmtNumber } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { LaborLine, TaskStatus } from "@/types";

export const p1 = (v: number) => `${(v * 100).toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
export const n1 = (v: number) => v.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Form cập nhật kết quả thực hiện công việc: trạng thái, ngày, khối lượng (tự tính %), nhân công, hình ảnh.
 * Dùng chung cho màn hình Chi tiết công việc và hộp thoại cập nhật.
 */
export function TaskUpdateForm({ taskId, active = true, onDone, onCancel, footerExtra, className }: { taskId: string; active?: boolean; onDone?: () => void; onCancel?: () => void; footerExtra?: React.ReactNode; className?: string }) {
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const task = db.constructionPlans.find((t) => t.id === taskId);

  const [status, setStatus] = useState<TaskStatus>("dang_thuc_hien");
  const [qty, setQty] = useState("");
  const [content, setContent] = useState("");
  const [actualStart, setActualStart] = useState(DEMO_TODAY);
  const [expectedEnd, setExpectedEnd] = useState("");
  const [labor, setLabor] = useState<LaborLine[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (active && task) {
      setStatus(task.status === "chua_thuc_hien" ? "dang_thuc_hien" : task.status);
      setQty("");
      setContent("");
      setActualStart(task.actualStart ?? DEMO_TODAY);
      setExpectedEnd(task.expectedEnd ?? task.plannedEnd);
      setLabor([
        { role: "Thợ chính", grade: "3,5/7", people: 8, workdays: 8 },
        { role: "Phụ hồ", grade: "2/7", people: 6, workdays: 6 },
      ]);
      setPhotos([]);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, taskId, version]);

  if (!task) return null;
  const q = Number(qty) || 0;
  const before = task.actualQty;
  const after = Math.round((before + q) * 100) / 100;
  const contract = task.contractQty;
  const pctBefore = contract ? before / contract : 0;
  const pctAfter = contract ? Math.min(1, after / contract) : status === "hoan_thanh" ? 1 : 0;
  const canEdit = can("progress.update");

  const submit = (draft: boolean) => {
    if (!draft && q <= 0 && status !== "hoan_thanh") return setError("Nhập khối lượng thực hiện hôm nay (> 0)");
    if (q < 0) return setError("Khối lượng không hợp lệ");
    if (contract && after > contract * 1.1) return setError(`Lũy kế vượt quá 110% khối lượng hợp đồng (${fmtNumber(contract)} ${task.unit})`);
    const finalStatus: TaskStatus = contract && after >= contract ? "hoan_thanh" : status;
    run(
      addConstructionLog,
      { taskId: task.id, date: DEMO_TODAY, qty: q, shift: "Ca ngày 07:00 – 17:00", weather: "Nắng", content: content || `Thực hiện ${fmtNumber(q)} ${task.unit} ${task.name.toLowerCase()}`, reporterId: user!.id, status: draft ? "nhap" : "da_gui", labor, photos },
      draft ? undefined : finalStatus,
    );
    if (!draft) run(updateTask, task.id, { actualStart: actualStart || task.actualStart, expectedEnd: expectedEnd || null });
    toast.success(draft ? "Đã lưu nháp nhật ký" : `Đã cập nhật tiến độ: ${p1(pctBefore)} → ${p1(pctAfter)}`, { description: draft ? undefined : "Tiến độ hạng mục, dự án và dashboard đã được tính lại." });
    setVersion((v) => v + 1);
    onDone?.();
  };

  const setPct = (p: number) => {
    const target = (contract * p) / 100;
    setQty(String(Math.max(0, Math.round((target - before) * 10) / 10)));
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
              <div className="grid flex-1 gap-4 overflow-y-auto bg-slate-50/60 p-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <FormSection title="Kết quả thực hiện">
              <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-lg border">
                {(Object.keys(TASK_STATUS) as TaskStatus[]).map((s) => (
                  <button key={s} disabled={!canEdit} onClick={() => setStatus(s)} className={cn("py-2 text-[13px] transition", status === s ? "bg-info-soft font-semibold text-info-fg" : "bg-white text-slate-600 hover:bg-slate-50", s !== "chua_thuc_hien" && "border-l")}>
                    {TASK_STATUS[s].label}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="Bắt đầu thực tế"><Input type="date" value={actualStart} max={DEMO_TODAY} disabled={!canEdit} onChange={(e) => setActualStart(e.target.value)} /></FormField>
                <FormField label="Dự kiến kết thúc" hint={`Kế hoạch: ${task.plannedEnd.split("-").reverse().join("/")}`}><Input type="date" value={expectedEnd} disabled={!canEdit} onChange={(e) => setExpectedEnd(e.target.value)} /></FormField>
                <FormField label="Người cập nhật"><Input value={user?.name} disabled /></FormField>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
                  <span>Tiến độ công việc (tính theo khối lượng)</span>
                  <span className="tabular font-semibold">{p1(pctBefore)} → <span className="text-success-fg">{p1(pctAfter)}</span></span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 my-auto h-2 rounded-full bg-success/60" style={{ width: `${pctBefore * 100}%` }} />
                  <input type="range" min={0} max={100} step={0.1} value={pctAfter * 100} disabled={!canEdit || !contract} onChange={(e) => setPct(Math.max(pctBefore * 100, Number(e.target.value)))} className="relative w-full accent-[#16A34A]" />
                </div>
              </div>
              <FormField label="Nội dung đã thực hiện / ghi chú" className="mt-3">
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="VD: Đã rải 600 m³ BTXM M350 làn 8–9 CHC zone R2, phủ nilon bảo dưỡng; lấy 3 tổ mẫu uốn gửi thí nghiệm." />
              </FormField>
            </FormSection>

            <FormSection title="Khối lượng thực hiện" right={<span className="text-[11px] text-slate-500">Đơn vị: {task.unit || "—"}</span>}>
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="Khối lượng hợp đồng"><Suffixed value={n1(contract)} suffix={task.unit} /></FormField>
                <FormField label="Thực hiện hôm nay" required error={error}>
                  <div className="relative">
                    <Input type="number" min={0} step="0.1" autoFocus value={qty} onChange={(e) => { setQty(e.target.value); setError(""); }} className="border-success/60 pr-12 font-semibold focus-visible:ring-success/20" placeholder="0" disabled={!canEdit} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{task.unit}</span>
                  </div>
                </FormField>
                <FormField label="Tích lũy trước đó"><Suffixed value={n1(before)} suffix={p1(pctBefore)} /></FormField>
                <FormField label="Tích lũy sau khi lưu"><Suffixed value={n1(after)} suffix={p1(pctAfter)} strong /></FormField>
                <FormField label="Còn lại"><Suffixed value={n1(Math.max(0, contract - after))} suffix={task.unit} /></FormField>
              </div>
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
                        <td className="tabular pr-2 text-right">{fmtNumber(l.workdays)}</td>
                        <td className="w-8"><button className="text-slate-400 hover:text-rose-600" onClick={() => setLabor(labor.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    ))}
                    <tr className="border-t font-semibold"><td className="py-1.5">Tổng</td><td /><td className="tabular text-right">{labor.reduce((s, l) => s + l.people, 0)}</td><td className="tabular text-right">{fmtNumber(labor.reduce((s, l) => s + l.workdays, 0))}</td><td /></tr>
                  </tbody>
                </table>
              </div>
              <button className="mt-2 flex items-center gap-1 text-xs font-medium text-success-fg hover:underline" onClick={() => setLabor([...labor, { role: "Thợ cốt thép", grade: "3/7", people: 2, workdays: 2 }])}><Plus className="h-3.5 w-3.5" /> Thêm nhân công</button>
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
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-success/40 bg-success-soft/40 px-3 py-6 text-center hover:bg-success-soft">
              <Camera className="h-6 w-6 text-success-fg" />
              <span className="mt-1 text-[13px] font-medium text-success-fg">Tải ảnh lên / chụp ảnh</span>
              <span className="text-[11px] text-slate-500">JPG, PNG · tối đa 10 MB (mô phỏng)</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const n = e.target.files?.length ?? 0; if (n) { setPhotos([...photos, ...Array.from({ length: n }, () => "site")]); toast.info(`Đã đính kèm ${n} ảnh (prototype lưu ảnh minh họa)`); } e.target.value = ""; }} />
            </label>
            <div className="mt-3 text-[11px] font-medium text-slate-500">Hoặc chọn ảnh hiện trường mẫu:</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.keys(PHOTO_LABELS).map((k) => (
                <button key={k} onClick={() => setPhotos([...photos, k])}>
                  <Badge tone="outline" className="cursor-pointer hover:border-success hover:text-success-fg"><ImagePlus className="h-3 w-3" />{PHOTO_LABELS[k]}</Badge>
                </button>
              ))}
            </div>
          </FormSection>
        </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-white px-5 py-3">
        <span className="text-[11.5px] text-slate-500">Lưu nhật ký sẽ cập nhật tiến độ công việc và lũy kế toàn dự án.{footerExtra}</span>
        <div className="flex gap-2">
          {onCancel && <Button variant="outline" onClick={onCancel}>Hủy</Button>}
          <Button variant="outline" onClick={() => submit(true)} disabled={!canEdit}>Lưu nháp</Button>
          <Button variant="success" onClick={() => submit(false)} disabled={!canEdit}>Lưu cập nhật</Button>
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
