import { useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, ChevronLeft, ChevronRight, ClipboardEdit, Plus } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/common/FormField";
import { NumberInput } from "@/components/ui/number-input";
import { assignShift, logShift } from "@/services/actions";
import { isVehicle, shiftMeter } from "@/services/selectors";
import { DEMO_TODAY, addDays, diffDays } from "@/utils/date";
import { fmtNumber } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Equipment, EquipmentShift, Operator } from "@/types";
import { activeProjects } from "@/utils/labels";

const SHIFTS: EquipmentShift["shift"][] = ["Ca 1", "Ca 2", "Ca 3"];
const SHIFT_TIME: Record<string, string> = { "Ca 1": "06:00 – 14:00", "Ca 2": "14:00 – 22:00", "Ca 3": "22:00 – 06:00" };
const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dow = (d: string) => new Date(d + "T00:00:00Z").getUTCDay();
const mondayOf = (d: string) => addDays(d, -((dow(d) + 6) % 7));
const monthDays = (m: string) => { const [y, mm] = m.split("-").map(Number); const n = new Date(Date.UTC(y, mm, 0)).getUTCDate(); return Array.from({ length: n }, (_, i) => `${m}-${String(i + 1).padStart(2, "0")}`); };
const shiftMonth = (m: string, k: number) => { const [y, mm] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mm - 1 + k, 1)); return d.toISOString().slice(0, 7); };
const lastName = (n: string) => n.trim().split(/\s+/).pop() ?? n;

/** Chứng chỉ / GPLX phù hợp với nhóm XMTB */
export function fitsMachine(o: Operator | undefined, e: Equipment) {
  if (!o) return true;
  const L = (o.licenses ?? []).filter((l) => !l.expiry || l.expiry >= DEMO_TODAY);
  if (["Ô tô tự đổ", "Máy tưới nước"].includes(e.group)) return L.some((l) => l.kind === "gplx" && /^(C|D|E|FC)/.test(l.name));
  const key = ({ "Máy rải bê tông": "rải", "Máy xúc đào": "xúc", "Máy xúc lật": "xúc", "Máy ủi": "ủi", "Máy lu rung": "lu", "Máy cắt khe": "", "Cần trục tháp": "cần trục", "Trạm trộn BTXM": "trạm trộn" } as Record<string, string>)[e.group];
  return !key || L.some((l) => l.kind === "chung_chi" && l.name.toLowerCase().includes(key));
}

type ChipState = "future" | "logged" | "missing";
const CHIP: Record<ChipState, string> = {
  future: "border-sky-200 bg-sky-50 text-sky-800",
  logged: "border-green-200 bg-green-50 text-green-800",
  missing: "border-amber-300 bg-amber-50 text-amber-800",
};

