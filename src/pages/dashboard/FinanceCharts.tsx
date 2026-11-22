import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDb } from "@/hooks/useDb";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { revenueCost, revenueCostCumulative } from "@/services/selectors";
import { fmtNumber } from "@/utils/format";

const ty = (v: number) => `${fmtNumber(v / 1e9, v >= 1e11 ? 0 : 1)} tỷ`;
const vnd = (v: number) => `${Math.round(v).toLocaleString("vi-VN")} VNĐ`;

type TrendRow = ReturnType<typeof revenueCostCumulative>[number];
function TrendTip({ active, payload, year }: { active?: boolean; payload?: { payload: TrendRow }[]; year: number }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const row = (label: string, v: number | null, color: string, dashed = false) => (
    <div className="flex items-center justify-between gap-6"><span className="flex items-center gap-1.5"><span className="inline-block w-3 border-t-2" style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }} />{label}</span><b className="tabular">{v == null ? "—" : ty(v)}</b></div>
  );
  return (
    <div className="min-w-[250px] rounded-lg border bg-white p-2.5 text-[12px] shadow-lg">
      <div className="mb-1.5 font-semibold text-slate-700">Lũy kế đến hết tháng {Number(d.month.slice(5))}/{year}</div>
      {row("Doanh thu thực tế", d.rev, GREEN)}
      {row("Doanh thu kế hoạch", d.planRev, GREEN, true)}
      {row("Chi phí thực tế", d.cost, ORANGE)}
      {row("Chi phí kế hoạch", d.planCost, ORANGE, true)}
    </div>
  );
}

const GREEN = "#16A34A";
const ORANGE = "#F97316";

/** Doanh thu – chi phí lũy kế từ đầu năm: kế hoạch (nét đứt) và thực tế (nét liền), lọc theo dự án ngay trong biểu đồ */
export function RevenueCostTrend({ projectIds, year }: { projectIds: Set<string>; year: number }) {
  const { db } = useDb();
  const [pid, setPid] = useState("");
  const options = db.projects.filter((p) => projectIds.has(p.id));
  const ids = pid && projectIds.has(pid) ? new Set([pid]) : projectIds;
  const data = revenueCostCumulative(db, ids, year);
  const last = [...data].reverse().find((d) => d.rev != null);
  const pct = (a?: number | null, b?: number) => (b ? `${Math.round(((a ?? 0) / b) * 100)}%` : "—");
  return (
    <Card>
      <CardHeader className="flex-wrap items-start gap-2">
        <div>
          <CardTitle>Doanh thu – Chi phí lũy kế năm {year}</CardTitle>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Cộng dồn từ đầu năm · nét liền: thực tế, nét đứt: kế hoạch
            {last && <> · đến {last.label}: doanh thu <b className="text-slate-800">{ty(last.rev!)}</b> ({pct(last.rev, last.planRev)} KH), chi phí <b className="text-slate-800">{ty(last.cost!)}</b> ({pct(last.cost, last.planCost)} KH)</>}
          </p>
        </div>
        <select value={pid} onChange={(e) => setPid(e.target.value)} className="h-8 max-w-[260px] rounded-md border border-slate-300 bg-white px-2 text-[12.5px]">
          <option value="">Tất cả dự án ({options.length})</option>
          {options.map((p) => <option key={p.id} value={p.id}>{p.shortName}</option>)}
        </select>
      </CardHeader>
      <div className="h-80 px-2 pb-2">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid stroke="#eef2f6" vertical={false} />
            <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 11.5 }} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={ty} width={64} tick={{ fontSize: 11.5 }} />
            <Tooltip content={<TrendTip year={year} />} />
            <Legend verticalAlign="top" height={28} />
            <Line type="linear" dataKey="rev" name="Doanh thu thực tế" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} connectNulls={false} />
            <Line type="linear" dataKey="planRev" name="Doanh thu kế hoạch" stroke={GREEN} strokeWidth={1.75} strokeDasharray="6 4" dot={false} />
            <Line type="linear" dataKey="cost" name="Chi phí thực tế" stroke={ORANGE} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} connectNulls={false} />
            <Line type="linear" dataKey="planCost" name="Chi phí kế hoạch" stroke={ORANGE} strokeWidth={1.75} strokeDasharray="6 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/** Biểu đồ cột phân bổ doanh thu hoặc chi phí theo dự án trong năm đang lọc; chi phí chia 4 khoản mục (cột chồng) */
export function ByProjectBar({ projectIds, kind, year }: { projectIds: Set<string>; kind: "revenue" | "cost"; year: number }) {
  const { db } = useDb();
  const [sort, setSort] = useState<"value" | "name">("value");
  const rc = revenueCost(db, projectIds, year).byProject;
  const data = db.projects.filter((p) => projectIds.has(p.id)).map((p) => {
    const x = rc.get(p.id);
    return { id: p.id, name: p.shortName, value: x?.[kind] ?? 0 };
  }).sort((a, b) => (sort === "value" ? b.value - a.value : a.name.localeCompare(b.name, "vi")));
  const total = data.reduce((s, d) => s + d.value, 0);
  const width = Math.max(560, data.length * 64);
  return (
    <Card className="min-w-0">
      <CardHeader className="items-start">
        <div><CardTitle>{kind === "revenue" ? "Phân bổ doanh thu theo dự án" : "Phân bổ chi phí theo dự án"}</CardTitle><p className="mt-0.5 text-[12px] text-slate-500">Năm {year} · tổng <b className="text-slate-800">{ty(total)}</b></p></div>
        <select value={sort} onChange={(e) => setSort(e.target.value as "value" | "name")} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[12.5px]"><option value="value">Xếp theo số tiền</option><option value="name">Xếp theo tên dự án</option></select>
      </CardHeader>
      <div className="scrollbar-visible overflow-x-auto px-2 pb-2">
        <div style={{ width, height: 320 }}>
          <BarChart width={width} height={320} data={data} margin={{ left: 8, right: 8, top: 8, bottom: 70 }}>
            <CartesianGrid stroke="#eef2f6" vertical={false} />
            <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" tickLine={false} tick={{ fontSize: 11 }} height={70} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={ty} width={64} tick={{ fontSize: 11.5 }} />
            <Tooltip formatter={(v: number) => [vnd(v), kind === "revenue" ? "Doanh thu" : "Chi phí"]} cursor={{ fill: "#f1f5f9" }} />
            <Bar dataKey="value" fill={kind === "revenue" ? GREEN : ORANGE} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </div>
      </div>
    </Card>
  );
}
