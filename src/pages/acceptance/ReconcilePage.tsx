import { useState } from "react";
import { FilePlus2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { ChartCard } from "@/components/common/ChartCard";
import { AcceptanceFormDialog } from "./AcceptanceFormDialog";
import { reconcile, type ReconcileRow } from "@/services/selectors";
import { CHART_COLORS, SERIES } from "@/utils/constants";
import { fmtMoneyShort, fmtNumber, fmtPct } from "@/utils/format";

/** Đối chiếu khối lượng thi công thực tế – khối lượng nghiệm thu (căn cứ thanh toán) */
export default function ReconcilePage() {
  const { db } = useDb();
  const { can } = useAuth();
  const loading = useSimulatedLoading();
  const [projectId, setProjectId] = useQueryParam("project", "p01");
  const [onlyDiff, setOnlyDiff] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const all = reconcile(db, projectId).filter((r) => r.executed > 0);
  const rows = all.filter((r) => !onlyDiff || r.diff > 0.001);
  const execV = all.reduce((s, r) => s + r.executedValue, 0);
  const accV = all.reduce((s, r) => s + r.acceptedValue, 0);
  const pendV = all.reduce((s, r) => s + r.pending * r.task.unitPrice, 0);
  const items = db.constructionItems.filter((i) => i.projectId === projectId);
  const chart = items.map((it) => {
    const rs = all.filter((r) => r.task.itemId === it.id);
    return { name: it.name.length > 26 ? it.name.slice(0, 24) + "…" : it.name, "Thực hiện": +(rs.reduce((s, r) => s + r.executedValue, 0) / 1e9).toFixed(2), "Đã nghiệm thu": +(rs.reduce((s, r) => s + r.acceptedValue, 0) / 1e9).toFixed(2) };
  }).filter((x) => x["Thực hiện"] > 0);

  const cols: Column<ReconcileRow>[] = [
    { key: "t", header: "Công việc", sortValue: (r) => r.task.order, cell: (r) => <div className="min-w-[220px]"><div className="font-medium">{r.task.code} {r.task.name}</div><div className="text-[11px] text-slate-400">{db.constructionItems.find((i) => i.id === r.task.itemId)?.name}</div></div> },
    { key: "u", header: "ĐVT", cell: (r) => r.task.unit },
    { key: "e", header: "KL thực hiện", align: "right", sortValue: (r) => r.executed, cell: (r) => fmtNumber(r.executed) },
    { key: "a", header: "KL đã NT", align: "right", sortValue: (r) => r.accepted, cell: (r) => <b className="text-success-fg">{fmtNumber(r.accepted)}</b> },
    { key: "p", header: "Đang chờ NT", align: "right", sortValue: (r) => r.pending, cell: (r) => r.pending ? <span className="text-info-fg">{fmtNumber(r.pending)}</span> : <span className="text-slate-300">—</span> },
    { key: "d", header: "Chênh lệch", align: "right", sortValue: (r) => r.diff * r.task.unitPrice, cell: (r) => r.diff > 0.001 ? <span className="font-semibold text-amber-600">{fmtNumber(r.diff)}</span> : <span className="text-slate-300">0</span> },
    { key: "r", header: "Tỷ lệ NT / TH", sortValue: (r) => r.accepted / (r.executed || 1), cell: (r) => <div className="w-28"><div className="mb-1 text-[11.5px]">{fmtPct(r.accepted / (r.executed || 1), 0)}</div><Progress value={r.accepted / (r.executed || 1)} tone={r.accepted >= r.executed ? "success" : "warning"} className="h-1.5" /></div> },
    { key: "v", header: "GT chưa nghiệm thu", align: "right", sortValue: (r) => (r.diff - r.pending) * r.task.unitPrice, cell: (r) => fmtMoneyShort(Math.max(0, r.diff - r.pending) * r.task.unitPrice) },
    { key: "act", header: "", cell: (r) => can("acceptance.edit") && r.diff - r.pending > 0.001 && <Button size="xs" variant="soft" onClick={() => setOpen(r.task.itemId)}><FilePlus2 /> Lập NT</Button> },
  ];
  return (
    <div>
      <PageHeader title="Đối chiếu khối lượng thực hiện – nghiệm thu" description="Căn cứ để BP Kế toán đối chiếu khối lượng thi công thực tế tại công trường và khối lượng nghiệm thu dùng làm căn cứ thanh toán."
        actions={<><FilterSelect value={projectId} onChange={(v) => v && setProjectId(v)} allLabel="— Dự án —" options={db.projects.filter((p) => db.constructionPlans.some((t) => t.projectId === p.id)).map((p) => ({ value: p.id, label: p.shortName }))} />{can("acceptance.edit") && <Button onClick={() => setOpen("")}><FilePlus2 /> Lập hồ sơ nghiệm thu</Button>}</>} />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Giá trị thi công thực tế" value={fmtMoneyShort(execV)} tone="info" />
        <KpiCard label="Giá trị đã nghiệm thu" value={fmtMoneyShort(accV)} tone="success" progress={execV ? accV / execV : 0} sub={`${fmtPct(execV ? accV / execV : 0)} giá trị thực hiện`} />
        <KpiCard label="Đang chờ TVGS / CĐT" value={fmtMoneyShort(pendV)} tone="warning" />
        <KpiCard label="Chưa lập hồ sơ nghiệm thu" value={fmtMoneyShort(Math.max(0, execV - accV - pendV))} tone="danger" sub="Khối lượng đã thi công chưa được nghiệm thu" />
      </div>
      {chart.length > 0 && (
        <ChartCard className="mb-4" title="Giá trị thực hiện và nghiệm thu theo hạng mục" description="Tỷ đồng">
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ left: -10, right: 8 }} barGap={2}>
                <CartesianGrid stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="name" tickLine={false} interval={0} tick={{ fontSize: 10.5 }} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number, n) => [`${fmtNumber(v, 2)} tỷ`, n]} cursor={{ fill: "#f1f5f9" }} />
                <Legend />
                <Bar dataKey="Thực hiện" fill={CHART_COLORS.plan} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Đã nghiệm thu" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(r) => r.task.id} loading={loading} resetKey={projectId + onlyDiff} searchText={(r) => `${r.task.code} ${r.task.name}`}
          toolbar={<FilterSelect value={onlyDiff} onChange={setOnlyDiff} allLabel="Tất cả công việc" options={[{ value: "1", label: "Chỉ công việc có chênh lệch" }]} />} emptyTitle="Chưa có khối lượng thực hiện" />
      </Card>
      <AcceptanceFormDialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)} projectId={projectId} itemId={open || undefined} />
    </div>
  );
}
