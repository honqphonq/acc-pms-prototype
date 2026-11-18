import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { saveRow } from "@/services/actions";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate, fmtMoneyShort } from "@/utils/format";
import { REPAIR_LEVEL, REPAIR_STATUS, equipmentOptions, toOptions, userOptions } from "@/utils/labels";
import type { RepairRequest } from "@/types";

export default function RepairsPage() {
  const { db, run } = useDb();
  const eq = (id: string) => db.equipment.find((e) => e.id === id);
  const late = (r: RepairRequest) => r.status !== "hoan_thanh" && r.deadline < DEMO_TODAY;
  return (
    <RegistryPage<RepairRequest>
      title="Sửa chữa xe máy thiết bị" entityLabel="đề nghị sửa chữa" addLabel="Tạo đề nghị sửa chữa" codePrefix="ĐNSC-2026-" collection="repairs"
      description="Đề nghị sửa chữa nhỏ / vừa / lớn giao cho người phụ trách kèm thời hạn; cập nhật kết quả và hồ sơ sửa chữa (biên bản kiểm tra, nghiệm thu, hợp đồng, hóa đơn, quyết toán)."
      searchText={(r) => `${r.code} ${r.content} ${eq(r.equipmentId)?.code}`}
      filters={[{ label: "Tất cả loại sửa chữa", options: toOptions(REPAIR_LEVEL), test: (r, v) => r.level === v }, { label: "Tất cả trạng thái", options: toOptions(REPAIR_STATUS), test: (r, v) => r.status === v }]}
      kpis={(rows) => [
        { label: "Đang sửa chữa", value: rows.filter((r) => r.status === "dang_sua").length, tone: "info" },
        { label: "Mới giao", value: rows.filter((r) => r.status === "moi").length, tone: "warning" },
        { label: "Quá hạn", value: rows.filter(late).length, tone: "danger" },
        { label: "Chi phí sửa chữa", value: fmtMoneyShort(rows.reduce((s, r) => s + r.cost, 0)), tone: "navy" },
      ]}
      newRecord={() => ({ level: "nho", status: "moi", createdAt: DEMO_TODAY, deadline: DEMO_TODAY, cost: 0, result: "", documents: "", assigneeId: "u13" })}
      rowClassName={(r) => (late(r) ? "bg-rose-50/40" : undefined)}
      columns={[
        { key: "c", header: "Số đề nghị", sortValue: (r) => r.code, cell: (r) => <span className="whitespace-nowrap font-medium">{r.code}</span> },
        { key: "e", header: "Thiết bị", cell: (r) => <div className="text-xs"><div className="font-medium text-slate-800">{eq(r.equipmentId)?.code}</div><div className="text-slate-400">{eq(r.equipmentId)?.name}</div></div> },
        { key: "t", header: "Nội dung", cell: (r) => <span className="text-[13px]">{r.content}</span> },
        { key: "l", header: "Loại", cell: (r) => <StatusBadge map={REPAIR_LEVEL} value={r.level} dot={false} /> },
        { key: "a", header: "Người phụ trách / hạn", sortValue: (r) => r.deadline, cell: (r) => <div className="whitespace-nowrap text-xs"><div>{db.users.find((u) => u.id === r.assigneeId)?.name}</div><div className={late(r) ? "font-semibold text-rose-600" : "text-slate-400"}>Hạn {fmtDate(r.deadline)}</div></div> },
        { key: "k", header: "Chi phí", align: "right", sortValue: (r) => r.cost, cell: (r) => fmtMoneyShort(r.cost) },
        { key: "s", header: "Trạng thái", cell: (r) => <StatusBadge map={REPAIR_STATUS} value={r.status} /> },
      ]}
      rowActions={(r) => r.status === "moi" ? <Button size="xs" variant="soft" onClick={() => { run(saveRow, "repairs", { ...r, status: "dang_sua" }); toast.success("Đã tiếp nhận sửa chữa"); }}>Tiếp nhận</Button> : r.status === "dang_sua" ? <Button size="xs" variant="soft" onClick={() => { run(saveRow, "repairs", { ...r, status: "hoan_thanh", result: r.result || "Đã sửa chữa xong, chạy thử đạt yêu cầu" }); toast.success("Đã cập nhật kết quả sửa chữa"); }}>Hoàn thành</Button> : null}
      fields={[
        { key: "equipmentId", label: "Thiết bị", type: "select", options: equipmentOptions, required: true, wide: true },
        { key: "level", label: "Loại sửa chữa", type: "select", options: toOptions(REPAIR_LEVEL) },
        { key: "status", label: "Trạng thái", type: "select", options: toOptions(REPAIR_STATUS) },
        { key: "content", label: "Nội dung sửa chữa", type: "textarea", required: true },
        { key: "assigneeId", label: "Giao cho", type: "select", options: (d) => userOptions(d, (u) => u.role === "phong_thiet_bi") },
        { key: "deadline", label: "Thời hạn hoàn thành", type: "date" },
        { key: "cost", label: "Chi phí (đ)", type: "number" },
        { key: "createdAt", label: "Ngày đề nghị", type: "date" },
        { key: "result", label: "Kết quả sửa chữa", type: "textarea" },
        { key: "documents", label: "Hồ sơ sửa chữa", wide: true, hint: "BB kiểm tra trước sửa chữa, nghiệm thu, hợp đồng, hóa đơn, thanh lý, quyết toán" },
      ]}
    />
  );
}
