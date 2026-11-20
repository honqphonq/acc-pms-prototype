import { useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardEdit } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tip } from "@/components/ui/tooltip";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/common/FormField";
import { NumberInput } from "@/components/ui/number-input";
import { assignShift, logShift } from "@/services/actions";
import { DEMO_TODAY, addDays } from "@/utils/date";
import { fmtNumber } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Equipment, EquipmentShift, Operator } from "@/types";
import { activeProjects } from "@/utils/labels";

const SHIFTS: EquipmentShift["shift"][] = ["Ca 1", "Ca 2", "Ca 3"];
const SHIFT_TIME: Record<string, string> = { "Ca 1": "06:00 – 14:00", "Ca 2": "14:00 – 22:00", "Ca 3": "22:00 – 06:00" };
const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const mondayOf = (d: string) => { const x = new Date(d + "T00:00:00Z"); const k = (x.getUTCDay() + 6) % 7; return addDays(d, -k); };

/** Chứng chỉ / GPLX phù hợp với nhóm XMTB */
export function fitsMachine(o: Operator | undefined, e: Equipment) {
  if (!o) return true;
  const L = (o.licenses ?? []).filter((l) => !l.expiry || l.expiry >= DEMO_TODAY);
  if (["Ô tô tự đổ", "Máy tưới nước"].includes(e.group)) return L.some((l) => l.kind === "gplx" && /^(C|D|E|FC)/.test(l.name));
  const key = ({ "Máy rải bê tông": "rải", "Máy xúc": "xúc", "Máy ủi": "ủi", "Máy lu rung": "lu", "Máy cắt khe": "", "Cần trục tháp": "cần trục", "Trạm trộn BTXM": "trạm trộn" } as Record<string, string>)[e.group];
  return !key || L.some((l) => l.kind === "chung_chi" && l.name.toLowerCase().includes(key));
}

