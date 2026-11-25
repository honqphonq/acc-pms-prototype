import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing } from "lucide-react";
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
import { RegistryPage } from "@/components/registry/RegistryPage";
import { MaintenanceDialog } from "./ShiftMaintDialogs";
import { addMaintenance } from "@/services/actions";
import { FlowActions, FlowBadge, FlowDetail, flowBeforeSave, flowLabel, type FlowRow, type ResultField } from "@/components/registry/AssignFlow";
import { equipmentDocWarnings, isVehicle, maintenanceDue, maintenanceLeft, meterUnit, sinceMaintenance } from "@/services/selectors";
import { DEMO_TODAY, addDays, diffDays } from "@/utils/date";
import { fmtDate, fmtMoneyShort, fmtNumber, fmtVnd } from "@/utils/format";
import { MAINT_TYPE, equipmentOptions, userOptions } from "@/utils/labels";
import type { Database, MaintenancePlan } from "@/types";

const ST = { moi: "moi", dang: "dang_thuc_hien", xong: "hoan_thanh" };
const LB = { moi: "Mới giao", dang: "Đang bảo dưỡng", xong: "Đã thực hiện" };
const RESULT: ResultField[] = [
  { key: "hoursAt", label: "Giờ máy / km lúc bảo dưỡng", type: "number", required: true },
  { key: "cost", label: "Chi phí (đ)", type: "number", required: true },
  { key: "result", label: "Vật tư thay thế, kết quả", type: "textarea", required: true },
];
const STATE_OPTS = [{ value: "moi", label: "Mới giao" }, { value: "dang", label: "Đang bảo dưỡng" }, { value: "qua_han", label: "Quá hạn" }, { value: "xong", label: "Đã thực hiện" }, { value: "xong_muon", label: "Thực hiện muộn" }];
/** Hoàn thành bảo dưỡng → ghi lý lịch máy, đặt lại mốc bảo dưỡng */
const onResult = (r: FlowRow, _v: Record<string, unknown>, db: Database) => { const p = r as unknown as MaintenancePlan; return addMaintenance(db, p.equipmentId, { type: "bao_duong", content: `${p.code}: ${p.content}`, cost: p.cost, date: p.completedAt ?? DEMO_TODAY }, true); };

const CFG_KEY = "acc-pms:v10:maint-reminder";
const loadCfg = () => { try { return JSON.parse(localStorage.getItem(CFG_KEY) ?? "") as { days: number; hours: number }; } catch { return { days: 7, hours: 30 }; } };

