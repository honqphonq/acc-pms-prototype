import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDb } from "@/hooks/useDb";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PROJECT_STATUS } from "@/utils/constants";
import { fmtDate, fmtNumber } from "@/utils/format";
import type { Project } from "@/types";

/** Quản lý hợp đồng nhận thầu – hợp đồng ký với Chủ đầu tư */
export default function ContractsPage() {
  const { db } = useDb();
  const navigate = useNavigate();
  const loading = useSimulatedLoading();
  const [unit, setUnit] = useState("");
  const rows = db.projects.filter((p) => !unit || p.unitId === unit);

  const cols: Column<Project>[] = [
    { key: "no", header: "Số hợp đồng", sortValue: (p) => p.contractNo, cell: (p) => <span className="whitespace-nowrap font-medium text-slate-800">{p.contractNo}</span> },
    { key: "date", header: "Ngày ký", sortValue: (p) => p.contractDate, cell: (p) => <span className="whitespace-nowrap">{fmtDate(p.contractDate)}</span> },
    { key: "proj", header: "Công trình", sortValue: (p) => p.name, cell: (p) => <div className="min-w-[240px] text-slate-700">{p.name}</div> },
    { key: "inv", header: "Chủ đầu tư", cell: (p) => <div className="min-w-[200px] max-w-[280px] text-xs text-slate-600">{p.investor}</div> },
    { key: "unit", header: "Đơn vị thực hiện", cell: (p) => <span className="whitespace-nowrap text-xs">{db.departments.find((d) => d.id === p.unitId)?.code}</span> },
    { key: "val", header: "Giá trị HĐ (tỷ)", align: "right", sortValue: (p) => p.contractValue, cell: (p) => fmtNumber(p.contractValue / 1e9) },
    { key: "time", header: "Thời gian thực hiện", sortValue: (p) => p.startDate, cell: (p) => <span className="whitespace-nowrap text-xs">{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</span> },
    { key: "st", header: "Trạng thái", cell: (p) => <StatusBadge map={PROJECT_STATUS} value={p.status} dot={false} /> },
  ];
  return (
    <div>
      <PageHeader title="Quản lý hợp đồng nhận thầu" description={`${db.projects.length} hợp đồng · tổng giá trị ${fmtNumber(db.projects.reduce((s, p) => s + p.contractValue, 0) / 1e9, 0)} tỷ đồng`} />
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(p) => p.id} loading={loading} onRowClick={(p) => navigate(`/projects/${p.id}`)} searchText={(p) => `${p.contractNo} ${p.name} ${p.investor}`} searchPlaceholder="Tìm số hợp đồng, công trình, chủ đầu tư..."
          toolbar={<FilterSelect value={unit} onChange={setUnit} allLabel="Tất cả đơn vị" options={db.departments.filter((d) => d.type === "cong_ty_con").map((d) => ({ value: d.id, label: d.code }))} />} />
      </Card>
    </div>
  );
}
