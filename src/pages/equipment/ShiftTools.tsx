import { useState } from "react";
import { Plus, RotateCcw, UserX } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { logShift } from "@/services/actions";
import { genId } from "@/utils/id";
import { isVehicle, shiftFuelNorm } from "@/services/selectors";
import { DEMO_TODAY } from "@/utils/date";
import { fmtNumber } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Database, ShiftType } from "@/types";

/** Lưu danh mục ca; đổi tên ca thì cập nhật luôn các ca đã phân */
function saveShiftTypes(db: Database, list: ShiftType[]): Database {
  const renamed = new Map<string, string>();
  (db.shiftTypes ?? []).forEach((o) => { const n = list.find((x) => x.id === o.id); if (n && n.name !== o.name) renamed.set(o.name, n.name); });
  return { ...db, shiftTypes: list, equipmentShifts: renamed.size ? db.equipmentShifts.map((s) => (renamed.has(s.shift) ? { ...s, shift: renamed.get(s.shift)! } : s)) : db.equipmentShifts };
}

const hoursBetween = (a: string, b: string) => { const [h1, m1] = a.split(":").map(Number); const [h2, m2] = b.split(":").map(Number); let d = h2 * 60 + m2 - (h1 * 60 + m1); if (d <= 0) d += 24 * 60; return Math.round((d / 60) * 10) / 10; };

