import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { saveRow } from "@/services/actions";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { INCIDENT_SEVERITY, INCIDENT_STATUS, INCIDENT_TYPE, PLAN_STATUS, equipmentOptions, projectOptions, toOptions, userOptions } from "@/utils/labels";
import type { Incident } from "@/types";

export default function IncidentsPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const eq = (id: string) => db.equipment.find((e) => e.id === id);
  return (
    <RegistryPage<Incident>
      title="Sự cố, tai nạn" entityLabel="sự cố" addLabel="Ghi nhận sự cố" codePrefix="SC-2026-" collection="incidents"
      description="Ghi nhận sự cố, tai nạn xe máy thiết bị; lập và phê duyệt phương án xử lý; theo dõi quá trình xử lý."
      searchText={(r) => `${r.code} ${r.description} ${eq(r.equipmentId)?.code}`}
      filters={[{ label: "Tất cả loại sự cố", options: Object.entries(INCIDENT_TYPE).map(([value, label]) => ({ value, label })), test: (r, v) => r.type === v }, { label: "Tất cả trạng thái", options: toOptions(INCIDENT_STATUS), test: (r, v) => r.status === v }]}
      kpis={(rows) => [
        { label: "Sự cố trong năm", value: rows.length, tone: "navy" },
        { label: "Đang xử lý / mới", value: rows.filter((r) => r.status !== "da_xu_ly").length, tone: "warning" },
        { label: "Nghiêm trọng", value: rows.filter((r) => r.severity === "nghiem_trong").length, tone: "danger" },
        { label: "Phương án chờ duyệt / chưa lập", value: rows.filter((r) => r.planStatus !== "da_duyet").length, tone: "info" },
      ]}
      newRecord={() => ({ date: DEMO_TODAY, type: "hu_hong", severity: "trung_binh", status: "moi", planStatus: "chua_lap", plan: "", progress: "", projectId: "p01", operatorId: null })}
      columns={[
        { key: "c", header: "Mã sự cố", sortValue: (r) => r.code, cell: (r) => <div className="whitespace-nowrap"><div className="font-medium">{r.code}</div><div className="text-[11px] text-slate-400">{fmtDate(r.date)}</div></div> },
        { key: "e", header: "Thiết bị / người vận hành", cell: (r) => <div className="text-xs"><div className="font-medium text-slate-800">{eq(r.equipmentId)?.code} – {eq(r.equipmentId)?.name}</div><div className="text-slate-400">{db.users.find((u) => u.id === r.operatorId)?.name ?? "—"} · {db.projects.find((p) => p.id === r.projectId)?.shortName}</div></div> },
        { key: "d", header: "Mô tả", cell: (r) => <div className="max-w-sm text-[13px]"><Badge tone="outline" className="mb-0.5">{INCIDENT_TYPE[r.type]}</Badge><div>{r.description}</div></div> },
        { key: "sv", header: "Mức độ", cell: (r) => <StatusBadge map={INCIDENT_SEVERITY} value={r.severity} dot={false} /> },
        { key: "pl", header: "Phương án xử lý", cell: (r) => <StatusBadge map={PLAN_STATUS} value={r.planStatus} dot={false} /> },
        { key: "s", header: "Trạng thái", cell: (r) => <StatusBadge map={INCIDENT_STATUS} value={r.status} /> },
      ]}
      rowActions={(r) => r.planStatus === "cho_duyet" && can("equipment.dispatch.approve") ? <Button size="xs" variant="soft" onClick={() => { run(saveRow, "incidents", { ...r, planStatus: "da_duyet", status: "dang_xu_ly" }); toast.success("Đã phê duyệt phương án xử lý"); }}>Duyệt PA</Button>
        : r.status === "dang_xu_ly" ? <Button size="xs" variant="soft" onClick={() => { run(saveRow, "incidents", { ...r, status: "da_xu_ly", progress: `${r.progress ? r.progress + "\n" : ""}${DEMO_TODAY.split("-").reverse().join("/")}: đã khắc phục xong` }); toast.success("Đã đóng sự cố"); }}>Đã xử lý</Button> : null}
      fields={[
        { key: "equipmentId", label: "Thiết bị", type: "select", options: equipmentOptions, required: true, wide: true },
        { key: "operatorId", label: "Người vận hành", type: "select", options: (d) => userOptions(d, (u) => !!u.isOperator) },
        { key: "projectId", label: "Công trình", type: "select", options: projectOptions },
        { key: "date", label: "Ngày xảy ra", type: "date" },
        { key: "type", label: "Loại sự cố", type: "select", options: Object.entries(INCIDENT_TYPE).map(([value, label]) => ({ value, label })) },
        { key: "severity", label: "Mức độ", type: "select", options: toOptions(INCIDENT_SEVERITY) },
        { key: "status", label: "Trạng thái", type: "select", options: toOptions(INCIDENT_STATUS) },
        { key: "description", label: "Mô tả sự cố", type: "textarea", required: true },
        { key: "plan", label: "Phương án xử lý", type: "textarea" },
        { key: "planStatus", label: "Trạng thái phương án", type: "select", options: toOptions(PLAN_STATUS) },
        { key: "progress", label: "Quá trình xử lý", type: "textarea" },
      ]}
    />
  );
}
