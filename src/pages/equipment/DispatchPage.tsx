import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserCell } from "@/components/common/UserAvatar";
import { KpiCard } from "@/components/common/KpiCard";
import { Stepper } from "@/components/common/Workflow";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { DispatchDialog } from "./EquipmentDialogs";
import { approveDispatch, recallEquipment, rejectDispatch } from "@/services/actions";
import { Badge } from "@/components/ui/badge";
import { ASSIGNMENT_STATUS } from "@/utils/constants";
import { fmtDate } from "@/utils/format";
import type { EquipmentAssignment } from "@/types";

export default function DispatchPage() {
  const { db, run } = useDb();
  const { can, user } = useAuth();
  const [kind, setKind] = useState("");
  const kindOf = (a: EquipmentAssignment) => a.kind === "thu_hoi" ? "thu_hoi" : a.fromProjectId && a.fromProjectId !== a.toProjectId ? "dieu_chuyen" : "phan_bo";
  const KIND: Record<string, { label: string; tone: "info" | "purple" | "neutral" }> = { phan_bo: { label: "Phân bổ về dự án", tone: "info" }, dieu_chuyen: { label: "Điều chuyển dự án", tone: "purple" }, thu_hoi: { label: "Thu hồi về TCT", tone: "neutral" } };
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [open, setOpen] = useState(false);
  const rows = db.equipmentAssignments.filter((a) => (!status || a.status === status) && (!kind || kindOf(a) === kind) && (!projectId || a.toProjectId === projectId || a.fromProjectId === projectId)).sort((a, b) => (a.status === "cho_duyet" ? -1 : 0) - (b.status === "cho_duyet" ? -1 : 0) || b.createdAt.localeCompare(a.createdAt));
  const eq = (id: string) => db.equipment.find((e) => e.id === id);
  const pn = (id: string | null) => db.projects.find((p) => p.id === id)?.shortName;

  const cols: Column<EquipmentAssignment>[] = [
    { key: "code", header: "Số quyết định", sortValue: (a) => a.code, cell: (a) => <div><div className="font-medium">{a.code}</div><div className="text-[11px] text-slate-400">Lập {fmtDate(a.createdAt)}</div></div> },
    { key: "eq", header: "Thiết bị", sortValue: (a) => eq(a.equipmentId)?.code, cell: (a) => <Link to={`/equipment/${a.equipmentId}`} className="hover:text-primary" onClick={(e) => e.stopPropagation()}><div className="font-medium">{eq(a.equipmentId)?.code} – {eq(a.equipmentId)?.name}</div><div className="text-[11px] text-slate-400">{eq(a.equipmentId)?.group}</div></Link> },
    { key: "kind", header: "Loại", cell: (a) => <Badge tone={KIND[kindOf(a)].tone}>{KIND[kindOf(a)].label}</Badge> },
    { key: "route", header: "Từ → Đến", cell: (a) => <div className="text-xs"><span className="text-slate-500">{pn(a.fromProjectId) ?? "Kho TCT"}</span> → <b className="text-slate-800">{pn(a.toProjectId) ?? "Kho TCT"}</b></div> },
    { key: "time", header: "Thời gian", sortValue: (a) => a.startDate, cell: (a) => <span className="whitespace-nowrap text-xs">{fmtDate(a.startDate)} – {fmtDate(a.endDate)}</span> },
    { key: "req", header: "Đề nghị bởi", cell: (a) => <UserCell userId={a.requesterId} /> },
    { key: "st", header: "Trạng thái", sortValue: (a) => a.status, cell: (a) => <StatusBadge map={ASSIGNMENT_STATUS} value={a.status} /> },
    {
      key: "act", header: "", cell: (a) => a.status === "dang_dieu_dong" && can("equipment.dispatch.approve") ? (
        <Button size="xs" variant="outline" onClick={async () => { if (await confirm({ title: `Thu hồi ${eq(a.equipmentId)?.code} về Tổng công ty?`, description: `Kết thúc điều động tại ${pn(a.toProjectId)}.` })) { run(recallEquipment, a.id, user!.id); toast.success("Đã thu hồi thiết bị về kho TCT"); } }}>Thu hồi</Button>
      ) : a.status === "cho_duyet" && can("equipment.dispatch.approve") && (
        <div className="flex gap-1">
          <Button size="xs" variant="success" onClick={async () => { if (await confirm({ title: `Duyệt điều động ${eq(a.equipmentId)?.code}?`, description: `Ban hành quyết định điều động đến ${pn(a.toProjectId)}. ${a.reason}` })) { run(approveDispatch, a.id, a.operatorId ?? db.users.find((u) => u.isOperator && !db.equipment.some((e) => e.operatorId === u.id))?.id ?? null); toast.success("Đã ban hành quyết định điều động"); } }}><Check /> Duyệt</Button>
          <Button size="xs" variant="outline" onClick={() => { run(rejectDispatch, a.id); toast.success("Đã từ chối đề nghị"); }}><X /></Button>
        </div>
      ),
    },
  ];
  return (
    <div>
      <PageHeader title="Phân bổ, điều động xe máy thiết bị" description="Đề xuất nhu cầu XMTB của dự án → phê duyệt → phân bổ về dự án, giao người vận hành; điều chuyển sang dự án khác; thu hồi về TCT; lịch sử điều động." actions={(can("equipment.dispatch.request") || can("equipment.dispatch.approve")) && <Button onClick={() => setOpen(true)}><Plus /> Lập điều động</Button>} />
      <Card className="mb-4 p-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">QT phân bổ, điều động XMTB</div>
        <Stepper steps={["B1: Đề xuất nhu cầu XMTB của dự án", "B2: Phê duyệt đề xuất", "B3: Phân bổ XMTB về dự án", "B4: Phân ca & nhật trình (màn Phân ca và nhật trình)", "B5: Điều chuyển / thu hồi về TCT"]} current={2} />
      </Card>
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Đề nghị chờ duyệt" value={db.equipmentAssignments.filter((a) => a.status === "cho_duyet").length} tone="warning" onClick={() => setStatus("cho_duyet")} sub="Bấm để lọc" />
        <KpiCard label="Đang điều động" value={db.equipmentAssignments.filter((a) => a.status === "dang_dieu_dong").length} tone="success" />
        <KpiCard label="Thiết bị nhàn rỗi sẵn sàng" value={db.equipment.filter((e) => e.status === "nhan_roi").length} tone="info" />
        <KpiCard label="Thiết bị thuê ngoài" value={db.equipment.filter((e) => e.ownership === "thue_ngoai").length} tone="navy" />
      </div>
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(a) => a.id} loading={loading} resetKey={status + projectId + kind}
          searchText={(a) => `${a.code} ${eq(a.equipmentId)?.code} ${eq(a.equipmentId)?.name} ${pn(a.toProjectId)}`} searchPlaceholder="Tìm quyết định, thiết bị..."
          rowClassName={(a) => (a.status === "cho_duyet" ? "bg-amber-50/50" : undefined)}
          toolbar={<>
            <FilterSelect value={status} onChange={setStatus} allLabel="Tất cả trạng thái" options={Object.entries(ASSIGNMENT_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} />
            <FilterSelect value={kind} onChange={setKind} allLabel="Tất cả loại" options={Object.entries(KIND).map(([v, l]) => ({ value: v, label: l.label }))} />
            <FilterSelect value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={db.projects.map((p) => ({ value: p.id, label: p.shortName }))} />
          </>}
        />
      </Card>
      <DispatchDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
