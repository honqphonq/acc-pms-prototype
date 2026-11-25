import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Scale } from "lucide-react";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserCell } from "@/components/common/UserAvatar";
import { AcceptanceFormDialog } from "./AcceptanceFormDialog";
import { acceptanceValue } from "@/services/selectors";
import { ACCEPTANCE_STATUS } from "@/utils/constants";
import { fmtDate, fmtMoneyShort } from "@/utils/format";
import type { AcceptanceRecord } from "@/types";
import { activeProjects } from "@/utils/labels";

export default function AcceptanceListPage() {
  const { db } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const loading = useSimulatedLoading();
  const [projectId, setProjectId] = useQueryParam("project");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const base = db.acceptanceRecords.filter((a) => !projectId || a.projectId === projectId);
  const rows = base.filter((a) => !status || a.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sumBy = (f: (a: AcceptanceRecord) => boolean) => base.filter(f).reduce((s, a) => s + acceptanceValue(db, a), 0);
  const paidFor = (a: AcceptanceRecord) => db.paymentRecords.find((p) => p.acceptanceIds.includes(a.id));

  const cols: Column<AcceptanceRecord>[] = [
    { key: "code", header: "Hồ sơ", sortValue: (a) => a.code, cell: (a) => <div className="min-w-[260px]"><div className="font-semibold text-slate-800">{a.title}</div><div className="text-[11px] text-slate-400">{a.code} · {a.phase} · {a.lines.length} công việc</div></div> },
    { key: "p", header: "Dự án", sortValue: (a) => a.projectId, cell: (a) => <span className="whitespace-nowrap text-xs">{db.projects.find((p) => p.id === a.projectId)?.shortName}</span> },
    { key: "v", header: "Giá trị NT", align: "right", sortValue: (a) => acceptanceValue(db, a), cell: (a) => <b className="whitespace-nowrap">{fmtMoneyShort(acceptanceValue(db, a))}</b> },
    { key: "by", header: "Người lập", cell: (a) => <UserCell userId={a.createdById} /> },
    { key: "d", header: "Ngày lập / NT", sortValue: (a) => a.createdAt, cell: (a) => <div className="whitespace-nowrap text-xs">{fmtDate(a.createdAt)}<div className="text-slate-400">{a.acceptedAt ? `NT: ${fmtDate(a.acceptedAt)}` : ""}</div></div> },
    { key: "st", header: "Trạng thái", sortValue: (a) => a.status, cell: (a) => <StatusBadge map={ACCEPTANCE_STATUS} value={a.status} /> },
    { key: "pay", header: "Thanh toán", cell: (a) => { const p = paidFor(a); return p ? <span className="text-xs text-success-fg">{p.code}</span> : a.status === "da_nghiem_thu" ? <span className="text-xs text-amber-600">Chưa lập HSTT</span> : <span className="text-slate-300">—</span>; } },
  ];
  return (
    <div>
      <PageHeader title="Hồ sơ nghiệm thu" description="Lập hồ sơ nghiệm thu từ khối lượng thi công thực tế, theo dõi trạng thái trình TVGS – Chủ đầu tư, làm căn cứ thanh toán."
        actions={<>
          <Button variant="outline" onClick={() => navigate(`/acceptance/reconcile${projectId ? `?project=${projectId}` : ""}`)}><Scale /> Đối chiếu khối lượng</Button>
          {can("acceptance.edit") && <Button onClick={() => setOpen(true)}><Plus /> Lập hồ sơ nghiệm thu</Button>}
        </>}
      />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Tổng số hồ sơ" value={base.length} tone="navy" sub={`${base.filter((a) => a.status === "nhap").length} đang lập`} />
        <KpiCard label="Giá trị đã nghiệm thu" value={fmtMoneyShort(sumBy((a) => a.status === "da_nghiem_thu"))} tone="success" onClick={() => setStatus("da_nghiem_thu")} sub={`${base.filter((a) => a.status === "da_nghiem_thu").length} hồ sơ`} />
        <KpiCard label="Đang chờ TVGS / CĐT" value={fmtMoneyShort(sumBy((a) => a.status === "cho_tvgs" || a.status === "cho_cdt"))} tone="warning" sub={`${base.filter((a) => a.status === "cho_tvgs" || a.status === "cho_cdt").length} hồ sơ`} />
        <KpiCard label="Đã NT chưa lập HSTT" value={base.filter((a) => a.status === "da_nghiem_thu" && !paidFor(a)).length} unit="hồ sơ" tone="info" onClick={() => navigate("/finance/payments")} sub="Chuyển sang hồ sơ thanh toán" />
      </div>
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(a) => a.id} loading={loading} onRowClick={(a) => navigate(`/acceptance/${a.id}`)} resetKey={projectId + status}
          searchText={(a) => `${a.code} ${a.title}`} searchPlaceholder="Tìm hồ sơ..."
          toolbar={<>
            <FilterSelect value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />
            <FilterSelect value={status} onChange={setStatus} allLabel="Tất cả trạng thái" options={Object.entries(ACCEPTANCE_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} />
          </>}
        />
      </Card>
      <AcceptanceFormDialog open={open} onOpenChange={setOpen} projectId={projectId || undefined} />
    </div>
  );
}
