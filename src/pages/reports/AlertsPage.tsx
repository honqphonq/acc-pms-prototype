import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useDb } from "@/hooks/useDb";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { getAlerts, ALERT_KIND_LABEL, type Alert } from "@/services/selectors";
import { activeProjects } from "@/utils/labels";

const SEV = { danger: { label: "Nghiêm trọng", tone: "danger" }, warning: { label: "Cảnh báo", tone: "warning" }, info: { label: "Lưu ý", tone: "info" } } as const;

export default function AlertsPage() {
  const { db } = useDb();
  const loading = useSimulatedLoading();
  const [projectId, setProjectId] = useQueryParam("project");
  const [kind, setKind] = useState("");
  const [sev, setSev] = useState("");

  const alerts = getAlerts(db).filter((a) => (!projectId || a.projectId === projectId) && (!kind || a.kind === kind) && (!sev || a.severity === sev));
  const allAlerts = getAlerts(db);

  const aCols: Column<Alert>[] = [
    { key: "s", header: "Mức độ", sortValue: (a) => ({ danger: 0, warning: 1, info: 2 })[a.severity], cell: (a) => <Badge tone={SEV[a.severity].tone} dot>{SEV[a.severity].label}</Badge> },
    { key: "k", header: "Loại", sortValue: (a) => a.kind, cell: (a) => <Badge tone="outline">{ALERT_KIND_LABEL[a.kind]}</Badge> },
    { key: "t", header: "Cảnh báo", cell: (a) => <div className="min-w-[300px]"><div className="font-medium text-slate-800">{a.title}</div><div className="text-[11.5px] text-slate-500">{a.detail}</div></div> },
    { key: "p", header: "Dự án", sortValue: (a) => a.projectId, cell: (a) => <span className="whitespace-nowrap text-xs">{db.projects.find((p) => p.id === a.projectId)?.shortName ?? "—"}</span> },
    { key: "go", header: "", cell: (a) => <Button asChild size="xs" variant="ghost"><Link to={a.link}>Xử lý <ChevronRight /></Link></Button> },
  ];

  return (
    <div>
      <PageHeader title="Cảnh báo" description="Cảnh báo được hệ thống tự động phát hiện từ dữ liệu tiến độ, kho, thiết bị, thanh toán." actions={<FilterSelect value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />} />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(["tien_do", "vat_tu", "thiet_bi", "thanh_toan"] as const).map((k) => (
          <KpiCard key={k} label={`Cảnh báo ${ALERT_KIND_LABEL[k].toLowerCase()}`} value={allAlerts.filter((a) => a.kind === k && (!projectId || a.projectId === projectId)).length} tone={k === "tien_do" ? "danger" : k === "vat_tu" ? "warning" : k === "thiet_bi" ? "info" : "navy"} onClick={() => setKind(k)} sub={`${allAlerts.filter((a) => a.kind === k && a.severity === "danger" && (!projectId || a.projectId === projectId)).length} nghiêm trọng`} />
        ))}
      </div>
      <Card>
        <DataTable columns={aCols} rows={alerts} rowKey={(a) => a.id} loading={loading} resetKey={projectId + kind + sev} pageSize={15} searchText={(a) => `${a.title} ${a.detail}`} searchPlaceholder="Tìm cảnh báo..."
          toolbar={<>
            <FilterSelect value={kind} onChange={setKind} allLabel="Tất cả loại" options={Object.entries(ALERT_KIND_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
            <FilterSelect value={sev} onChange={setSev} allLabel="Mọi mức độ" options={Object.entries(SEV).map(([v, l]) => ({ value: v, label: l.label }))} />
          </>}
          emptyTitle="Không có cảnh báo" emptyDescription="Các chỉ số đang trong ngưỡng an toàn." />
      </Card>
    </div>
  );
}
