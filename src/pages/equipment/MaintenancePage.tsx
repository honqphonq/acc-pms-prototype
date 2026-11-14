import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Wrench } from "lucide-react";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MaintenanceDialog } from "./ShiftMaintDialogs";
import { maintenanceDue } from "@/services/selectors";
import { EQUIPMENT_STATUS } from "@/utils/constants";
import { fmtDate, fmtMoneyShort, fmtNumber, fmtVnd } from "@/utils/format";
import type { Equipment, MaintenanceRecord } from "@/types";

export default function MaintenancePage() {
  const { db } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const loading = useSimulatedLoading();
  const [dlg, setDlg] = useState<{ open: boolean; id?: string }>({ open: false });
  const schedule = [...db.equipment].filter((e) => e.status !== "ngung").sort((a, b) => (b.totalHours - b.lastMaintenanceHours) / b.maintenanceInterval - (a.totalHours - a.lastMaintenanceHours) / a.maintenanceInterval);
  const history = db.equipment.flatMap((e) => e.maintenances.map((m) => ({ e, m }))).sort((a, b) => b.m.date.localeCompare(a.m.date));
  const cost = history.reduce((s, x) => s + x.m.cost, 0);
  const cols: Column<Equipment>[] = [
    { key: "code", header: "Thiết bị", sortValue: (e) => e.code, cell: (e) => <div><div className="font-medium">{e.code} – {e.name}</div><div className="text-[11px] text-slate-400">{e.group} · {db.projects.find((p) => p.id === e.currentProjectId)?.shortName ?? "Chưa phân bổ"}</div></div> },
    { key: "since", header: "Giờ từ lần BD trước / chu kỳ", sortValue: (e) => (e.totalHours - e.lastMaintenanceHours) / e.maintenanceInterval, cell: (e) => { const r = (e.totalHours - e.lastMaintenanceHours) / e.maintenanceInterval; return <div className="w-48"><div className="mb-1 text-[11.5px]">{fmtNumber(e.totalHours - e.lastMaintenanceHours, 0)} / {e.maintenanceInterval} giờ</div><Progress value={r} tone={r >= 1 ? "danger" : r >= 0.9 ? "warning" : "info"} className="h-1.5" /></div>; } },
    { key: "last", header: "Lần gần nhất", cell: (e) => <span className="text-xs">{fmtDate(e.maintenances[0]?.date)}</span> },
    { key: "st", header: "Trạng thái", cell: (e) => <div className="flex flex-col items-start gap-1"><StatusBadge map={EQUIPMENT_STATUS} value={e.status} />{maintenanceDue(e) && e.status !== "bao_tri" && <Badge tone="warning">Đến hạn bảo dưỡng</Badge>}</div> },
    { key: "a", header: "", cell: (e) => can("equipment.edit") && <Button size="xs" variant="soft" onClick={(ev) => { ev.stopPropagation(); setDlg({ open: true, id: e.id }); }}><Wrench /> Ghi nhận</Button> },
  ];
  return (
    <div>
      <PageHeader title="Bảo dưỡng, sửa chữa" description="Theo dõi tình trạng bảo dưỡng định kỳ theo giờ máy, lịch sử sửa chữa và chi phí." actions={can("equipment.edit") && <Button onClick={() => setDlg({ open: true })}><Plus /> Ghi nhận bảo dưỡng</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Đang bảo trì" value={db.equipment.filter((e) => e.status === "bao_tri").length} unit="máy" tone="warning" />
        <KpiCard label="Đến hạn bảo dưỡng" value={db.equipment.filter((e) => e.status === "hoat_dong" && maintenanceDue(e)).length} unit="máy" tone="danger" />
        <KpiCard label="Lượt bảo dưỡng, sửa chữa" value={history.length} tone="info" />
        <KpiCard label="Chi phí bảo dưỡng, sửa chữa" value={fmtMoneyShort(cost)} tone="navy" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Kế hoạch bảo dưỡng theo giờ máy</CardTitle></CardHeader>
          <DataTable columns={cols} rows={schedule} rowKey={(e) => e.id} loading={loading} onRowClick={(e) => navigate(`/equipment/${e.id}`)} searchText={(e) => `${e.code} ${e.name}`} />
        </Card>
        <Card>
          <CardHeader><CardTitle>Lịch sử bảo dưỡng, sửa chữa</CardTitle></CardHeader>
          <DataTable<{ e: Equipment; m: MaintenanceRecord }> rows={history} rowKey={(x) => x.m.id} loading={loading} searchText={(x) => `${x.e.code} ${x.m.content}`}
            columns={[
              { key: "d", header: "Ngày", sortValue: (x) => x.m.date, cell: (x) => <span className="whitespace-nowrap">{fmtDate(x.m.date)}</span> },
              { key: "e", header: "Thiết bị", cell: (x) => <span className="font-medium">{x.e.code}</span> },
              { key: "t", header: "Nội dung", cell: (x) => <div className="text-xs"><Badge tone={x.m.type === "bao_duong" ? "info" : "warning"} className="mb-0.5">{x.m.type === "bao_duong" ? "Bảo dưỡng" : "Sửa chữa"}</Badge><div>{x.m.content}</div></div> },
              { key: "c", header: "Chi phí", align: "right", sortValue: (x) => x.m.cost, cell: (x) => fmtVnd(x.m.cost) },
            ]} />
        </Card>
      </div>
      <MaintenanceDialog open={dlg.open} onOpenChange={(o) => setDlg({ open: o })} equipmentId={dlg.id} />
    </div>
  );
}