/** Cấu hình ca làm việc – danh sách ca mẫu dùng chung cho tất cả dự án */
export function ShiftConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { db, run } = useDb();
  const [list, setList] = useState<ShiftType[]>([]);
  const [key, setKey] = useState(false);
  if (open && !key) { setKey(true); setList((db.shiftTypes ?? []).map((t) => ({ ...t }))); }
  if (!open && key) setKey(false);
  const upd = (id: string, c: Partial<ShiftType>) => setList((l) => l.map((t) => (t.id === id ? { ...t, ...c, ...(c.start || c.end ? { hours: hoursBetween(c.start ?? t.start, c.end ?? t.end) } : {}) } : t)));
  const used = (name: string) => db.equipmentShifts.filter((s) => s.shift === name).length;
  const save = () => {
    const names = list.map((t) => t.name.trim());
    if (names.some((n) => !n)) return toast.error("Nhập tên ca");
    if (new Set(names).size !== names.length) return toast.error("Tên ca bị trùng");
    if (!list.some((t) => t.active)) return toast.error("Cần ít nhất 1 ca đang dùng");
    run(saveShiftTypes, list.map((t) => ({ ...t, name: t.name.trim(), short: t.short.trim() || t.name.trim().slice(0, 2) })));
    toast.success("Đã lưu cấu hình ca", { description: "Áp dụng cho lịch phân ca của tất cả dự án" });
    onOpenChange(false);
  };
  const th = "px-2 py-2 text-left text-[11.5px] font-semibold uppercase text-slate-500";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Cấu hình ca làm việc</DialogTitle><DialogDescription>Danh sách ca mẫu dùng chung cho tất cả dự án. Ca ngừng dùng vẫn giữ trong lịch sử, chỉ không phân ca mới.</DialogDescription></DialogHeader>
        <DialogBody>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[780px] text-[13px]">
              <thead className="border-b bg-slate-50"><tr><th className={th}>Tên ca</th><th className={th}>Nhãn</th><th className={th}>Bắt đầu</th><th className={th}>Kết thúc</th><th className={cn(th, "text-right")}>Giờ công</th><th className={cn(th, "text-center")}>Đang dùng</th><th className={th} /></tr></thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id} className={cn("border-b last:border-0", !t.active && "bg-slate-50/70 text-slate-400")}>
                    <td className="min-w-[180px] p-1.5"><Input value={t.name} onChange={(e) => upd(t.id, { name: e.target.value })} className="h-9" /></td>
                    <td className="w-20 p-1.5"><Input value={t.short} maxLength={3} onChange={(e) => upd(t.id, { short: e.target.value })} className="h-9" /></td>
                    <td className="w-36 p-1.5"><Input type="time" value={t.start} onChange={(e) => upd(t.id, { start: e.target.value })} className="h-9" /></td>
                    <td className="w-36 p-1.5"><Input type="time" value={t.end} onChange={(e) => upd(t.id, { end: e.target.value })} className="h-9" /></td>
                    <td className="w-24 p-1.5"><Input type="number" step="0.5" value={t.hours} onChange={(e) => upd(t.id, { hours: Number(e.target.value) })} className="h-9 text-right" /></td>
                    <td className="w-24 p-1.5 text-center"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={t.active} onChange={(e) => upd(t.id, { active: e.target.checked })} /></td>
                    <td className="w-28 p-1.5 text-right text-[11.5px] text-slate-400">
                      {used(t.name) ? `${used(t.name)} ca đã phân` : <button className="text-rose-500 hover:underline" onClick={() => setList((l) => l.filter((x) => x.id !== t.id))}>Xóa</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="soft" size="sm" className="mt-3" onClick={() => setList((l) => [...l, { id: genId("ca"), name: `Ca mới ${l.length + 1}`, short: String(l.length + 1), start: "07:00", end: "11:00", hours: 4, active: true }])}><Plus /> Thêm ca</Button>
          <p className="mt-2 text-[12px] text-slate-500">Giờ công tự tính theo giờ bắt đầu – kết thúc (sửa được nếu có nghỉ giữa ca). Ca đêm qua ngày hôm sau, ví dụ 22:00 – 06:00, vẫn tính đúng 8 giờ.</p>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={save}>Lưu cấu hình</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Row = { hours: string; km: string; fuel: string | null; output: string; note: string; skip: boolean };

/** Tổ trưởng nhập nhật trình hàng loạt cho tất cả ca đã phân trong 1 ngày tại 1 dự án */
export function BulkLogDialog({ open, onOpenChange, pid }: { open: boolean; onOpenChange: (o: boolean) => void; pid: string }) {
  const { db, run } = useDb();
  const lastPending = db.equipmentShifts.filter((s) => s.projectId === pid && s.logged === false && s.date <= DEMO_TODAY).map((s) => s.date).sort().pop() ?? DEMO_TODAY;
  const [date, setDate] = useState(DEMO_TODAY);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [key, setKey] = useState("");
  const k = open ? `${pid}|${date}` : "";
  const typeOf = (name: string) => (db.shiftTypes ?? []).find((t) => t.name === name);
  const order = (name: string) => { const i = (db.shiftTypes ?? []).findIndex((t) => t.name === name); return i < 0 ? 99 : i; };
  const eqOf = (id: string) => db.equipment.find((e) => e.id === id);
  const list = db.equipmentShifts.filter((s) => s.projectId === pid && s.date === date).sort((a, b) => (eqOf(a.equipmentId)?.code ?? "").localeCompare(eqOf(b.equipmentId)?.code ?? "") || order(a.shift) - order(b.shift));
  if (open && !key) { setKey("init"); setDate(lastPending); return null; }
  if (!open && key) setKey("");
  if (open && key !== k && key !== "") {
    const init: Record<string, Row> = {};
    list.forEach((s) => {
      const skipped = s.logged === true && s.hours === 0 && (s.km ?? 0) === 0;
      init[s.id] = s.logged ? { hours: String(s.hours), km: s.km ? String(s.km) : "", fuel: String(s.fuelLiters), output: s.output, note: skipped ? "" : s.note, skip: skipped } : { hours: String(typeOf(s.shift)?.hours ?? 8), km: "", fuel: null, output: "", note: "", skip: false };
    });
    setRows(init); setKey(k);
  }
  const opName = (id: string) => db.operators.find((o) => o.id === id)?.name ?? db.users.find((u) => u.id === id)?.name ?? "—";
  const set = (id: string, c: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...c } }));
  const normOf = (id: string, r: Row) => shiftFuelNorm(eqOf(db.equipmentShifts.find((s) => s.id === id)!.equipmentId), { hours: Number(r.hours) || 0, km: Number(r.km) || 0 });
  const fuelOf = (id: string, r: Row) => (r.fuel === null ? Math.round(normOf(id, r)) : Number(r.fuel) || 0);
  const save = () => {
    const bad = list.find((s) => { const r = rows[s.id]; return r && !r.skip && (!(Number(r.hours) > 0) || (isVehicle(eqOf(s.equipmentId)!) && !(Number(r.km) > 0))); });
    if (bad) return toast.error(`Dòng ${eqOf(bad.equipmentId)?.code} · ${bad.shift}: nhập giờ máy${isVehicle(eqOf(bad.equipmentId)!) ? " và số km" : ""} hoặc bấm "Không làm"`);
    let n = 0, over = 0;
    list.forEach((s) => {
      const r = rows[s.id]; if (!r) return;
      if (r.skip) { run(logShift, s.id, { hours: 0, km: 0, fuelLiters: 0, output: "", note: r.note || "Không làm" }); n++; return; }
      const fuel = fuelOf(s.id, r);
      if (fuel > normOf(s.id, r) * 1.08) over++;
      run(logShift, s.id, { hours: Number(r.hours), km: Number(r.km) || 0, fuelLiters: fuel, output: r.output, note: r.note }); n++;
    });
    toast.success(`Đã lưu nhật trình ${n} ca ngày ${date.split("-").reverse().join("/")}`, { description: over ? `⚠ ${over} ca vượt định mức nhiên liệu` : undefined });
    onOpenChange(false);
  };
  const lbl = "text-[11px] font-medium text-slate-500 md:hidden";
  const inp = "h-10 text-[14px]";
  const project = db.projects.find((p) => p.id === pid);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader><DialogTitle>Nhập nhật trình theo ngày</DialogTitle><DialogDescription>{project?.shortName} · Giờ máy đã điền sẵn theo độ dài ca, nhiên liệu theo định mức – chỉ sửa dòng khác thực tế rồi bấm Lưu tất cả.</DialogDescription></DialogHeader>
        <DialogBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-slate-600">Ngày</span>
            <Input type="date" className="h-10 w-44" value={date} max={DEMO_TODAY} onChange={(e) => setDate(e.target.value || DEMO_TODAY)} />
            <span className="text-[12.5px] text-slate-500">{list.length} ca đã phân · {list.filter((s) => s.logged !== false).length} đã có nhật trình</span>
          </div>
          {!list.length ? <div className="rounded-lg border border-dashed py-10 text-center text-[13px] text-slate-400">Ngày này chưa có ca nào được phân.</div> : (
            <div className="rounded-lg border">
              <div className="hidden grid-cols-[1.7fr_1fr_88px_88px_100px_1.1fr_1.1fr_96px] gap-2 border-b bg-slate-50 px-3 py-2 text-[11.5px] font-semibold uppercase text-slate-500 md:grid">
                <span>Máy · ca</span><span>Người vận hành</span><span className="text-right">Giờ máy</span><span className="text-right">Km</span><span className="text-right">Nhiên liệu (lít)</span><span>Khối lượng</span><span>Ghi chú</span><span />
              </div>
              {list.map((s) => {
                const r = rows[s.id]; if (!r) return null;
                const e = eqOf(s.equipmentId)!;
                const veh = isVehicle(e);
                const norm = normOf(s.id, r);
                const fuel = fuelOf(s.id, r);
                const over = !r.skip && norm > 0 && fuel > norm * 1.08;
                return (
                  <div key={s.id} className={cn("grid grid-cols-2 items-center gap-2 border-b px-3 py-2.5 last:border-0 md:grid-cols-[1.7fr_1fr_88px_88px_100px_1.1fr_1.1fr_96px]", r.skip && "bg-slate-50 text-slate-400")}>
                    <div className="col-span-2 md:col-span-1"><div className="text-[14px] font-semibold text-slate-800">{e.code} · {s.shift}</div><div className="truncate text-[11.5px] text-slate-500">{e.name}{s.logged !== false && <span className="ml-1 text-green-700">· đã nhập</span>}</div></div>
                    <div className="col-span-2 text-[13px] md:col-span-1">{opName(s.operatorId)}</div>
                    {r.skip ? (
                      <div className="col-span-2 text-[13px] italic md:col-span-5">Không làm{r.note ? ` – ${r.note}` : ""}</div>
                    ) : (<>
                      <label><span className={lbl}>Giờ máy</span><Input type="number" step="0.5" className={cn(inp, "text-right")} value={r.hours} onChange={(ev) => set(s.id, { hours: ev.target.value })} /></label>
                      <label><span className={lbl}>Km</span>{veh ? <Input type="number" className={cn(inp, "text-right", !(Number(r.km) > 0) && "border-amber-300")} placeholder="km" value={r.km} onChange={(ev) => set(s.id, { km: ev.target.value })} /> : <div className="h-10 pt-2.5 text-right text-slate-300">—</div>}</label>
                      <label title={`Định mức ${fmtNumber(norm, 0)} lít`}><span className={lbl}>Nhiên liệu (lít)</span><Input type="number" className={cn(inp, "text-right", over && "border-rose-400 bg-rose-50 font-semibold text-rose-700")} value={r.fuel ?? String(fuel)} onChange={(ev) => set(s.id, { fuel: ev.target.value })} />{over && <span className="block text-right text-[10.5px] font-semibold text-rose-600">vượt {Math.round((fuel / norm - 1) * 100)}% ĐM</span>}</label>
                      <label className="col-span-2 md:col-span-1"><span className={lbl}>Khối lượng</span><Input className={inp} placeholder={veh ? "VD: 12 chuyến" : "VD: 320 m³"} value={r.output} onChange={(ev) => set(s.id, { output: ev.target.value })} /></label>
                    </>)}
                    <label className={cn("col-span-2 md:col-span-1", r.skip && "md:col-start-7")}><span className={lbl}>Ghi chú</span><Input className={inp} placeholder={r.skip ? "Lý do (vắng, máy hỏng…)" : ""} value={r.note} onChange={(ev) => set(s.id, { note: ev.target.value })} /></label>
                    <div className="col-span-2 md:col-span-1 md:text-right">
                      <Button size="sm" variant={r.skip ? "soft" : "ghost"} className={cn(!r.skip && "text-slate-500")} onClick={() => set(s.id, { skip: !r.skip })}>{r.skip ? <><RotateCcw /> Có làm</> : <><UserX /> Không làm</>}</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button size="lg" disabled={!list.length} onClick={save}>Lưu tất cả ({list.length} ca)</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
