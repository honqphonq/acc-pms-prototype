import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDb } from "@/hooks/useDb";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { revenueCost } from "@/services/selectors";
import { fmtNumber } from "@/utils/format";

const ty = (v: number) => `${fmtNumber(v / 1e9, v >= 1e11 ? 0 : 1)} tỷ`;
const vnd = (v: number) => `${Math.round(v).toLocaleString("vi-VN")} VNĐ`;
const NOTE = "Số liệu ước tính: doanh thu = giá trị khối lượng thực hiện; chi phí = doanh thu × hệ số chi phí dự án (chờ phân hệ kế toán).";

/** Doanh thu – chi phí 12 tháng gần nhất (toàn TCT / theo bộ lọc) */
export function RevenueCostTrend({ projectIds, scope }: { projectIds: Set<string>; scope: string }) {
  const { db } = useDb();
  const data = revenueCost(db, projectIds).months;
  return (
    <Card>
      <CardHeader className="items-start"><div><CardTitle>Doanh thu – Chi phí</CardTitle><p className="mt-0.5 text-[12px] text-slate-500">12 tháng gần nhất · {scope}</p></div></CardHeader>
      <div className="h-72 px-2 pb-2">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid stroke="#eef2f6" vertical={false} />
            <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 11.5 }} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={ty} width={64} tick={{ fontSize: 11.5 }} />
            <Tooltip formatter={(v: number, n) => [vnd(v), n]} labelFormatter={(l) => `Tháng ${l}`} />
            <Legend verticalAlign="top" height={28} />
            <Line type="linear" dataKey="revenue" name="Doanh thu" stroke="#16A34A" strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} />
            <Line type="linear" dataKey="cost" name="Chi phí" stroke="#DC2626" strokeWidth={2} dot={{ r: 3, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="border-t px-4 py-2 text-[11.5px] text-slate-500">{NOTE}</p>
    </Card>
  );
}

/** Biểu đồ cột phân bổ doanh thu hoặc chi phí theo dự án (lũy kế đến nay) */
export function ByProjectBar({ projectIds, kind }: { projectIds: Set<string>; kind: "revenue" | "cost" }) {
  const { db } = useDb();
  const [sort, setSort] = useState<"value" | "name">("value");
  const rc = revenueCost(db, projectIds).byProject;
  const data = db.projects.filter((p) => projectIds.has(p.id)).map((p) => ({ id: p.id, name: p.shortName, value: rc.get(p.id)?.[kind] ?? 0 }))
    .sort((a, b) => (sort === "value" ? b.value - a.value : a.name.localeCompare(b.name, "vi")));
  const total = data.reduce((s, d) => s + d.value, 0);
  const color = kind === "revenue" ? "#16A34A" : "#DC2626";
  const width = Math.max(560, data.length * 64);
  return (
    <Card className="min-w-0">
      <CardHeader className="items-start">
        <div><CardTitle>{kind === "revenue" ? "Phân bổ doanh thu theo dự án" : "Phân bổ chi phí theo dự án"}</CardTitle><p className="mt-0.5 text-[12px] text-slate-500">Lũy kế đến nay · tổng <b className="text-slate-800">{ty(total)}</b></p></div>
        <select value={sort} onChange={(e) => setSort(e.target.value as "value" | "name")} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[12.5px]"><option value="value">Xếp theo số tiền</option><option value="name">Xếp theo tên dự án</option></select>
      </CardHeader>
      <div className="scrollbar-visible overflow-x-auto px-2 pb-2">
        <div style={{ width, height: 320 }}>
          <BarChart width={width} height={320} data={data} margin={{ left: 8, right: 8, top: 8, bottom: 70 }}>
            <CartesianGrid stroke="#eef2f6" vertical={false} />
            <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" tickLine={false} tick={{ fontSize: 11 }} height={70} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={ty} width={64} tick={{ fontSize: 11.5 }} />
            <Tooltip formatter={(v: number) => [vnd(v), kind === "revenue" ? "Doanh thu" : "Chi phí"]} cursor={{ fill: "#f1f5f9" }} />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </div>
      </div>
      <p className="border-t px-4 py-2 text-[11.5px] text-slate-500">{NOTE}</p>
    </Card>
  );
}