/** Lịch phân ca kiểu Base Shift: chọn tháng → tuần → ngày; mỗi ô ngày gồm các ca (Ca 1/2/3) với người vận hành */
export function ShiftSchedule() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const [pid, setPid] = useState("p01");
  const [view, setView] = useState<"month" | "week">("month");
  const [month, setMonth] = useState(DEMO_TODAY.slice(0, 7));
  const [week, setWeek] = useState(mondayOf(DEMO_TODAY));
  const [axis, setAxis] = useState<"eq" | "op">("eq");
  const [group, setGroup] = useState("");
  const [only, setOnly] = useState<"" | EquipmentShift["shift"]>("");
  const [cellDlg, setCellDlg] = useState<{ rowId: string; date: string } | null>(null);
  const [bulk, setBulk] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);
  const editable = can("equipment.edit") || can("progress.update");

  const days = view === "month" ? monthDays(month) : Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const from = days[0], to = days[days.length - 1];
  const machines = db.equipment.filter((e) => e.currentProjectId === pid && e.status !== "ngung" && (!group || e.group === group));
  const eqIds = new Set(machines.map((e) => e.id));
  const shifts = useMemo(() => db.equipmentShifts.filter((s) => s.projectId === pid && eqIds.has(s.equipmentId) && s.date >= from && s.date <= to && (!only || s.shift === only)), [db.equipmentShifts, pid, from, to, only, machines.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const opIds = [...new Set([...shifts.map((s) => s.operatorId), ...machines.map((e) => e.operatorId).filter(Boolean) as string[]])];
  const opsRows = db.operators.filter((o) => opIds.includes(o.id)).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const opName = (id: string | null) => db.operators.find((o) => o.id === id)?.name ?? db.users.find((u) => u.id === id)?.name ?? "";
  const eqOf = (id: string) => db.equipment.find((e) => e.id === id);
  const busy = (s: EquipmentShift) => db.equipmentShifts.some((x) => x.id !== s.id && x.operatorId === s.operatorId && x.date === s.date && x.shift === s.shift);
  const warn = (s: EquipmentShift) => busy(s) || !fitsMachine(db.operators.find((o) => o.id === s.operatorId), eqOf(s.equipmentId)!);
  const state = (s: EquipmentShift): ChipState => (s.logged !== false ? "logged" : s.date < DEMO_TODAY ? "missing" : "future");
  const pending = db.equipmentShifts.filter((s) => s.projectId === pid && s.logged === false && s.date < DEMO_TODAY).length;
  const groups = [...new Set(db.equipment.filter((e) => e.currentProjectId === pid).map((e) => e.group))];
  const rows = axis === "eq" ? machines.map((e) => ({ id: e.id, title: e.code, sub: e.name })) : opsRows.map((o) => ({ id: o.id, title: o.name, sub: o.code }));
  const inCell = (rowId: string, d: string) => shifts.filter((s) => s.date === d && (axis === "eq" ? s.equipmentId === rowId : s.operatorId === rowId)).sort((a, b) => a.shift.localeCompare(b.shift));
  const compact = view === "month";
  const colW = compact ? 76 : 150;
  const logS = db.equipmentShifts.find((s) => s.id === logId);

  const nav = (k: number) => (view === "month" ? setMonth(shiftMonth(month, k)) : setWeek(addDays(week, 7 * k)));
  const title = view === "month" ? `T${Number(month.slice(5))}/${month.slice(0, 4)}` : `Tuần ${from.slice(8, 10)}/${from.slice(5, 7)} – ${to.slice(8, 10)}/${to.slice(5, 7)}/${to.slice(0, 4)}`;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Select className="w-52" value={pid} onChange={(e) => setPid(e.target.value)} options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />
        <div className="flex rounded-md border p-0.5">
          {(["month", "week"] as const).map((v) => <button key={v} onClick={() => { setView(v); if (v === "week") setWeek(mondayOf(month === DEMO_TODAY.slice(0, 7) ? DEMO_TODAY : `${month}-01`)); else setMonth(week.slice(0, 7)); }} className={cn("rounded px-3 py-1 text-[13px] font-medium", view === v ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50")}>{v === "month" ? "Tháng" : "Tuần"}</button>)}
        </div>
        <div className="flex items-center rounded-md border">
          <Button size="icon-sm" variant="ghost" onClick={() => nav(-1)} aria-label="Trước"><ChevronLeft /></Button>
          <span className="min-w-[110px] px-2 text-center text-[14px] font-bold">{title}</span>
          <Button size="icon-sm" variant="ghost" onClick={() => nav(1)} aria-label="Sau"><ChevronRight /></Button>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { setMonth(DEMO_TODAY.slice(0, 7)); setWeek(mondayOf(DEMO_TODAY)); }}>Hôm nay</Button>
        <div className="flex rounded-md border p-0.5">
          {(["eq", "op"] as const).map((a) => <button key={a} onClick={() => setAxis(a)} className={cn("rounded px-3 py-1 text-[13px] font-medium", axis === a ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50")}>{a === "eq" ? "Theo XMTB" : "Theo nhân viên"}</button>)}
        </div>
        <Select className="w-40" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Tất cả nhóm XMTB" options={groups.map((g) => ({ value: g, label: g }))} />
        <Select className="w-32" value={only} onChange={(e) => setOnly(e.target.value as typeof only)} placeholder="Tất cả ca" options={SHIFTS.map((s) => ({ value: s, label: `${s} (${SHIFT_TIME[s]})` }))} />
        <div className="ml-auto flex items-center gap-2">
          {pending > 0 && <span className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[12.5px] font-medium text-amber-800">{pending} ca chưa nhập nhật trình</span>}
          {editable && <Button onClick={() => setBulk(true)}><CalendarRange /> Phân ca hàng loạt</Button>}
        </div>
      </div>

      <div className="scrollbar-visible overflow-x-auto">
        <table className="table-fixed border-separate border-spacing-0 text-[12.5px]" style={{ width: 240 + days.length * colW }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-[3] w-[240px] border-b border-r bg-slate-100 px-3 py-2.5 text-left text-[12px] font-bold uppercase text-slate-700">{axis === "eq" ? "XMTB tại dự án" : "Nhân viên CMKT"}</th>
              {days.map((d) => {
                const wk = dow(d) === 0 || dow(d) === 6;
                return <th key={d} style={{ width: colW }} className={cn("border-b border-r px-1 py-2 text-center text-[11.5px] font-semibold", d === DEMO_TODAY ? "bg-primary text-white" : wk ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-700")}>{DOW[dow(d)]}<br />{d.slice(8, 10)}{!compact && `/${d.slice(5, 7)}`}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const mine = shifts.filter((s) => (axis === "eq" ? s.equipmentId === r.id : s.operatorId === r.id));
              const e = axis === "eq" ? eqOf(r.id) : undefined;
              const meter = mine.filter((s) => s.logged !== false).reduce((x, s) => x + (axis === "eq" ? shiftMeter(e, s) : s.hours), 0);
              return (
                <tr key={r.id}>
                  <td className="sticky left-0 z-[2] border-b border-r bg-white px-3 py-2 align-top">
                    <div className="truncate font-semibold text-slate-900">{r.title}</div>
                    <div className="truncate text-[11.5px] text-slate-500">{r.sub}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{mine.length} ca · {fmtNumber(meter, 0)} {e && isVehicle(e) ? "km" : "giờ"}</div>
                  </td>
                  {days.map((d) => {
                    const list = inCell(r.id, d);
                    const wk = dow(d) === 0 || dow(d) === 6;
                    return (
                      <td key={d} onClick={() => editable && setCellDlg({ rowId: r.id, date: d })} className={cn("cursor-pointer border-b border-r p-1 align-top hover:bg-sky-50/60", d === DEMO_TODAY && "bg-primary-soft/40", wk && d !== DEMO_TODAY && "bg-rose-50/30")}>
                        <div className="flex min-h-[44px] flex-col gap-0.5">
                          {list.map((s) => (
                            <span key={s.id} title={`${s.shift} (${SHIFT_TIME[s.shift]}) · ${opName(s.operatorId)} · ${eqOf(s.equipmentId)?.code}${s.logged !== false ? ` · nhật trình ${fmtNumber(s.hours)} giờ` : s.date < DEMO_TODAY ? " · chưa nhập nhật trình" : ""}${busy(s) ? " · TRÙNG CA" : ""}`}
                              className={cn("truncate rounded border px-1 py-px text-[11px] font-medium leading-4", CHIP[state(s)], warn(s) && "ring-1 ring-rose-500")}>
                              {compact ? `${s.shift.slice(3)}·${axis === "eq" ? lastName(opName(s.operatorId)) : eqOf(s.equipmentId)?.code.split(".").pop()}` : `${s.shift} · ${axis === "eq" ? opName(s.operatorId) : eqOf(s.equipmentId)?.code}`}
                            </span>
                          ))}
                          {!list.length && editable && <span className="m-auto text-slate-300 opacity-0 hover:opacity-100"><Plus className="h-3.5 w-3.5" /></span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={days.length + 1} className="py-10 text-center text-sm text-slate-400">{axis === "eq" ? "Dự án chưa có XMTB được điều động về." : "Chưa có nhân viên được phân ca trong kỳ."}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t px-4 py-2 text-[12px] text-slate-600">
        <span className="flex items-center gap-1.5"><span className={cn("h-3 w-5 rounded border", CHIP.future)} />Đã phân, chưa đến ca</span>
        <span className="flex items-center gap-1.5"><span className={cn("h-3 w-5 rounded border", CHIP.logged)} />Đã nhập nhật trình</span>
        <span className="flex items-center gap-1.5"><span className={cn("h-3 w-5 rounded border", CHIP.missing)} />Ca đã qua, chưa nhập nhật trình</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded border ring-1 ring-rose-500" />Trùng người / chưa có chứng chỉ phù hợp</span>
        <span className="ml-auto text-slate-400">Bấm vào ô ngày để phân ca, đổi người hoặc nhập nhật trình</span>
      </div>

      <CellDialog cell={cellDlg} axis={axis} pid={pid} onClose={() => setCellDlg(null)} onLog={(id) => { setCellDlg(null); setLogId(id); }} />
      <BulkDialog open={bulk} onOpenChange={setBulk} pid={pid} machines={machines} defFrom={DEMO_TODAY > from ? DEMO_TODAY : from} defTo={to} />
      <LogDialog shift={logS ?? null} onClose={() => setLogId(null)} onSave={(data) => { run(logShift, logId!, data); toast.success("Đã cập nhật nhật trình ca"); setLogId(null); }} opName={opName} />
    </Card>
  );
}

/** Popup phân ca một ô (1 máy hoặc 1 người × 1 ngày): tick ca và chọn người / máy cho từng ca */
function CellDialog({ cell, axis, pid, onClose, onLog }: { cell: { rowId: string; date: string } | null; axis: "eq" | "op"; pid: string; onClose: () => void; onLog: (id: string) => void }) {
  const { db, run } = useDb();
  if (!cell) return null;
  const machines = db.equipment.filter((e) => e.currentProjectId === pid && e.status !== "ngung");
  const e = axis === "eq" ? db.equipment.find((x) => x.id === cell.rowId) : undefined;
  const op = axis === "op" ? db.operators.find((x) => x.id === cell.rowId) : undefined;
  const existing = (sh: EquipmentShift["shift"]) => db.equipmentShifts.find((s) => s.date === cell.date && s.shift === sh && (axis === "eq" ? s.equipmentId === cell.rowId : s.operatorId === cell.rowId));
  const set = (sh: EquipmentShift["shift"], val: string) => {
    if (axis === "eq") {
      run(assignShift, cell.rowId, pid, cell.date, sh, val || null);
      if (val && db.equipmentShifts.some((x) => x.operatorId === val && x.date === cell.date && x.shift === sh && x.equipmentId !== cell.rowId)) toast.warning(`${db.operators.find((o) => o.id === val)?.name} đã có ${sh} ở máy khác`);
    } else {
      const cur = existing(sh);
      if (cur && cur.equipmentId !== val) run(assignShift, cur.equipmentId, pid, cell.date, sh, null);
      if (val) run(assignShift, val, pid, cell.date, sh, cell.rowId);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Phân ca · {DOW[dow(cell.date)]} {cell.date.split("-").reverse().join("/")}</DialogTitle><DialogDescription>{e ? `${e.code} – ${e.name}` : op?.name}</DialogDescription></DialogHeader>
        <DialogBody className="space-y-2.5">
          {SHIFTS.map((sh) => {
            const s = existing(sh);
            const done = s && s.logged !== false;
            return (
              <div key={sh} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <div className="w-28 shrink-0"><div className="text-[13px] font-semibold">{sh}</div><div className="text-[11px] text-slate-500">{SHIFT_TIME[sh]}</div></div>
                <select disabled={done} value={axis === "eq" ? s?.operatorId ?? "" : s?.equipmentId ?? ""} onChange={(ev) => set(sh, ev.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-[13px] disabled:bg-slate-50">
                  <option value="">— Không phân ca —</option>
                  {axis === "eq"
                    ? db.operators.map((o) => <option key={o.id} value={o.id}>{o.name}{e && !fitsMachine(o, e) ? " (chưa có CC phù hợp)" : ""}</option>)
                    : machines.map((m) => <option key={m.id} value={m.id}>{m.code} – {m.name}{!fitsMachine(op, m) ? " (chưa có CC phù hợp)" : ""}</option>)}
                </select>
                {s && cell.date <= DEMO_TODAY && <Button size="xs" variant={done ? "soft" : "outline"} onClick={() => onLog(s.id)}><ClipboardEdit /> {done ? "Sửa nhật trình" : "Nhập nhật trình"}</Button>}
              </div>
            );
          })}
          {SHIFTS.some((sh) => { const s = existing(sh); return s && db.equipmentShifts.some((x) => x.id !== s.id && x.operatorId === s.operatorId && x.date === s.date && x.shift === s.shift); }) && <div className="flex items-center gap-1.5 text-[12px] text-rose-600"><AlertTriangle className="h-3.5 w-3.5" />Có ca bị trùng người vận hành.</div>}
        </DialogBody>
        <DialogFooter><Button onClick={onClose}>Xong</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Phân ca hàng loạt: nhiều máy × 1 người × các ca × khoảng ngày × các thứ trong tuần */
function BulkDialog({ open, onOpenChange, pid, machines, defFrom, defTo }: { open: boolean; onOpenChange: (o: boolean) => void; pid: string; machines: Equipment[]; defFrom: string; defTo: string }) {
  const { db, run } = useDb();
  const [eqs, setEqs] = useState<string[]>([]);
  const [opId, setOpId] = useState("");
  const [sh, setSh] = useState<EquipmentShift["shift"][]>(["Ca 1"]);
  const [range, setRange] = useState({ from: defFrom, to: defTo });
  const [wd, setWd] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [key, setKey] = useState(false);
  if (open && !key) { setKey(true); setEqs([]); setOpId(""); setSh(["Ca 1"]); setRange({ from: defFrom, to: defTo }); setWd([1, 2, 3, 4, 5, 6]); }
  if (!open && key) setKey(false);
  const tog = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const save = () => {
    if (!eqs.length || !opId || !sh.length) return toast.error("Chọn máy, người vận hành và ca");
    if (range.to < range.from) return toast.error("Khoảng ngày không hợp lệ");
    let n = 0, skip = 0;
    for (let i = 0; i <= diffDays(range.from, range.to); i++) {
      const d = addDays(range.from, i);
      if (!wd.includes(dow(d))) continue;
      eqs.forEach((eid) => sh.forEach((s) => {
        const cur = db.equipmentShifts.find((x) => x.equipmentId === eid && x.date === d && x.shift === s);
        if (cur && cur.logged !== false) { skip++; return; }
        run(assignShift, eid, pid, d, s, opId); n++;
      }));
    }
    toast.success(`Đã phân ${n} ca`, { description: skip ? `Bỏ qua ${skip} ca đã có nhật trình` : undefined });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Phân ca hàng loạt</DialogTitle><DialogDescription>Ví dụ: máy M24.0092, anh Bảy, Ca 1, T2–T7 cả tháng</DialogDescription></DialogHeader>
        <DialogBody className="space-y-3">
          <FormField label="XMTB" required>
            <div className="grid max-h-40 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
              {machines.map((m) => <label key={m.id} className="flex cursor-pointer items-center gap-2 text-[13px]"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={eqs.includes(m.id)} onChange={() => setEqs(tog(eqs, m.id))} /><span className="truncate"><b>{m.code}</b> {m.name}</span></label>)}
            </div>
          </FormField>
          <FormField label="Người vận hành" required><Select value={opId} onChange={(e) => setOpId(e.target.value)} placeholder="— Chọn nhân viên CMKT —" options={db.operators.map((o) => ({ value: o.id, label: o.name }))} /></FormField>
          <FormField label="Ca" required><div className="flex gap-3">{SHIFTS.map((s) => <label key={s} className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={sh.includes(s)} onChange={() => setSh(tog(sh, s))} />{s} <span className="text-[11px] text-slate-500">{SHIFT_TIME[s]}</span></label>)}</div></FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Từ ngày"><Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></FormField>
            <FormField label="Đến ngày"><Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></FormField>
          </div>
          <FormField label="Lặp vào các thứ"><div className="flex flex-wrap gap-1.5">{[1, 2, 3, 4, 5, 6, 0].map((k) => <button key={k} type="button" onClick={() => setWd(tog(wd, k))} className={cn("h-8 w-10 rounded-md border text-[12.5px] font-medium", wd.includes(k) ? "border-primary bg-primary text-white" : "text-slate-600 hover:bg-slate-50")}>{DOW[k]}</button>)}</div></FormField>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={save}>Phân ca</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogDialog({ shift, onClose, onSave, opName }: { shift: EquipmentShift | null; onClose: () => void; onSave: (d: { hours: number; km: number; fuelLiters: number; output: string; note: string }) => void; opName: (id: string) => string }) {
  const { db } = useDb();
  const [f, setF] = useState({ hours: 8, km: 0, fuelLiters: 0, output: "", note: "" });
  const e = db.equipment.find((x) => x.id === shift?.equipmentId);
  const [key, setKey] = useState("");
  if (shift && key !== shift.id) { setKey(shift.id); setF({ hours: shift.logged ? shift.hours : 8, km: shift.km ?? 0, fuelLiters: shift.logged ? shift.fuelLiters : e && e.kind !== "may_thiet_bi" ? 0 : Math.round((e?.fuelNorm ?? 0) * 8), output: shift.output, note: shift.note }); }
  const vehicle = e?.kind !== "may_thiet_bi";
  const norm = vehicle ? ((e?.fuelNorm ?? 0) * f.km) / 100 : (e?.fuelNorm ?? 0) * f.hours;
  const over = norm > 0 && f.fuelLiters > norm * 1.08;
  return (
    <Dialog open={!!shift} onOpenChange={(o) => { if (!o) { onClose(); setKey(""); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nhật trình ca – {e?.code}</DialogTitle><DialogDescription>{shift?.shift} ngày {shift?.date.split("-").reverse().join("/")} · Người vận hành: {shift ? opName(shift.operatorId) : ""}</DialogDescription></DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          <FormField label="Giờ máy hoạt động (giờ)" required><NumberInput value={f.hours} onChange={(v) => setF({ ...f, hours: v })} /></FormField>
          {vehicle ? <FormField label="Số km đã chạy" required hint="Cộng vào đồng hồ km để tính bảo dưỡng"><NumberInput value={f.km} onChange={(v) => setF({ ...f, km: v })} /></FormField> : <div />}
          <FormField label="Nhiên liệu sử dụng (lít)" hint={`Định mức ${fmtNumber(norm, 0)} lít (${e?.fuelNorm ?? 0} ${vehicle ? "lít/100 km" : "lít/giờ"})`} error={over ? `Vượt định mức ${Math.round((f.fuelLiters / norm - 1) * 100)}%` : undefined}><NumberInput value={f.fuelLiters} onChange={(v) => setF({ ...f, fuelLiters: v })} /></FormField>
          <FormField label="Khối lượng làm được"><Input value={f.output} placeholder={vehicle ? "VD: 12 chuyến" : "VD: 320 m³"} onChange={(ev) => setF({ ...f, output: ev.target.value })} /></FormField>
          <FormField label="Ghi chú / sự cố trong ca" className="sm:col-span-2"><Textarea rows={2} value={f.note} onChange={(ev) => setF({ ...f, note: ev.target.value })} /></FormField>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => { onClose(); setKey(""); }}>Hủy</Button><Button onClick={() => { if (!(f.hours > 0)) return toast.error("Nhập giờ máy"); if (vehicle && !(f.km > 0)) return toast.error("Nhập số km đã chạy"); onSave(f); setKey(""); }}>Lưu nhật trình</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
