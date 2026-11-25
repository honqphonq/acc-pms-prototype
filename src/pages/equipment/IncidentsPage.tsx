import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { FlowActions, FlowBadge, FlowDetail, flowBeforeSave, flowLabel, type ResultField } from "@/components/registry/AssignFlow";
import { DEMO_TODAY, addDays } from "@/utils/date";
import { fmtDate, fmtMoneyShort, fmtVnd } from "@/utils/format";
import { INCIDENT_SEVERITY, INCIDENT_TYPE, equipmentOptions, projectOptions, toOptions, userOptions } from "@/utils/labels";
import type { Incident } from "@/types";

const ST = { moi: "moi", dang: "dang_xu_ly", xong: "da_xu_ly" };
const LB = { moi: "Mới ghi nhận", dang: "Đang xử lý", xong: "Đã xử lý" };
const RESULT: ResultField[] = [
  { key: "cause", label: "Nguyên nhân", type: "textarea", required: true },
  { key: "plan", label: "Cách xử lý", type: "textarea", required: true },
  { key: "cost", label: "Thiệt hại / chi phí khắc phục (đ)", type: "number" },
];
const STATE_OPTS = [{ value: "moi", label: "Mới ghi nhận" }, { value: "dang", label: "Đang xử lý" }, { value: "qua_han", label: "Quá hạn" }, { value: "xong", label: "Đã xử lý" }, { value: "xong_muon", label: "Đã xử lý muộn" }];
const typeOpts = Object.entries(INCIDENT_TYPE).map(([value, label]) => ({ value, label }));

export default function IncidentsPage() {
  const { db } = useDb();
  const { user } = useAuth();
  const eq = (id: string) => db.equipment.find((e) => e.id === id);
  return (
    <RegistryPage<Incident>
      title="Sự cố, tai nạn" entityLabel="sự cố" addLabel="Ghi nhận sự cố" codePrefix="SC-2026-" collection="incidents"
      description="Ghi nhận sự cố (máy, thời gian, địa điểm, mô tả, mức độ) và giao người xử lý kèm thời hạn → người được giao tiếp nhận → xử lý xong cập nhật nguyên nhân, cách xử lý, chi phí, biên bản và ảnh."
      searchText={(r) => `${r.code} ${r.description} ${eq(r.equipmentId)?.code}`}
      filters={[{ label: "Tất cả loại sự cố", options: typeOpts, test: (r, v) => r.type === v }, { label: "Tất cả trạng thái", options: STATE_OPTS, test: (r, v) => flowLabel(r, ST) === v }]}
      kpis={(rows) => [
        { label: "Sự cố trong năm", value: rows.length, tone: "navy" },
        { label: "Chưa xử lý xong", value: rows.filter((r) => r.status !== "da_xu_ly").length, tone: "warning" },
        { label: "Nghiêm trọng", value: rows.filter((r) => r.severity === "nghiem_trong").length, tone: "danger" },
        { label: "Thiệt hại / chi phí", value: fmtMoneyShort(rows.reduce((s, r) => s + (r.cost ?? 0), 0)), tone: "info" },
      ]}
      newRecord={() => ({ date: DEMO_TODAY, createdAt: DEMO_TODAY, deadline: addDays(DEMO_TODAY, 7), type: "hu_hong", severity: "trung_binh", status: "moi", projectId: "p01", operatorId: null, assigneeId: "u13", createdById: user!.id, files: [], activity: [] })}
      beforeSave={flowBeforeSave<Incident>("sự cố", user?.id ?? "u01")}
      canEditRow={(r) => r.status === "moi"}
      rowClassName={(r) => (flowLabel(r, ST) === "qua_han" ? "bg-rose-50/40" : undefined)}
      columns={[
        { key: "c", header: "Mã sự cố", sortValue: (r) => r.code, cell: (r) => <div className="whitespace-nowrap"><div className="font-medium">{r.code}</div><div className="text-[11px] text-slate-400">{fmtDate(r.date)}</div></div> },
        { key: "e", header: "Thiết bị / địa điểm", cell: (r) => <div className="text-xs"><div className="font-medium text-slate-800">{eq(r.equipmentId)?.code} – {eq(r.equipmentId)?.name}</div><div className="text-slate-400">{r.location || db.projects.find((p) => p.id === r.projectId)?.shortName}</div></div> },
        { key: "d", header: "Mô tả", cell: (r) => <div className="max-w-sm text-[13px]"><Badge tone="outline" className="mb-0.5">{INCIDENT_TYPE[r.type]}</Badge><div>{r.description}</div></div> },
        { key: "sv", header: "Mức độ", cell: (r) => <StatusBadge map={INCIDENT_SEVERITY} value={r.severity} dot={false} /> },
        { key: "a", header: "Người xử lý / hạn", sortValue: (r) => r.deadline, cell: (r) => <div className="whitespace-nowrap text-xs"><div>{db.users.find((u) => u.id === r.assigneeId)?.name}</div><div className={flowLabel(r, ST) === "qua_han" ? "font-semibold text-rose-600" : "text-slate-400"}>Hạn {fmtDate(r.deadline)}</div></div> },
        { key: "s", header: "Trạng thái", sortValue: (r) => flowLabel(r, ST), cell: (r) => <FlowBadge r={r} st={ST} labels={LB} /> },
      ]}
      rowActions={(r) => <FlowActions r={r} collection="incidents" st={ST} noun="sự cố" resultFields={RESULT} />}
      detailView={(r, ctx) => (
        <FlowDetail r={r} collection="incidents" st={ST} labels={LB} noun="sự cố" ctx={ctx} canEdit={r.status === "moi"} resultFields={RESULT}
          title={r.description}
          info={[
            ["Thiết bị", `${eq(r.equipmentId)?.code} – ${eq(r.equipmentId)?.name}`],
            ["Thời gian xảy ra", fmtDate(r.date)],
            ["Địa điểm", r.location || db.projects.find((p) => p.id === r.projectId)?.shortName || "—"],
            ["Người vận hành", db.operators.find((o) => o.id === r.operatorId)?.name ?? db.users.find((u) => u.id === r.operatorId)?.name ?? "—"],
            ["Loại sự cố", INCIDENT_TYPE[r.type]],
            ["Mức độ", INCIDENT_SEVERITY[r.severity]?.label ?? r.severity],
          ]}
          result={[["Nguyên nhân", r.cause ?? ""], ["Cách xử lý", r.plan ?? ""], ["Thiệt hại / chi phí", `${fmtVnd(r.cost ?? 0)} đ`]]} />
      )}
      fields={[
        { key: "equipmentId", label: "Thiết bị", type: "select", options: equipmentOptions, required: true, wide: true },
        { key: "date", label: "Thời gian xảy ra", type: "date", required: true },
        { key: "projectId", label: "Dự án", type: "select", options: projectOptions },
        { key: "location", label: "Địa điểm cụ thể" },
        { key: "operatorId", label: "Người vận hành", type: "select", options: (d) => d.operators.map((o) => ({ value: o.id, label: o.name })) },
        { key: "type", label: "Loại sự cố", type: "select", options: typeOpts },
        { key: "severity", label: "Mức độ", type: "select", options: toOptions(INCIDENT_SEVERITY) },
        { key: "description", label: "Mô tả sự cố", type: "textarea", required: true },
        { key: "assigneeId", label: "Giao cho (người xử lý)", type: "select", options: (d) => userOptions(d, (u) => u.role === "phong_thiet_bi" || u.role === "chi_huy_truong"), required: true },
        { key: "deadline", label: "Thời hạn xử lý", type: "date", required: true },
      ]}
    />
  );
}
