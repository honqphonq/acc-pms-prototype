import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, CheckCircle2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
import { maintenanceDue } from "@/services/selectors";
import { DEMO_TODAY, diffDays } from "@/utils/date";
import { fmtDate, fmtMoneyShort, fmtNumber } from "@/utils/format";
import { MAINT_STATUS, MAINT_TYPE, equipmentOptions, toOptions } from "@/utils/labels";
import type { MaintenancePlan } from "@/types";

const CFG_KEY = "acc-pms:v2:maint-reminder";
const loadCfg = () => { try { return JSON.parse(localStorage.getItem(CFG_KEY) ?? "") as { days: number; hours: number }; } catch { return { days: 7, hours: 30 }; } };

export default function MaintenancePage() {
  const { db, run } = useDb();
  const { can, user } = useAuth();
  const navigate = useNavigate();
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
        above={due.length > 0 && (
          <Card className="mb-4">
            <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4 text-amber-500" /> Thông báo: máy đến hạn bảo dưỡng theo giờ máy ({due.length})</CardTitle></CardHeader>
            <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-3">
              {due.slice(0, 6).map((e) => { const r = (e.totalHours - e.lastMaintenanceHours) / e.maintenanceInterval; return (
                <div key={e.id} className="cursor-pointer rounded-lg border p-3 hover:bg-slate-50" onClick={() => navigate(`/equipment/${e.id}`)}>
                  <div className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-medium">{e.code} – {e.name}</span>{can("equipment.edit") && <Button size="xs" variant="soft" onClick={(ev) => { ev.stopPropagation(); setRec({ open: true, id: e.id }); }}>Ghi nhận</Button>}</div>
                  <div className="mt-1 text-[11.5px] text-slate-500">{fmtNumber(e.totalHours - e.lastMaintenanceHours, 0)} / {e.maintenanceInterval} giờ · {db.projects.find((p) => p.id === e.currentProjectId)?.shortName}</div>
                  <Progress value={Math.min(1, r)} tone={r >= 1 ? "danger" : "warning"} className="mt-1.5 h-1.5" />
                </div>
              ); })}
            </div>
          </Card>
        )}
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
