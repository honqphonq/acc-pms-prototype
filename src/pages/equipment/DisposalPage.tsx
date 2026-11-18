import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { saveRow } from "@/services/actions";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate, fmtMoneyShort } from "@/utils/format";
import { DISPOSAL_METHOD, DISPOSAL_STATUS, equipmentOptions, toOptions } from "@/utils/labels";
import type { DisposalPlan } from "@/types";

export default function DisposalPage() {
  const { db, run } = useDb();
  const { can, user } = useAuth();
  const eq = (id: string) => db.equipment.find((e) => e.id === id);
  const next: Record<string, DisposalPlan["status"]> = { lap_ke_hoach: "cho_duyet", cho_duyet: "da_duyet", da_duyet: "hoan_thanh" };
  const nextLabel: Record<string, string> = { lap_ke_hoach: "Trình duyệt", cho_duyet: "Phê duyệt", da_duyet: "Hoàn thành" };
  return (
    <RegistryPage<DisposalPlan>
      title="Thanh xử lý thiết bị, vật tư" entityLabel="kế hoạch thanh xử lý" addLabel="Lập kế hoạch thanh xử lý" codePrefix="KHTL-2026-" collection="disposals"
      description="Các xe máy, thiết bị đủ điều kiện thanh xử lý: lập kế hoạch, phê duyệt và theo dõi kết quả thanh lý / bán đấu giá / hủy."
      searchText={(r) => `${r.code} ${r.reason} ${eq(r.equipmentId)?.code}`}
      filters={[{ label: "Tất cả trạng thái", options: toOptions(DISPOSAL_STATUS), test: (r, v) => r.status === v }]}
      kpis={(rows) => [
        { label: "Kế hoạch thanh xử lý", value: rows.length, tone: "navy" },
        { label: "Chờ phê duyệt", value: rows.filter((r) => r.status === "cho_duyet").length, tone: "warning" },
        { label: "Giá trị thu hồi dự kiến", value: fmtMoneyShort(rows.reduce((s, r) => s + r.residualValue, 0)), tone: "success" },
      ]}
      newRecord={() => ({ method: "thanh_ly", status: "lap_ke_hoach", plannedDate: DEMO_TODAY, residualValue: 0, createdById: user!.id })}
      columns={[
        { key: "c", header: "Số kế hoạch", sortValue: (r) => r.code, cell: (r) => <span className="whitespace-nowrap font-medium">{r.code}</span> },
        { key: "e", header: "Thiết bị", cell: (r) => <div className="text-xs"><div className="font-medium text-slate-800">{eq(r.equipmentId)?.code} – {eq(r.equipmentId)?.name}</div><div className="text-slate-400">Năm SX {eq(r.equipmentId)?.year} · {eq(r.equipmentId)?.qualityGrade}</div></div> },
        { key: "r", header: "Lý do", cell: (r) => <span className="text-[13px]">{r.reason}</span> },
        { key: "m", header: "Hình thức", cell: (r) => <span className="whitespace-nowrap text-xs">{DISPOSAL_METHOD[r.method]}</span> },
        { key: "v", header: "Giá trị thu hồi", align: "right", sortValue: (r) => r.residualValue, cell: (r) => fmtMoneyShort(r.residualValue) },
        { key: "d", header: "Thời gian", sortValue: (r) => r.plannedDate, cell: (r) => <span className="text-xs">{fmtDate(r.plannedDate)}</span> },
        { key: "s", header: "Trạng thái", cell: (r) => <StatusBadge map={DISPOSAL_STATUS} value={r.status} /> },
      ]}
      rowActions={(r) => next[r.status] && (r.status !== "cho_duyet" || can("equipment.dispatch.approve")) ? <Button size="xs" variant="soft" onClick={() => { run(saveRow, "disposals", { ...r, status: next[r.status] }); toast.success(`${nextLabel[r.status]}: ${r.code}`); }}>{nextLabel[r.status]}</Button> : null}
      fields={[
        { key: "equipmentId", label: "Thiết bị", type: "select", options: equipmentOptions, required: true, wide: true },
        { key: "reason", label: "Lý do / điều kiện thanh xử lý", type: "textarea", required: true },
        { key: "method", label: "Hình thức", type: "select", options: Object.entries(DISPOSAL_METHOD).map(([value, label]) => ({ value, label })) },
        { key: "status", label: "Trạng thái", type: "select", options: toOptions(DISPOSAL_STATUS) },
        { key: "residualValue", label: "Giá trị thu hồi dự kiến (đ)", type: "number" },
        { key: "plannedDate", label: "Thời gian thực hiện", type: "date" },
      ]}
    />
  );
}
