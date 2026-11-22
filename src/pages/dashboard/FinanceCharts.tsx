import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDb } from "@/hooks/useDb";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { COST_KEYS, COST_LABEL, revenueCost, revenueCostCumulative, type CostBreakdown } from "@/services/selectors";
import { fmtNumber } from "@/utils/format";

const ty = (v: number) => `${fmtNumber(v / 1e9, v >= 1e11 ? 0 : 1)} tỷ`;
const vnd = (v: number) => `${Math.round(v).toLocaleString("vi-VN")} VNĐ`;
const NOTE = "Doanh thu = giá trị khối lượng thực hiện (khối lượng × đơn giá HĐ). Chi phí = chi phí thực tế phát sinh, nguồn: Kế toán (dữ liệu mẫu) – NVLTT, NCTT, CPMTC, CPSXC.";

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
      {d.breakdown && <div className="my-1 ml-5 space-y-0.5 border-l pl-2 text-slate-500">{COST_KEYS.map((k) => <div key={k} className="flex justify-between gap-4"><span>{COST_LABEL[k].short}</span><span className="tabular">{ty((d.breakdown as CostBreakdown)[k])}</span></div>)}</div>}
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
      <p className="border-t px-4 py-2 text-[11.5px] text-slate-500">{NOTE} Kế hoạch: doanh thu theo tiến độ kế hoạch các công việc, chi phí theo dự toán chi phí dự án.</p>
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
    return { id: p.id, name: p.shortName, value: x?.[kind] ?? 0, nvl: x?.nvl ?? 0, nc: x?.nc ?? 0, mtc: x?.mtc ?? 0, sxc: x?.sxc ?? 0 };
  }).sort((a, b) => (sort === "value" ? b.value - a.value : a.name.localeCompare(b.name, "vi")));
  const total = data.reduce((s, d) => s + d.value, 0);
  const width = Math.max(560, data.length * 64);
  return (
    <Card className="min-w-0">
      <CardHeader className="items-start">
        <div><CardTitle>{kind === "revenue" ? "Phân bổ doanh thu theo dự án" : "Phân bổ chi phí theo dự án"}</CardTitle><p className="mt-0.5 text-[12px] text-slate-500">Năm {year} · tổng <b className="text-slate-800">{ty(total)}</b>{kind === "cost" && <> · nguồn: Kế toán</>}</p>
          {kind === "cost" && <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-600">{COST_KEYS.map((k) => <span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COST_LABEL[k].color }} />{COST_LABEL[k].short}</span>)}</div>}</div>
        <select value={sort} onChange={(e) => setSort(e.target.value as "value" | "name")} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[12.5px]"><option value="value">Xếp theo số tiền</option><option value="name">Xếp theo tên dự án</option></select>
      </CardHeader>
      <div className="scrollbar-visible overflow-x-auto px-2 pb-2">
        <div style={{ width, height: 340 }}>
          <BarChart width={width} height={340} data={data} margin={{ left: 8, right: 8, top: 8, bottom: 70 }}>
            <CartesianGrid stroke="#eef2f6" vertical={false} />
            <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" tickLine={false} tick={{ fontSize: 11 }} height={70} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={ty} width={64} tick={{ fontSize: 11.5 }} />
            {kind === "revenue" ? (
              <>
                <Tooltip formatter={(v: number) => [vnd(v), "Doanh thu"]} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="value" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </>
            ) : (
              <>
                <Tooltip formatter={(v: number, n) => [ty(v), n]} cursor={{ fill: "#f1f5f9" }} />
                {COST_KEYS.map((k, i) => <Bar key={k} dataKey={k} name={COST_LABEL[k].short} stackId="c" fill={COST_LABEL[k].color} maxBarSize={36} radius={i === COST_KEYS.length - 1 ? [4, 4, 0, 0] : 0} />)}
              </>
            )}
          </BarChart>
        </div>
      </div>
      <p className="border-t px-4 py-2 text-[11.5px] text-slate-500">{kind === "cost" ? "NVLTT: nguyên vật liệu trực tiếp · NCTT: nhân công trực tiếp · CPMTC: chi phí máy thi công · CPSXC: chi phí sản xuất chung. Nguồn: Kế toán (dữ liệu mẫu)." : "Doanh thu = giá trị khối lượng thực hiện (khối lượng × đơn giá HĐ)."}</p>
    </Card>
  );
}
