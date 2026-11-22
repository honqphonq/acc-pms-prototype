import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/common/FormField";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { MaintenanceDialog } from "./ShiftMaintDialogs";
import { saveRow } from "@/services/actions";
import { equipmentDocWarnings, maintenanceDue } from "@/services/selectors";
import { DEMO_TODAY, diffDays } from "@/utils/date";
import { fmtDate, fmtMoneyShort, fmtNumber } from "@/utils/format";
import { MAINT_STATUS, MAINT_TYPE, equipmentOptions, toOptions } from "@/utils/labels";
import type { MaintenancePlan } from "@/types";

const CFG_KEY = "acc-pms:v7:maint-reminder";
const loadCfg = () => { try { return JSON.parse(localStorage.getItem(CFG_KEY) ?? "") as { days: number; hours: number }; } catch { return { days: 7, hours: 30 }; } };

export default function MaintenancePage() {
  const { db, run } = useDb();
  const { can, user } = useAuth();
  const [cfg, setCfg] = useState(loadCfg);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [rec, setRec] = useState<{ open: boolean; id?: string }>({ open: false });
  const eq = (id: string) => db.equipment.find((e) => e.id === id);
  const due = db.equipment.filter((e) => e.status === "hoat_dong" && (maintenanceDue(e) || e.maintenanceInterval - (e.totalHours - e.lastMaintenanceHours) <= cfg.hours));
  const soon = db.maintenancePlans.filter((p) => p.status !== "hoan_thanh" && diffDays(DEMO_TODAY, p.plannedDate) <= cfg.days);
  return (
    <>
      <RegistryPage<MaintenancePlan>
        title="Bảo dưỡng xe máy thiết bị" entityLabel="kế hoạch bảo dưỡng" addLabel="Lập kế hoạch bảo dưỡng" codePrefix="KHBD-2026-" collection="maintenancePlans"
        description="Bảo dưỡng thường xuyên, định kỳ (theo nhà sản xuất), rà trơn và đặc biệt; kế hoạch bảo dưỡng lập tại đơn vị kèm dự trù vật tư kỹ thuật, phê duyệt và nhắc lịch."
        searchText={(p) => `${p.code} ${p.content} ${eq(p.equipmentId)?.code}`}
        headerExtra={<Button variant="outline" onClick={() => setCfgOpen(true)}><BellRing /> Cấu hình nhắc lịch</Button>}
        filters={[{ label: "Tất cả loại bảo dưỡng", options: Object.entries(MAINT_TYPE).map(([value, label]) => ({ value, label })), test: (p, v) => p.type === v }, { label: "Tất cả trạng thái", options: toOptions(MAINT_STATUS), test: (p, v) => p.status === v }]}
        kpis={(rows) => [
          { label: "Kế hoạch chờ phê duyệt", value: rows.filter((r) => r.status === "cho_duyet").length, tone: "warning" },
          { label: `Đến lịch trong ${cfg.days} ngày`, value: soon.length, tone: "danger", sub: "Theo cấu hình nhắc lịch" },
          { label: "Máy đến hạn theo giờ máy", value: due.length, tone: "info", sub: `Còn ≤ ${cfg.hours} giờ tới chu kỳ` },
          { label: "Chi phí kế hoạch", value: fmtMoneyShort(rows.reduce((s, r) => s + r.cost, 0)), tone: "navy" },
        ]}
        newRecord={() => ({ type: "dinh_ky", status: "cho_duyet", plannedDate: DEMO_TODAY, createdById: user!.id, approvedById: null, cost: 0, materials: "" })}
        rowClassName={(p) => (p.status !== "hoan_thanh" && p.plannedDate < DEMO_TODAY ? "bg-rose-50/40" : undefined)}
        above={<WarningsBlock dueIds={due.map((e) => e.id)} onRecord={(id) => setRec({ open: true, id })} />}
        columns={[
          { key: "c", header: "Số kế hoạch", sortValue: (p) => p.code, cell: (p) => <span className="whitespace-nowrap font-medium">{p.code}</span> },
          { key: "e", header: "Thiết bị", cell: (p) => <div className="text-xs"><div className="font-medium text-slate-800">{eq(p.equipmentId)?.code} – {eq(p.equipmentId)?.name}</div><div className="text-slate-400">{db.projects.find((x) => x.id === eq(p.equipmentId)?.currentProjectId)?.shortName ?? "Kho TCT"}</div></div> },
          { key: "t", header: "Loại / nội dung", cell: (p) => <div className="max-w-sm text-[13px]"><Badge tone="outline" className="mb-0.5">{MAINT_TYPE[p.type]}</Badge><div>{p.content}</div><div className="text-[11px] text-slate-400">Vật tư: {p.materials || "—"}</div></div> },
          { key: "d", header: "Ngày dự kiến", sortValue: (p) => p.plannedDate, cell: (p) => <span className={p.status !== "hoan_thanh" && p.plannedDate < DEMO_TODAY ? "text-xs font-semibold text-rose-600" : "text-xs"}>{fmtDate(p.plannedDate)}</span> },
          { key: "k", header: "Chi phí", align: "right", sortValue: (p) => p.cost, cell: (p) => fmtMoneyShort(p.cost) },
          { key: "s", header: "Trạng thái", cell: (p) => <StatusBadge map={MAINT_STATUS} value={p.status} /> },
        ]}
        rowActions={(p) => p.status === "cho_duyet" && can("equipment.dispatch.approve") ? <Button size="xs" variant="soft" onClick={() => { run(saveRow, "maintenancePlans", { ...p, status: "da_duyet", approvedById: user!.id }); toast.success(`Đã phê duyệt ${p.code}`); }}><CheckCircle2 /> Duyệt</Button>
          : p.status === "da_duyet" && can("equipment.edit") ? <Button size="xs" variant="soft" onClick={() => { run(saveRow, "maintenancePlans", { ...p, status: "hoan_thanh" }); toast.success("Đã cập nhật: hoàn thành bảo dưỡng"); }}>Hoàn thành</Button> : null}
        fields={[
          { key: "equipmentId", label: "Thiết bị", type: "select", options: equipmentOptions, required: true, wide: true },
          { key: "type", label: "Loại bảo dưỡng", type: "select", options: Object.entries(MAINT_TYPE).map(([value, label]) => ({ value, label })) },
          { key: "plannedDate", label: "Ngày dự kiến", type: "date" },
          { key: "content", label: "Nội dung bảo dưỡng", type: "textarea", required: true },
          { key: "materials", label: "Dự trù vật tư kỹ thuật", wide: true },
          { key: "cost", label: "Chi phí dự kiến (đ)", type: "number" },
          { key: "status", label: "Trạng thái", type: "select", options: toOptions(MAINT_STATUS) },
        ]}
      />
      <Dialog open={cfgOpen} onOpenChange={setCfgOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cấu hình thời gian nhắc lịch bảo dưỡng</DialogTitle></DialogHeader>
          <DialogBody className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nhắc trước ngày bảo dưỡng (ngày)"><Input type="number" value={cfg.days} onChange={(e) => setCfg({ ...cfg, days: Number(e.target.value) })} /></FormField>
            <FormField label="Nhắc khi còn (giờ máy) tới chu kỳ"><Input type="number" value={cfg.hours} onChange={(e) => setCfg({ ...cfg, hours: Number(e.target.value) })} /></FormField>
          </DialogBody>
          <DialogFooter><Button onClick={() => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* */ } setCfgOpen(false); toast.success("Đã lưu cấu hình nhắc lịch"); }}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <MaintenanceDialog open={rec.open} onOpenChange={(o) => setRec({ open: o })} equipmentId={rec.id} />
    </>
  );
}

