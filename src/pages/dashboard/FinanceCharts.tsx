import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { useDb } from "@/hooks/useDb";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { contractTotal, type ProjectStats } from "@/services/selectors";
import { isUnit } from "@/utils/labels";
import { fmtNumber } from "@/utils/format";
import { cn } from "@/utils/cn";

const ty = (v: number) => `${fmtNumber(v / 1e9, Math.abs(v) >= 1e11 ? 0 : 1)} tỷ`;

export const FIN_COLORS = { contract: "#2563EB", cost: "#F97316", accepted: "#16A34A" };

interface Row { id: string; name: string; full: string; unit: string; contract: number; cost: number; accepted: number; profit: number }

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const line = (label: string, v: number, color: string) => (
    <div className="flex items-center justify-between gap-6"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{label}</span><b className="tabular">{ty(v)}</b></div>
  );
  return (
    <div className="min-w-[240px] rounded-lg border bg-white p-2.5 text-[12px] shadow-lg">
      <div className="mb-1.5 font-semibold text-slate-800">{d.full}</div>
      <div className="space-y-0.5 text-slate-600">
        {line("Giá trị hợp đồng", d.contract, FIN_COLORS.contract)}
        {line("Chi phí thực hiện", d.cost, FIN_COLORS.cost)}
        {line("Giá trị nghiệm thu", d.accepted, FIN_COLORS.accepted)}
      </div>
      <div className="mt-1.5 flex justify-between border-t pt-1.5 text-slate-600">
        <span>Nghiệm thu − chi phí</span>
        <b className={cn("tabular", d.profit < 0 ? "text-rose-600" : "text-emerald-700")}>{d.profit >= 0 ? "Lãi " : "Lỗ "}{ty(Math.abs(d.profit))}</b>
      </div>
    </div>
  );
}

/**
 * Hợp đồng – Chi phí – Nghiệm thu theo dự án (lũy kế từ khởi công đến nay, không theo năm):
 * mỗi dự án 3 cột để lãnh đạo thấy ngay dự án đang lãi hay lỗ.
 */
export function ContractCostAcceptance({ stats }: { stats: ProjectStats[] }) {
  const { db } = useDb();
  const [sort, setSort] = useState<"profit" | "contract">("profit");
  const [unit, setUnit] = useState("");
  const data: Row[] = stats
    .filter((s) => !unit || s.project.unitId === unit)
    .map((s) => ({ id: s.project.id, name: s.project.shortName, full: s.project.name, unit: s.project.unitId, contract: contractTotal(db, s.project.id), cost: s.cost, accepted: s.acceptedValue, profit: s.acceptedValue - s.cost }))
    .sort((a, b) => (sort === "profit" ? b.profit - a.profit : b.contract - a.contract));
  const width = Math.max(640, data.length * 96);
  const sum = (f: (r: Row) => number) => data.reduce((x, r) => x + f(r), 0);
  const units = db.departments.filter(isUnit).filter((d) => stats.some((s) => s.project.unitId === d.id));
  const sel = "h-8 rounded-md border border-slate-300 bg-white px-2 text-[12.5px]";
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-wrap items-start gap-3">
        <div className="min-w-0">
          <CardTitle>Hợp đồng – Chi phí – Nghiệm thu theo dự án</CardTitle>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Lũy kế từ khởi công đến nay · {data.length} dự án · hợp đồng <b className="text-slate-800">{ty(sum((r) => r.contract))}</b> · chi phí <b className="text-slate-800">{ty(sum((r) => r.cost))}</b> · nghiệm thu <b className="text-slate-800">{ty(sum((r) => r.accepted))}</b>
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={sel} aria-label="Đơn vị thi công">
            <option value="">Tất cả đơn vị thi công</option>
            {units.map((d) => <option key={d.id} value={d.id}>{d.code}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as "profit" | "contract")} className={sel} aria-label="Sắp xếp">
            <option value="profit">Xếp theo lãi (cao → thấp)</option>
            <option value="contract">Xếp theo giá trị hợp đồng</option>
          </select>
        </div>
      </CardHeader>
      <div className="flex flex-wrap gap-4 px-5 pb-1 text-[12px] text-slate-600">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: FIN_COLORS.contract }} />Giá trị hợp đồng (gồm phụ lục)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: FIN_COLORS.cost }} />Chi phí thực hiện</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: FIN_COLORS.accepted }} />Giá trị nghiệm thu</span>
      </div>
      <div className="scrollbar-visible overflow-x-auto px-2 pb-2">
        <BarChart width={width} height={340} data={data} margin={{ left: 8, right: 8, top: 12, bottom: 70 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid stroke="#eef2f6" vertical={false} />
          <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" tickLine={false} tick={{ fontSize: 11.5, fill: "#334155" }} height={70} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={ty} width={64} tick={{ fontSize: 11.5, fill: "#64748B" }} />
          <Tooltip content={<Tip />} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="contract" fill={FIN_COLORS.contract} radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Bar dataKey="cost" fill={FIN_COLORS.cost} radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Bar dataKey="accepted" fill={FIN_COLORS.accepted} radius={[3, 3, 0, 0]} maxBarSize={22} />
        </BarChart>
      </div>
    </Card>
  );
}