/** Lịch phân ca: máy tại dự án × ngày; mỗi ca 1 nhân viên CMKT vận hành */
export function ShiftSchedule() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const [pid, setPid] = useState("p01");
  const [week, setWeek] = useState(mondayOf(DEMO_TODAY));
  const [shift, setShift] = useState<EquipmentShift["shift"]>("Ca 1");
  const [logId, setLogId] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const machines = db.equipment.filter((e) => e.currentProjectId === pid && e.status !== "ngung");
  const ops = db.operators;
  const opName = (id: string | null) => ops.find((o) => o.id === id)?.name ?? db.users.find((u) => u.id === id)?.name ?? "";
  const cell = (e: Equipment, d: string) => db.equipmentShifts.find((s) => s.equipmentId === e.id && s.date === d && s.shift === shift);
  const busy = (opId: string, d: string, exceptEq: string) => db.equipmentShifts.some((s) => s.operatorId === opId && s.date === d && s.shift === shift && s.equipmentId !== exceptEq);
  const editable = can("equipment.edit") || can("progress.update");
  const pending = db.equipmentShifts.filter((s) => s.projectId === pid && s.logged === false && s.date <= DEMO_TODAY).length;
  const logS = db.equipmentShifts.find((s) => s.id === logId);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Select className="w-56" value={pid} onChange={(e) => setPid(e.target.value)} options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />
        <div className="flex items-center rounded-md border">
          <Button size="icon-sm" variant="ghost" onClick={() => setWeek(addDays(week, -7))}><ChevronLeft /></Button>
          <span className="px-2 text-[13px] font-semibold">Tuần {days[0].slice(8, 10)}/{days[0].slice(5, 7)} – {days[6].slice(8, 10)}/{days[6].slice(5, 7)}/{days[6].slice(0, 4)}</span>
          <Button size="icon-sm" variant="ghost" onClick={() => setWeek(addDays(week, 7))}><ChevronRight /></Button>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setWeek(mondayOf(DEMO_TODAY))}>Tuần này</Button>
        <div className="flex rounded-md border p-0.5">
          {SHIFTS.map((s) => <button key={s} onClick={() => setShift(s)} className={cn("rounded px-3 py-1 text-[13px] font-medium", shift === s ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50")}>{s} <span className="text-[11px] opacity-75">{SHIFT_TIME[s]}</span></button>)}
        </div>
        {pending > 0 && <span className="ml-auto rounded-md bg-amber-50 px-2.5 py-1.5 text-[12.5px] font-medium text-amber-800">{pending} ca chưa cập nhật nhật trình</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1150px] table-fixed text-[13px]">
          <thead className="bg-slate-100/80 text-[12px] font-bold uppercase tracking-wide text-slate-800">
            <tr><th className="w-56 px-4 py-3 text-left">XMTB tại dự án</th>{days.map((d) => <th key={d} className={cn("w-[132px] px-2 py-3 text-center", d === DEMO_TODAY && "bg-primary-soft text-primary")}>{DOW[new Date(d + "T00:00:00Z").getUTCDay()]} {d.slice(8, 10)}/{d.slice(5, 7)}</th>)}</tr>
          </thead>
          <tbody>
            {machines.map((e) => (
              <tr key={e.id} className="border-t border-slate-200/80">
                <td className="px-4 py-2"><div className="font-semibold">{e.code}</div><div className="text-[12px] text-slate-500">{e.name}</div></td>
                {days.map((d) => {
                  const s = cell(e, d);
                  const op = ops.find((o) => o.id === s?.operatorId);
                  const conflict = !!s?.operatorId && busy(s.operatorId, d, e.id);
                  const misfit = !!op && !fitsMachine(op, e);
                  const sunday = new Date(d + "T00:00:00Z").getUTCDay() === 0;
                  return (
                    <td key={d} className={cn("px-1.5 py-1.5 align-top", d === DEMO_TODAY && "bg-primary-soft/40", sunday && "bg-slate-50")}>
                      {s?.logged ? (
                        <Tip content={`Nhật trình: ${fmtNumber(s.hours)} giờ${s.km ? ` · ${s.km} km` : ""} · ${fmtNumber(s.fuelLiters)} lít${s.output ? ` · ${s.output}` : ""}`}>
                          <button onClick={() => editable && setLogId(s.id)} className="w-full rounded-md border border-green-200 bg-green-50 px-2 py-1 text-left">
                            <div className="truncate text-[12px] font-semibold text-green-800">{opName(s.operatorId)}</div>
                            <div className="text-[11px] text-green-700">✓ {fmtNumber(s.hours)} giờ · {fmtNumber(s.fuelLiters, 0)} lít</div>
                          </button>
                        </Tip>
                      ) : (
                        <div className={cn("rounded-md border px-1 py-1", s ? (conflict ? "border-rose-400 bg-rose-50" : "border-sky-200 bg-sky-50") : "border-dashed border-slate-200")}>
                          <select disabled={!editable} value={s?.operatorId ?? ""} onChange={(ev) => { run(assignShift, e.id, pid, d, shift, ev.target.value || null); if (ev.target.value && busy(ev.target.value, d, e.id)) toast.warning(`${opName(ev.target.value)} đã được xếp ${shift} ngày ${d.slice(8, 10)}/${d.slice(5, 7)} ở máy khác`); }} className="w-full truncate bg-transparent text-[12px] font-medium text-slate-800 outline-none">
                            <option value="">— Chưa phân ca —</option>
                            {ops.map((o) => <option key={o.id} value={o.id}>{o.name}{fitsMachine(o, e) ? "" : " (chưa có CC phù hợp)"}</option>)}
                          </select>
                          {(conflict || misfit) && <div className="mt-0.5 flex items-center gap-1 text-[10.5px] font-medium text-rose-600"><AlertTriangle className="h-3 w-3" />{conflict ? "Trùng ca" : "Chưa có CC phù hợp"}</div>}
                          {s && d <= DEMO_TODAY && editable && <button onClick={() => setLogId(s.id)} className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"><ClipboardEdit className="h-3 w-3" />Nhập nhật trình</button>}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!machines.length && <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">Dự án chưa có XMTB được điều động về.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="border-t px-4 py-2 text-[12px] text-slate-500">Mỗi ô là 1 ca của 1 máy; chọn nhân viên CMKT vận hành. Hệ thống cảnh báo khi xếp trùng người trong cùng ca, hoặc người chưa có chứng chỉ / GPLX còn hạn phù hợp với nhóm XMTB. Hết ca bấm “Nhập nhật trình”.</p>
      <LogDialog shift={logS ?? null} onClose={() => setLogId(null)} onSave={(data) => { run(logShift, logId!, data); toast.success("Đã cập nhật nhật trình ca"); setLogId(null); }} opName={opName} />
    </Card>
  );
}

function LogDialog({ shift, onClose, onSave, opName }: { shift: EquipmentShift | null; onClose: () => void; onSave: (d: { hours: number; km: number; fuelLiters: number; output: string; note: string }) => void; opName: (id: string) => string }) {
  const { db } = useDb();
  const [f, setF] = useState({ hours: 8, km: 0, fuelLiters: 0, output: "", note: "" });
  const e = db.equipment.find((x) => x.id === shift?.equipmentId);
  const [key, setKey] = useState("");
  if (shift && key !== shift.id) { setKey(shift.id); setF({ hours: shift.logged ? shift.hours : 8, km: shift.km ?? 0, fuelLiters: shift.logged ? shift.fuelLiters : Math.round((e?.fuelNorm ?? 0) * 8), output: shift.output, note: shift.note }); }
  const norm = (e?.fuelNorm ?? 0) * f.hours;
  const over = norm > 0 && f.fuelLiters > norm * 1.08;
  const vehicle = e?.kind !== "may_thiet_bi";
  return (
    <Dialog open={!!shift} onOpenChange={(o) => { if (!o) { onClose(); setKey(""); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nhật trình ca – {e?.code}</DialogTitle><DialogDescription>{shift?.shift} ngày {shift?.date.split("-").reverse().join("/")} · Người vận hành: {shift ? opName(shift.operatorId) : ""}</DialogDescription></DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          <FormField label="Giờ máy hoạt động (giờ)" required><NumberInput value={f.hours} onChange={(v) => setF({ ...f, hours: v })} /></FormField>
          {vehicle ? <FormField label="Số km đã chạy"><NumberInput value={f.km} onChange={(v) => setF({ ...f, km: v })} /></FormField> : <div />}
          <FormField label="Nhiên liệu sử dụng (lít)" hint={`Định mức ${fmtNumber(norm, 0)} lít (${e?.fuelNorm ?? 0} lít/giờ)`} error={over ? `Vượt định mức ${Math.round((f.fuelLiters / norm - 1) * 100)}%` : undefined}><NumberInput value={f.fuelLiters} onChange={(v) => setF({ ...f, fuelLiters: v })} /></FormField>
          <FormField label="Khối lượng làm được"><Input value={f.output} placeholder={vehicle ? "VD: 12 chuyến" : "VD: 320 m³"} onChange={(ev) => setF({ ...f, output: ev.target.value })} /></FormField>
          <FormField label="Ghi chú / sự cố trong ca" className="sm:col-span-2"><Textarea rows={2} value={f.note} onChange={(ev) => setF({ ...f, note: ev.target.value })} /></FormField>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => { onClose(); setKey(""); }}>Hủy</Button><Button onClick={() => { if (!(f.hours > 0)) return toast.error("Nhập giờ máy"); onSave(f); setKey(""); }}>Lưu nhật trình</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
