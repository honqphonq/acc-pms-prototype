import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDb } from "@/hooks/useDb";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { CATEGORY_LABELS } from "@/utils/constants";
import { fmtNumber } from "@/utils/format";
import type { Project } from "@/types";

/** Quản lý gói thầu – danh sách gói thầu của các công trình */
export default function PackagesPage() {
  const { db } = useDb();
  const navigate = useNavigate();
  const loading = useSimulatedLoading();
  const [category, setCategory] = useState("");
  const rows = db.projects.filter((p) => !category || p.category === category);

  const cols: Column<Project>[] = [
    { key: "pkg", header: "Gói thầu", sortValue: (p) => p.packageName, cell: (p) => <div className="min-w-[260px] font-medium text-slate-800">{p.packageName}</div> },
    { key: "proj", header: "Công trình", sortValue: (p) => p.name, cell: (p) => <div className="min-w-[220px]"><div className="text-slate-700">{p.name}</div><div className="text-[11px] text-slate-400">{p.code} · {p.location}</div></div> },
    { key: "inv", header: "Chủ đầu tư", sortValue: (p) => p.investor, cell: (p) => <div className="min-w-[200px] max-w-[280px] text-xs text-slate-600">{p.investor}</div> },
    { key: "cat", header: "Loại công trình", cell: (p) => <span className="whitespace-nowrap text-xs">{CATEGORY_LABELS[p.category].replace("Công trình ", "").replace(/^./, (c) => c.toUpperCase())}</span> },
    { key: "val", header: "Giá gói thầu (tỷ)", align: "right", sortValue: (p) => p.contractValue, cell: (p) => fmtNumber(p.contractValue / 1e9) },
    { key: "st", header: "Tình trạng", cell: (p) => (p.approvalStatus === "cho_duyet" ? <Badge tone="warning">Chờ duyệt nhận thi công</Badge> : p.approvalStatus === "tu_choi" ? <Badge tone="danger">Không nhận thầu</Badge> : <Badge tone="success">Đã trúng thầu</Badge>) },
  ];
  return (
    <div>
      <PageHeader title="Quản lý gói thầu" description={`${db.projects.length} gói thầu`} />
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(p) => p.id} loading={loading} onRowClick={(p) => navigate(`/projects/${p.id}`)} searchText={(p) => `${p.packageName} ${p.name} ${p.investor}`} searchPlaceholder="Tìm gói thầu, công trình, chủ đầu tư..."
          toolbar={<FilterSelect value={category} onChange={setCategory} allLabel="Tất cả loại công trình" options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />} />
      </Card>
    </div>
  );
}
