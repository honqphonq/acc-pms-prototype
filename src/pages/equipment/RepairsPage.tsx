import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { FlowActions, FlowBadge, FlowDetail, flowBeforeSave, flowLabel, type ResultField } from "@/components/registry/AssignFlow";
import { DEMO_TODAY, addDays } from "@/utils/date";
import { fmtDate, fmtMoneyShort, fmtVnd } from "@/utils/format";
import { REPAIR_LEVEL, equipmentOptions, toOptions, userOptions } from "@/utils/labels";
import type { RepairRequest } from "@/types";

const ST = { moi: "moi", dang: "dang_sua", xong: "hoan_thanh" };
const LB = { moi: "Mới giao", dang: "Đang sửa chữa", xong: "Hoàn thành" };
const RESULT: ResultField[] = [
  { key: "result", label: "Kết quả sửa chữa", type: "textarea", required: true },
  { key: "cost", label: "Chi phí sửa chữa (đ)", type: "number", required: true },
];
const STATE_OPTS = [{ value: "moi", label: "Mới giao" }, { value: "dang", label: "Đang sửa chữa" }, { value: "qua_han", label: "Quá hạn" }, { value: "xong", label: "Hoàn thành" }, { value: "xong_muon", label: "Hoàn thành muộn" }];

export default function RepairsPage() {
  const { db } = useDb();
  const { user } = useAuth();
  const eq = (id: string) => db.equipment.find((e) => e.id === id);
  const late = (r: RepairRequest) => flowLabel(r, ST) === "qua_han";
  return (
    <RegistryPage<RepairRequest>
      title="Sửa chữa xe máy thiết bị" entityLabel="đề nghị sửa chữa" addLabel="Tạo đề nghị sửa chữa" codePrefix="ĐNSC-2026-" collection="repairs"
      description="Người giao tạo đề nghị (thiết bị, nội dung, người thực hiện, thời hạn) → người được giao tiếp nhận → sửa xong cập nhật kết quả, chi phí và đính kèm biên bản."
      searchText={(r) => `${r.code} ${r.content} ${eq(r.equipmentId)?.code}`}
      filters={[{ label: "Tất cả loại sửa chữa", options: toOptions(REPAIR_LEVEL), test: (r, v) => r.level === v }, { label: "Tất cả trạng thái", options: STATE_OPTS, test: (r, v) => flowLabel(r, ST) === v }]}
      kpis={(rows) => [
        { label: "Mới giao (chờ tiếp nhận)", value: rows.filter((r) => r.status === "moi").length, tone: "warning" },
        { label: "Đang sửa chữa", value: rows.filter((r) => r.status === "dang_sua").length, tone: "info" },
        { label: "Quá hạn", value: rows.filter(late).length, tone: "danger" },
        { label: "Chi phí sửa chữa (đã hoàn thành)", value: fmtMoneyShort(rows.reduce((s, r) => s + (r.status === "hoan_thanh" ? r.cost : 0), 0)), tone: "navy" },
      ]}
      newRecord={() => ({ level: "nho", status: "moi", createdAt: DEMO_TODAY, deadline: addDays(DEMO_TODAY, 7), cost: 0, result: "", assigneeId: "u13", createdById: user!.id, files: [], activity: [] })}
      beforeSave={flowBeforeSave<RepairRequest>("đề nghị sửa chữa", user?.id ?? "u01")}
      canEditRow={(r) => r.status === "moi"}
      rowClassName={(r) => (late(r) ? "bg-rose-50/40" : undefined)}
      columns={[
        { key: "c", header: "Số đề nghị", sortValue: (r) => r.code, cell: (r) => <div className="whitespace-nowrap"><div className="font-medium">{r.code}</div><div className="text-[11px] text-slate-400">{fmtDate(r.createdAt)}</div></div> },
        { key: "e", header: "Thiết bị", cell: (r) => <div className="text-xs"><div className="font-medium text-slate-800">{eq(r.equipmentId)?.code}</div><div className="text-slate-400">{eq(r.equipmentId)?.name}</div></div> },
        { key: "t", header: "Nội dung", cell: (r) => <span className="text-[13px]">{r.content}</span> },
        { key: "l", header: "Loại", cell: (r) => <StatusBadge map={REPAIR_LEVEL} value={r.level} dot={false} /> },
        { key: "a", header: "Người thực hiện / hạn", sortValue: (r) => r.deadline, cell: (r) => <div className="whitespace-nowrap text-xs"><div>{db.users.find((u) => u.id === r.assigneeId)?.name}</div><div className={late(r) ? "font-semibold text-rose-600" : "text-slate-400"}>Hạn {fmtDate(r.deadline)}</div></div> },
        { key: "k", header: "Chi phí", align: "right", sortValue: (r) => r.cost, cell: (r) => (r.status === "hoan_thanh" ? fmtMoneyShort(r.cost) : <span className="text-slate-300">—</span>) },
        { key: "s", header: "Trạng thái", sortValue: (r) => flowLabel(r, ST), cell: (r) => <FlowBadge r={r} st={ST} labels={LB} /> },
      ]}
      rowActions={(r) => <FlowActions r={r} collection="repairs" st={ST} noun="đề nghị sửa chữa" resultFields={RESULT} />}
      detailView={(r, ctx) => (
        <FlowDetail r={r} collection="repairs" st={ST} labels={LB} noun="đề nghị sửa chữa" ctx={ctx} canEdit={r.status === "moi"} resultFields={RESULT}
          title={r.content}
          info={[["Thiết bị", `${eq(r.equipmentId)?.code} – ${eq(r.equipmentId)?.name}`], ["Loại sửa chữa", REPAIR_LEVEL[r.level]?.label ?? r.level]]}
          result={[["Kết quả sửa chữa", r.result], ["Chi phí sửa chữa", `${fmtVnd(r.cost)} đ`]]} />
      )}
      fields={[
        { key: "equipmentId", label: "Thiết bị", type: "select", options: equipmentOptions, required: true, wide: true },
        { key: "level", label: "Loại sửa chữa", type: "select", options: toOptions(REPAIR_LEVEL) },
        { key: "deadline", label: "Thời hạn hoàn thành", type: "date", required: true },
        { key: "content", label: "Nội dung cần sửa chữa", type: "textarea", required: true },
        { key: "assigneeId", label: "Giao cho", type: "select", options: (d) => userOptions(d, (u) => u.role === "phong_thiet_bi" || u.role === "chi_huy_truong"), required: true, wide: true },
      ]}
    />
  );
}
