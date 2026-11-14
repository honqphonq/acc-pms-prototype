import { useEffect, useMemo, useState } from "react";
import { Camera, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FormField, FormSection } from "@/components/common/FormField";
import { SitePhoto } from "@/components/common/SitePhoto";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { addConstructionLog } from "@/services/actions";
import { getProjectStatsMap } from "@/services/selectors";
import { PHOTO_LABELS, TASK_STATUS } from "@/utils/constants";
import { DEMO_TODAY } from "@/utils/date";
import { fmtNumber, fmtPct } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { LaborLine, TaskStatus } from "@/types";

const WEATHERS = ["Nắng", "Nắng nhẹ", "Nhiều mây", "Mưa nhỏ", "Mưa to", "Âm u"];

export function TaskProgressDialog({ taskId, open, onOpenChange }: { taskId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const task = db.constructionPlans.find((t) => t.id === taskId);
  const item = db.constructionItems.find((i) => i.id === task?.itemId);
  const parent = db.constructionPlans.find((t) => t.id === task?.parentId);
  const project = db.projects.find((p) => p.id === task?.projectId);

  const [status, setStatus] = useState<TaskStatus>("dang_thuc_hien");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(DEMO_TODAY);
  const [content, setContent] = useState("");
  const [weather, setWeather] = useState("Nắng");
  const [labor, setLabor] = useState<LaborLine[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && task) {
      setStatus(task.status === "chua_thuc_hien" ? "dang_thuc_hien" : task.status);
      setQty("");
      setDate(DEMO_TODAY);
      setContent("");
      setWeather("Nắng");
      setLabor([
        { role: "Thợ chính", grade: "3,5/7", people: 8, workdays: 8 },
        { role: "Phụ hồ", grade: "2/7", people: 6, workdays: 6 },
      ]);
      setPhotos([]);
      setError("");
    }
  }, [open, task]);

  const q = Number(qty) || 0;
  const before = task?.actualQty ?? 0;
  const after = Math.round((before + q) * 100) / 100;
  const contract = task?.contractQty ?? 0;
  const pctBefore = contract ? before / contract : 0;
  const pctAfter = contract ? Math.min(1, after / contract) : status === "hoan_thanh" ? 1 : 0;
  const projStats = project ? getProjectStatsMap(db).get(project.id) : undefined;
  const projAfter = useMemo(() => {
    if (!projStats || !task || !projStats.planValue) return null;
    const delta = Math.min(q, Math.max(0, contract - before)) * task.unitPrice;
    return (projStats.execValue + delta) / projStats.planValue;
  }, [projStats, task, q, contract, before]);

  if (!task) return null;
  const canEdit = can("progress.update");

  const submit = (draft: boolean) => {
    if (!draft && q <= 0 && status !== "hoan_thanh") return setError("Nhập khối lượng thực hiện hôm nay (> 0)");
    if (q < 0) return setError("Khối lượng không hợp lệ");
    if (contract && after > contract * 1.1) return setError(`Lũy kế vượt quá 110% khối lượng hợp đồng (${fmtNumber(contract)} ${task.unit})`);
    const finalStatus: TaskStatus = contract && after >= contract ? "hoan_thanh" : status;
    run(
      addConstructionLog,
      { taskId: task.id, date, qty: q, shift: "Ca ngày 07:00 – 17:00", weather, content: content || `Thực hiện ${fmtNumber(q)} ${task.unit} ${task.name.toLowerCase()}`, reporterId: user!.id, status: draft ? "nhap" : "da_gui", labor, photos },
      draft ? undefined : finalStatus,
    );
    toast.success(draft ? "Đã lưu nháp nhật ký" : `Đã cập nhật tiến độ: ${fmtPct(pctBefore)} → ${fmtPct(pctAfter)}`, { description: draft ? undefined : "Tiến độ hạng mục, dự án và dashboard đã được tính lại." });
    onOpenChange(false);
  };

  const setPct = (p: number) => {
    const target = (contract * p) / 100;
    setQty(String(Math.max(0, Math.round((target - before) * 10) / 10)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <div className="text-[11px] text-slate-500">Kế hoạch thi công › {item?.name}{parent ? ` › ${parent.name}` : ""}</div>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">{task.code}</span> {task.name} <StatusBadge map={TASK_STATUS} value={task.status} />
          </DialogTitle>
        </DialogHeader>
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
              <div className="grid gap-3 sm:grid-cols-4">
                <FormField label="Ngày thực hiện"><Input type="date" value={date} max={DEMO_TODAY} onChange={(e) => setDate(e.target.value)} /></FormField>
                <FormField label="Bắt đầu thực tế"><Input value={task.actualStart ? task.actualStart.split("-").reverse().join("/") : "Chưa bắt đầu"} disabled /></FormField>
                <FormField label="Kết thúc kế hoạch"><Input value={task.plannedEnd.split("-").reverse().join("/")} disabled /></FormField>
                <FormField label="Người cập nhật"><Input value={user?.name} disabled /></FormField>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
                  <span>Tiến độ công việc (tính theo khối lượng)</span>
                  <span className="tabular font-semibold">{fmtPct(pctBefore)} → <span className="text-success-fg">{fmtPct(pctAfter)}</span></span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 my-auto h-2 rounded-full bg-success/60" style={{ width: `${pctBefore * 100}%` }} />
                  <input type="range" min={0} max={100} step={0.1} value={pctAfter * 100} disabled={!canEdit || !contract} onChange={(e) => setPct(Math.max(pctBefore * 100, Number(e.target.value)))} className="relative w-full accent-[#16A34A]" />
                </div>
              </div>
              <FormField label="Nội dung đã thực hiện / ghi chú" className="mt-3">
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="VD: Đã đổ xong 24 m³ bê tông giằng móng trục C–E, đang tưới nước bảo dưỡng. Đã lấy 3 tổ mẫu M300 gửi thí nghiệm." />
              </FormField>
            </FormSection>

            <FormSection title="Khối lượng thực hiện" right={<span className="text-[11px] text-slate-500">Đơn vị: {task.unit || "—"}</span>}>
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="Khối lượng hợp đồng"><Input value={fmtNumber(contract)} disabled /></FormField>
                <FormField label="Thực hiện hôm nay" required error={error}>
                  <Input type="number" min={0} step="0.1" autoFocus value={qty} onChange={(e) => { setQty(e.target.value); setError(""); }} className="border-success/60 font-semibold focus-visible:ring-success/20" placeholder="0" disabled={!canEdit} />
                </FormField>
                <FormField label={`Tích lũy trước đó (${fmtPct(pctBefore)})`}><Input value={fmtNumber(before)} disabled /></FormField>
                <FormField label={`Tích lũy sau khi lưu (${fmtPct(pctAfter)})`}><Input value={fmtNumber(after)} disabled className="font-semibold" /></FormField>
                <FormField label="Còn lại"><Input value={fmtNumber(Math.max(0, contract - after))} disabled /></FormField>
                <FormField label="Thời tiết"><Select value={weather} onChange={(e) => setWeather(e.target.value)} options={WEATHERS.map((w) => ({ value: w, label: w }))} /></FormField>
              </div>
              {projAfter !== null && q > 0 && (
                <div className="mt-3 rounded-md bg-success-soft px-3 py-2 text-xs text-success-fg">
                  Tiến độ dự án sẽ thay đổi: <b>{fmtPct(projStats!.actual, 2)}</b> → <b>{fmtPct(projAfter, 2)}</b> · giá trị thực hiện tăng {fmtNumber((Math.min(q, Math.max(0, contract - before)) * task.unitPrice) / 1e6)} triệu đồng
                </div>
              )}
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
        <DialogFooter className="justify-between">
          <span className="text-[11.5px] text-slate-500">Lưu nhật ký sẽ cập nhật tiến độ công việc và lũy kế toàn dự án.</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button variant="outline" onClick={() => submit(true)} disabled={!canEdit}>Lưu nháp</Button>
            <Button variant="success" onClick={() => submit(false)} disabled={!canEdit}>Lưu cập nhật</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