export default function MaintenancePage() {
  const { db } = useDb();
  const { user } = useAuth();
  const [cfg, setCfg] = useState(loadCfg);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [rec, setRec] = useState<{ open: boolean; id?: string }>({ open: false });
  const eq = (id: string) => db.equipment.find((e) => e.id === id);
  const due = db.equipment.filter((e) => e.status === "hoat_dong" && (maintenanceDue(e) || e.maintenanceInterval - sinceMaintenance(e) <= (isVehicle(e) ? cfg.hours * 20 : cfg.hours)));
  const soon = db.maintenancePlans.filter((p) => p.status !== "hoan_thanh" && diffDays(DEMO_TODAY, p.plannedDate) <= cfg.days);
  return (
    <>
      <RegistryPage<MaintenancePlan>
        title="Bảo dưỡng xe máy thiết bị" entityLabel="kế hoạch bảo dưỡng" addLabel="Lập kế hoạch bảo dưỡng" codePrefix="KHBD-2026-" collection="maintenancePlans"
        description="Lập kế hoạch (máy, cấp bảo dưỡng, nội dung, người thực hiện, ngày dự kiến) → người được giao tiếp nhận → làm xong cập nhật ngày thực hiện, giờ máy, vật tư thay thế, chi phí, biên bản."
        searchText={(p) => `${p.code} ${p.content} ${eq(p.equipmentId)?.code}`}
        headerExtra={<Button variant="outline" onClick={() => setCfgOpen(true)}><BellRing /> Cấu hình nhắc lịch</Button>}
        filters={[{ label: "Tất cả loại bảo dưỡng", options: Object.entries(MAINT_TYPE).map(([value, label]) => ({ value, label })), test: (p, v) => p.type === v }, { label: "Tất cả trạng thái", options: STATE_OPTS, test: (p, v) => flowLabel(p, ST) === v }]}
        kpis={(rows) => [
          { label: "Mới giao (chờ tiếp nhận)", value: rows.filter((r) => r.status === "moi").length, tone: "warning" },
          { label: `Đến lịch trong ${cfg.days} ngày`, value: soon.length, tone: "danger", sub: "Theo cấu hình nhắc lịch" },
          { label: "XMTB đến hạn bảo dưỡng", value: due.length, tone: "info", sub: `Máy còn ≤ ${cfg.hours} giờ · xe còn ≤ ${cfg.hours * 20} km · hoặc đến mốc tháng` },
          { label: "Chi phí bảo dưỡng (đã thực hiện)", value: fmtMoneyShort(rows.reduce((s, r) => s + (r.status === "hoan_thanh" ? r.cost : 0), 0)), tone: "navy" },
        ]}
        newRecord={() => ({ type: "dinh_ky", status: "moi", plannedDate: addDays(DEMO_TODAY, 7), deadline: addDays(DEMO_TODAY, 7), createdAt: DEMO_TODAY, createdById: user!.id, assigneeId: "u13", cost: 0, materials: "", files: [], activity: [] })}
        beforeSave={(row, isNew, d) => flowBeforeSave<MaintenancePlan>("kế hoạch bảo dưỡng", user?.id ?? "u01")({ ...row, deadline: row.plannedDate }, isNew, d)}
        canEditRow={(r) => r.status === "moi"}
        rowClassName={(p) => (flowLabel(p, ST) === "qua_han" ? "bg-rose-50/40" : undefined)}
        above={<WarningsBlock dueIds={due.map((e) => e.id)} onRecord={(id) => setRec({ open: true, id })} />}
        columns={[
          { key: "c", header: "Số kế hoạch", sortValue: (p) => p.code, cell: (p) => <span className="whitespace-nowrap font-medium">{p.code}</span> },
          { key: "e", header: "Thiết bị", cell: (p) => <div className="text-xs"><div className="font-medium text-slate-800">{eq(p.equipmentId)?.code} – {eq(p.equipmentId)?.name}</div><div className="text-slate-400">{db.projects.find((x) => x.id === eq(p.equipmentId)?.currentProjectId)?.shortName ?? "Kho TCT"}</div></div> },
          { key: "t", header: "Cấp / nội dung", cell: (p) => <div className="max-w-sm text-[13px]"><Badge tone="outline" className="mb-0.5">{MAINT_TYPE[p.type]}</Badge><div>{p.content}</div></div> },
          { key: "a", header: "Người thực hiện / ngày dự kiến", sortValue: (p) => p.plannedDate, cell: (p) => <div className="whitespace-nowrap text-xs"><div>{db.users.find((u) => u.id === p.assigneeId)?.name}</div><div className={flowLabel(p, ST) === "qua_han" ? "font-semibold text-rose-600" : "text-slate-400"}>{fmtDate(p.plannedDate)}</div></div> },
          { key: "k", header: "Chi phí", align: "right", sortValue: (p) => p.cost, cell: (p) => (p.status === "hoan_thanh" ? fmtMoneyShort(p.cost) : <span className="text-slate-300">—</span>) },
          { key: "s", header: "Trạng thái", sortValue: (p) => flowLabel(p, ST), cell: (p) => <FlowBadge r={p} st={ST} labels={LB} /> },
        ]}
        rowActions={(p) => <FlowActions r={p} collection="maintenancePlans" st={ST} noun="kế hoạch bảo dưỡng" resultFields={RESULT} onResult={onResult} />}
        detailView={(p, ctx) => (
          <FlowDetail r={p} collection="maintenancePlans" st={ST} labels={LB} noun="kế hoạch bảo dưỡng" ctx={ctx} canEdit={p.status === "moi"} resultFields={RESULT} onResult={onResult}
            title={p.content}
            info={[["Thiết bị", `${eq(p.equipmentId)?.code} – ${eq(p.equipmentId)?.name}`], ["Cấp bảo dưỡng", MAINT_TYPE[p.type]], ["Dự trù vật tư", p.materials]]}
            result={[["Giờ máy / km lúc bảo dưỡng", p.hoursAt ? fmtNumber(p.hoursAt, 0) : "—"], ["Vật tư thay thế, kết quả", p.result ?? ""], ["Chi phí", `${fmtVnd(p.cost)} đ`]]} />
        )}
        fields={[
          { key: "equipmentId", label: "Thiết bị", type: "select", options: equipmentOptions, required: true, wide: true },
          { key: "type", label: "Cấp bảo dưỡng", type: "select", options: Object.entries(MAINT_TYPE).map(([value, label]) => ({ value, label })) },
          { key: "plannedDate", label: "Ngày dự kiến", type: "date", required: true },
          { key: "content", label: "Nội dung bảo dưỡng", type: "textarea", required: true },
          { key: "materials", label: "Dự trù vật tư kỹ thuật", wide: true },
          { key: "assigneeId", label: "Giao cho", type: "select", options: (d) => userOptions(d, (u) => u.role === "phong_thiet_bi" || u.role === "chi_huy_truong"), required: true, wide: true },
        ]}
      />
      <Dialog open={cfgOpen} onOpenChange={setCfgOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cấu hình thời gian nhắc lịch bảo dưỡng</DialogTitle></DialogHeader>
          <DialogBody className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nhắc trước ngày bảo dưỡng (ngày)"><Input type="number" value={cfg.days} onChange={(e) => setCfg({ ...cfg, days: Number(e.target.value) })} /></FormField>
            <FormField label="Nhắc khi còn (giờ máy) tới chu kỳ – xe tính gấp 20 lần theo km"><Input type="number" value={cfg.hours} onChange={(e) => setCfg({ ...cfg, hours: Number(e.target.value) })} /></FormField>
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
            {tab === "bd" && <><span className="text-[12.5px] text-slate-600">{fmtNumber(sinceMaintenance(e), 0)} / {fmtNumber(e.maintenanceInterval, 0)} {meterUnit(e)} · {maintenanceLeft(e)}</span><Progress value={Math.min(1, sinceMaintenance(e) / e.maintenanceInterval)} tone={sinceMaintenance(e) >= e.maintenanceInterval ? "danger" : "warning"} className="h-1.5 w-28" />{can("equipment.edit") && <Button size="xs" variant="soft" onClick={(ev) => { ev.stopPropagation(); onRecord(e.id); }}>Ghi nhận bảo dưỡng</Button>}</>}
            {tab === "hs" && equipmentDocWarnings(e).filter((w) => !w.label.includes("chủ sở hữu")).map((w) => <Badge key={w.label} tone={w.danger ? "danger" : "warning"}>{w.label}</Badge>)}
            {tab === "cm" && <><span className="text-[12.5px] text-slate-600">Cho thuê: {e.rentalSupplier}</span><Badge tone="danger">Thiếu CM chủ sở hữu</Badge></>}
          </div>
        ))}
      </div>
    </Card>
  );
}