/** Cảnh báo XMTB: đến hạn bảo dưỡng; hết / sắp hết hạn kiểm định, bảo hiểm; thiếu chứng minh chủ sở hữu */
function WarningsBlock({ dueIds, onRecord }: { dueIds: string[]; onRecord: (id: string) => void }) {
  const { db } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"bd" | "hs" | "cm">("bd");
  const due = db.equipment.filter((e) => dueIds.includes(e.id));
  const docs = db.equipment.filter((e) => equipmentDocWarnings(e).some((w) => !w.label.includes("chủ sở hữu")));
  const owner = db.equipment.filter((e) => e.ownership === "thue_ngoai" && !e.ownerProof);
  const pn = (id: string | null) => db.projects.find((p) => p.id === id)?.shortName ?? "Kho TCT";
  const tabs = [{ k: "bd" as const, l: "Đến hạn bảo dưỡng", n: due.length }, { k: "hs" as const, l: "Hết / sắp hết hạn kiểm định, bảo hiểm", n: docs.length }, { k: "cm" as const, l: "Thuê ngoài thiếu chứng minh chủ sở hữu", n: owner.length }];
  const list = tab === "bd" ? due : tab === "hs" ? docs : owner;
  return (
    <Card className="mb-4 overflow-hidden border-rose-200">
      <div className="flex flex-wrap items-center gap-1 border-b bg-rose-50/60 px-3 pt-2">
        <span className="mr-3 flex items-center gap-1.5 px-1 pb-2 text-[13px] font-bold uppercase tracking-wide text-rose-700"><BellRing className="h-4 w-4" /> Cảnh báo XMTB</span>
        {tabs.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={`-mb-px border-b-2 px-3 pb-2 text-[13px] font-semibold ${tab === t.k ? "border-rose-600 text-rose-700" : "border-transparent text-slate-600 hover:text-slate-900"}`}>{t.l} <span className="ml-1 rounded-full bg-rose-100 px-1.5 text-[11px] text-rose-700">{t.n}</span></button>)}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {list.length === 0 && <div className="py-6 text-center text-sm text-slate-400">Không có cảnh báo</div>}
        {list.map((e) => (
          <div key={e.id} onClick={() => navigate(`/equipment/${e.id}`)} className="flex cursor-pointer flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-[13.5px] last:border-0 hover:bg-slate-50">
            <span className="w-28 font-semibold">{e.code}</span>
            <span className="min-w-[200px] flex-1">{e.name}<span className="ml-2 text-[12px] text-slate-500">{pn(e.currentProjectId)}</span></span>
            {tab === "bd" && <><span className="text-[12.5px] text-slate-600">{fmtNumber(e.totalHours - e.lastMaintenanceHours, 0)} / {e.maintenanceInterval} giờ</span><Progress value={Math.min(1, (e.totalHours - e.lastMaintenanceHours) / e.maintenanceInterval)} tone={e.totalHours - e.lastMaintenanceHours >= e.maintenanceInterval ? "danger" : "warning"} className="h-1.5 w-28" />{can("equipment.edit") && <Button size="xs" variant="soft" onClick={(ev) => { ev.stopPropagation(); onRecord(e.id); }}>Ghi nhận bảo dưỡng</Button>}</>}
            {tab === "hs" && equipmentDocWarnings(e).filter((w) => !w.label.includes("chủ sở hữu")).map((w) => <Badge key={w.label} tone={w.danger ? "danger" : "warning"}>{w.label}</Badge>)}
            {tab === "cm" && <><span className="text-[12.5px] text-slate-600">Cho thuê: {e.rentalSupplier}</span><Badge tone="danger">Thiếu CM chủ sở hữu</Badge></>}
          </div>
        ))}
      </div>
    </Card>
  );
}
