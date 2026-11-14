import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { ChartCard } from "@/components/common/ChartCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getProjectStatsMap, type ProjectStats } from "@/services/selectors";
import { updateProject } from "@/services/actions";
import { CHART_COLORS, SERIES, SETTLEMENT_STATUS } from "@/utils/constants";
import { fmtMoneyShort, fmtNumber, fmtPct } from "@/utils/format";
import type { SettlementStatus } from "@/types";

export default function SettlementPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const loading = useSimulatedLoading();
  const stats = [...getProjectStatsMap(db).values()].filter((s) => s.project.status !== "chuan_bi");
  const total = (f: (s: ProjectStats) => number) => stats.reduce((x, s) => x + f(s), 0);
  const chart = stats.map((s) => ({ name: s.project.shortName, "Sản lượng thực hiện": +(s.execValue / 1e9).toFixed(1), "Đã nghiệm thu": +(s.acceptedValue / 1e9).toFixed(1), "Đã thu": +(s.paidValue / 1e9).toFixed(1) }));
  const cols: Column<ProjectStats>[] = [
    { key: "p", header: "Dự án", sortValue: (s) => s.project.name, cell: (s) => <div className="min-w-[200px] font-medium text-slate-800">{s.project.shortName}<div className="text-[11px] font-normal text-slate-400">{s.project.contractNo}</div></div> },
    { key: "c", header: "Giá trị HĐ", align: "right", sortValue: (s) => s.project.contractValue, cell: (s) => fmtMoneyShort(s.project.contractValue) },
    { key: "e", header: "Sản lượng", align: "right", sortValue: (s) => s.execValue, cell: (s) => fmtMoneyShort(s.execValue) },
    { key: "a", header: "Đã nghiệm thu", align: "right", sortValue: (s) => s.acceptedValue, cell: (s) => fmtMoneyShort(s.acceptedValue) },
    { key: "pd", header: "Đã thu", align: "right", sortValue: (s) => s.paidValue, cell: (s) => <b>{fmtMoneyShort(s.paidValue)}</b> },
    { key: "rv", header: "Thu hồi vốn (thu / sản lượng)", sortValue: (s) => s.paidValue / (s.execValue || 1), cell: (s) => <div className="w-36"><div className="mb-1 text-[11.5px]">{fmtPct(s.paidValue / (s.execValue || 1), 0)}</div><Progress value={s.paidValue / (s.execValue || 1)} tone="success" className="h-1.5" /></div> },
    { key: "rec", header: "Phải thu (NT − đã thu)", align: "right", sortValue: (s) => s.acceptedValue - s.paidValue, cell: (s) => <span className="text-amber-600">{fmtMoneyShort(Math.max(0, s.acceptedValue - s.paidValue))}</span> },
    {
      key: "st", header: "Quyết toán", cell: (s) => can("payment.edit") ? (
        <select value={s.project.settlementStatus} onClick={(e) => e.stopPropagation()} onChange={(e) => { run(updateProject, s.project.id, { settlementStatus: e.target.value as SettlementStatus }); toast.success(`Cập nhật quyết toán: ${SETTLEMENT_STATUS[e.target.value as SettlementStatus].label}`); }} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs">
          {Object.entries(SETTLEMENT_STATUS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
        </select>
      ) : <StatusBadge map={SETTLEMENT_STATUS} value={s.project.settlementStatus} />,
    },
  ];
  return (
    <div>
      <PageHeader title="Tình hình thanh quyết toán" description="Tổng hợp giá trị hợp đồng – sản lượng – nghiệm thu – thanh toán – thu hồi vốn theo từng dự án." />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Sản lượng thực hiện" value={fmtNumber(total((s) => s.execValue) / 1e9, 0)} unit="tỷ đồng" tone="info" />
        <KpiCard label="Đã nghiệm thu" value={fmtNumber(total((s) => s.acceptedValue) / 1e9, 0)} unit="tỷ đồng" tone="warning" progress={total((s) => s.acceptedValue) / total((s) => s.execValue)} />
        <KpiCard label="Đã thu từ CĐT" value={fmtNumber(total((s) => s.paidValue) / 1e9, 0)} unit="tỷ đồng" tone="success" progress={total((s) => s.paidValue) / total((s) => s.execValue)} sub={`Thu hồi vốn ${fmtPct(total((s) => s.paidValue) / total((s) => s.execValue))} sản lượng`} />
        <KpiCard label="Dự án đang quyết toán" value={stats.filter((s) => s.project.settlementStatus !== "chua_quyet_toan").length} unit="dự án" tone="navy" />
      </div>
      <ChartCard className="mb-4" title="Sản lượng – nghiệm thu – đã thu theo dự án" description="Tỷ đồng">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={chart} margin={{ left: -4, right: 8 }} barGap={2}>
              <CartesianGrid stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="name" tickLine={false} interval={0} tick={{ fontSize: 10 }} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number, n) => [`${fmtNumber(v)} tỷ`, n]} cursor={{ fill: "#f1f5f9" }} />
              <Legend />
              <Bar dataKey="Sản lượng thực hiện" fill={CHART_COLORS.plan} radius={[4, 4, 0, 0]} maxBarSize={16} />
              <Bar dataKey="Đã nghiệm thu" fill={SERIES[3]} radius={[4, 4, 0, 0]} maxBarSize={16} />
              <Bar dataKey="Đã thu" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
      <Card><DataTable columns={cols} rows={stats} rowKey={(s) => s.project.id} loading={loading} onRowClick={(s) => navigate(`/projects/${s.project.id}`)} searchText={(s) => s.project.name} /></Card>
    </div>
  );
}
