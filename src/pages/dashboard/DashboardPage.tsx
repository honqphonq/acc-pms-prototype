import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Banknote, ChevronLeft, ChevronRight, ClipboardCheck, Construction, Receipt, Truck, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDb } from "@/hooks/useDb";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { ChartCard } from "@/components/common/ChartCard";
import { PageSkeleton } from "@/components/common/LoadingState";
import { FilterSelect } from "@/components/common/DataTable";
import { ProjectCard } from "./ProjectCard";
import { ProjectMap } from "./ProjectMap";
import { ProjectListDialog, projectRow, type ListSpec } from "./ProjectListDialog";
import { ContractCostAcceptance } from "./FinanceCharts";
import { getProjectStatsMap, type ProjectStats } from "@/services/selectors";
import { CATEGORY_COLORS, CATEGORY_LABELS, CHART_COLORS, EQUIPMENT_STATUS, HEALTH, PROJECT_HEALTH } from "@/utils/constants";
import { fmtNumber, fmtPct } from "@/utils/format";
import type { ProjectCategory } from "@/types";
import { activeProjects, isUnit } from "@/utils/labels";

const H_COLOR: Record<string, string> = { chua_bat_dau: "#94A3B8", dung_tien_do: CHART_COLORS.success, cham_tien_do: CHART_COLORS.danger };
const H3 = ["chua_bat_dau", "dung_tien_do", "cham_tien_do"] as const;

export default function DashboardPage() {
  const { db } = useDb();
  const navigate = useNavigate();
  const loading = useSimulatedLoading();
  const [year, setYear] = useState("2026");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const filtering = !!(unit || category || status || projectId);

  // Dự án đang thi công có thời gian thi công trong năm được chọn + dự án chưa khởi công (trạng thái "Chưa bắt đầu")
  const inYear = (s: ProjectStats) => (s.project.status === "chuan_bi" || s.project.startDate.slice(0, 4) <= year) && s.project.endDate.slice(0, 4) >= year;
  const all = [...getProjectStatsMap(db).values()].filter((s) => (s.project.status === "dang_thi_cong" || s.project.status === "chuan_bi") && inYear(s));
  const stats = all.filter(
    (s) => (!unit || s.project.unitId === unit) && (!category || s.project.category === category) && (!status || s.health === status) && (!projectId || s.project.id === projectId),
  );
  const running = stats;
  const years = [...new Set(activeProjects(db).flatMap((p) => { const a = +p.startDate.slice(0, 4), b = +p.endDate.slice(0, 4); return Array.from({ length: b - a + 1 }, (_, i) => String(a + i)); }))].sort();
  const sum = (f: (s: ProjectStats) => number) => stats.reduce((x, s) => x + f(s), 0);
  const contract = sum((s) => s.project.contractValue);
  const accepted = sum((s) => s.acceptedValue);
  const paid = sum((s) => s.paidValue);
  const cost = sum((s) => s.cost);
  const budget = sum((s) => s.project.budget);
  const countHealth = (h: keyof typeof HEALTH) => running.filter((s) => s.health === h).length;

  const [list, setList] = useState<ListSpec | null>(null);
  const openHealth = (tab?: string, cat?: ProjectCategory) => {
    const base = running.filter((s) => !cat || s.project.category === cat);
    setList({
      title: cat ? `Trạng thái dự án – ${CATEGORY_LABELS[cat]}` : "Trạng thái dự án", subtitle: `Tổng số ${base.length} dự án`, tab, columns: [{ label: "Chủ đầu tư" }],
      tabs: (["cham_tien_do", "dung_tien_do", "chua_bat_dau"] as const).map((h) => ({ key: h, label: HEALTH[h].label, color: H_COLOR[h], rows: base.filter((s) => s.health === h).map((s) => projectRow(s)) })),
    });
  };
  const openValue = (title: string, subtitle: string, f: (s: ProjectStats) => number, label: string, groups: { key: string; label: string; color: string; test: (s: ProjectStats) => boolean }[]) => {
    const rows = (list: ProjectStats[]) => list.slice().sort((a, b) => f(b) - f(a)).map((s) => projectRow(s, f));
    setList({ title, subtitle, columns: [{ label: "Chủ đầu tư" }, { label, money: true }], tabs: [{ key: "all", label: "Tất cả", color: CHART_COLORS.info, rows: rows(stats) }, ...groups.map((g) => ({ key: g.key, label: g.label, color: g.color, rows: rows(stats.filter(g.test)) }))] });
  };
  const ty = (v: number) => `${fmtNumber(v / 1e9, 0)} tỷ đồng`;

  // ---- Máy móc thiết bị: thống kê toàn Tổng công ty ----
  const eqList = db.equipment;
  const eqByGroup = [...new Set(eqList.map((e) => e.group))].map((g) => ({ name: g, count: eqList.filter((e) => e.group === g).length })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
  const pName = (id: string) => db.projects.find((p) => p.id === id)?.shortName ?? "";
  const EQ_COLORS: Record<string, string> = { hoat_dong: CHART_COLORS.success, nhan_roi: "#94A3B8", bao_tri: CHART_COLORS.warning, ngung: CHART_COLORS.danger };
  const eqPie = Object.entries(EQUIPMENT_STATUS).map(([key, v]) => ({ key, name: v.label, color: EQ_COLORS[key], value: eqList.filter((e) => e.status === key).length }));
  const openEq = (tab?: string) => setList({
    title: "Tình trạng XMTB", subtitle: `Tổng số ${eqList.length} máy`, tab, nameLabel: "Tên XMTB",
    columns: [{ label: "Nhóm XMTB" }, { label: "Dự án hiện tại" }, { label: "Nguồn gốc" }],
    tabs: eqPie.map((p) => ({ key: p.key, label: p.name, color: p.color, rows: eqList.filter((e) => e.status === p.key).map((e) => ({ id: e.id, name: `${e.code} – ${e.name}`, link: `/equipment/${e.id}`, cells: [e.group, e.currentProjectId ? pName(e.currentProjectId) : "—", e.ownership === "so_huu" ? "Sở hữu" : "Thuê ngoài"] })) })),
  });

  if (loading) return <PageSkeleton />;

  const CAT_SHORT: Record<ProjectCategory, string> = { quoc_phong: "Quốc phòng", giao_thong: "Giao thông", dan_dung: "Dân dụng" };
  const catData = (Object.keys(CATEGORY_LABELS) as ProjectCategory[]).map((c) => {
    const l = running.filter((s) => s.project.category === c);
    return { cat: c, name: CAT_SHORT[c], total: l.length, chua_bat_dau: l.filter((s) => s.health === "chua_bat_dau").length, dung_tien_do: l.filter((s) => s.health === "dung_tien_do").length, cham_tien_do: l.filter((s) => s.health === "cham_tien_do").length };
  });

  return (
    <div>
      <ProjectListDialog spec={list} onClose={() => setList(null)} />
      <PageHeader title="Tổng quan hoạt động dự án" description="Góc nhìn tổng thể cho Ban lãnh đạo Tổng công ty – số liệu tính trực tiếp từ kế hoạch, nhật ký, kho và hồ sơ nghiệm thu." />

      <Card className="mb-5 flex flex-wrap items-center gap-3 px-4 py-3">
        <FilterSelect label="Năm" value={year} onChange={(v) => v && setYear(v)} options={years.map((y) => ({ value: y, label: y }))} />
        <FilterSelect label="Đơn vị thành viên" value={unit} onChange={setUnit} allLabel="Tất cả đơn vị" options={db.departments.filter(isUnit).map((d) => ({ value: d.id, label: d.code }))} />
        <FilterSelect label="Loại dự án" value={category} onChange={setCategory} allLabel="Tất cả loại" options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
        <FilterSelect label="Trạng thái" value={status} onChange={setStatus} allLabel="Tất cả trạng thái" options={Object.entries(PROJECT_HEALTH).map(([v, l]) => ({ value: v, label: l.label }))} />
        <FilterSelect label="Dự án" value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={all.map((s) => ({ value: s.project.id, label: s.project.shortName }))} />
        {filtering && (
          <button className="text-xs font-medium text-primary hover:underline" onClick={() => { setUnit(""); setCategory(""); setStatus(""); setProjectId(""); }}>
            Xóa bộ lọc
          </button>
        )}
      </Card>

      {/* 1. Chỉ số tổng hợp */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Số dự án" value={running.length} unit="dự án" icon={<Construction />} tone="info" onClick={() => openHealth()} sub={`${countHealth("cham_tien_do")} chậm · ${countHealth("dung_tien_do")} đúng tiến độ${countHealth("chua_bat_dau") ? ` · ${countHealth("chua_bat_dau")} chưa bắt đầu` : ""}`} />
        <KpiCard label="Giá trị hợp đồng" value={fmtNumber(contract / 1e9, 0)} unit="tỷ đồng" icon={<Wallet />} tone="primary" onClick={() => openValue("Giá trị hợp đồng", `Tổng ${ty(contract)} · ${stats.length} dự án`, (s) => s.project.contractValue, "Giá trị hợp đồng", (Object.keys(CATEGORY_LABELS) as ProjectCategory[]).map((c) => ({ key: c, label: CATEGORY_LABELS[c], color: CATEGORY_COLORS[c], test: (s) => s.project.category === c })))} sub={`Tổng giá trị hợp đồng của ${stats.length} dự án`} />
        <KpiCard label="Giá trị đã nghiệm thu" value={fmtNumber(accepted / 1e9, 0)} unit="tỷ đồng" icon={<ClipboardCheck />} tone="warning" progress={contract ? accepted / contract : 0} sub={`${fmtPct(contract ? accepted / contract : 0)} giá trị hợp đồng`} onClick={() => openValue("Giá trị đã nghiệm thu", `Tổng ${ty(accepted)} · ${fmtPct(contract ? accepted / contract : 0)} giá trị hợp đồng`, (s) => s.acceptedValue, "Đã nghiệm thu", [{ key: "co", label: "Đã có nghiệm thu", color: CHART_COLORS.success, test: (s) => s.acceptedValue > 0 }, { key: "chua", label: "Chưa nghiệm thu", color: CHART_COLORS.warning, test: (s) => s.acceptedValue <= 0 }])} />
        <KpiCard label="Chi phí thực hiện" value={fmtNumber(cost / 1e9, 0)} unit="tỷ đồng" icon={<Receipt />} tone="navy" onClick={() => openValue("Chi phí thực hiện", `Tổng ${ty(cost)} · ${fmtPct(budget ? cost / budget : 0)} ngân sách dự kiến`, (s) => s.cost, "Chi phí", [{ key: "trong", label: "Trong ngân sách", color: CHART_COLORS.success, test: (s) => s.cost <= s.project.budget }, { key: "vuot", label: "Vượt ngân sách", color: CHART_COLORS.danger, test: (s) => s.cost > s.project.budget }])} progress={budget ? cost / budget : 0} sub={`${fmtPct(budget ? cost / budget : 0)} ngân sách dự kiến (${fmtNumber(budget / 1e9, 0)} tỷ)`} />
        <KpiCard label="Đã thu từ Chủ đầu tư" value={fmtNumber(paid / 1e9, 0)} unit="tỷ đồng" icon={<Banknote />} tone="success" progress={accepted ? paid / accepted : 0} sub={`${fmtPct(accepted ? paid / accepted : 0)} giá trị nghiệm thu`} onClick={() => openValue("Đã thu từ Chủ đầu tư", `Tổng ${ty(paid)} · ${fmtPct(accepted ? paid / accepted : 0)} giá trị nghiệm thu`, (s) => s.paidValue, "Đã thu", [{ key: "con", label: "Còn phải thu", color: CHART_COLORS.warning, test: (s) => s.paidValue < s.acceptedValue }, { key: "du", label: "Đã thu đủ", color: CHART_COLORS.success, test: (s) => s.acceptedValue > 0 && s.paidValue >= s.acceptedValue }])} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-4" title="Trạng thái dự án theo loại công trình" description={`${running.length} dự án · bấm vào cột để xem danh sách`}>
          <div className="h-[300px]">
            <ResponsiveContainer>
              <BarChart data={catData} margin={{ top: 16, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 12, fill: "#334155" }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip cursor={{ fill: "#F1F5F9" }} formatter={(v: number, n) => [`${v} dự án`, n]} />
                <Legend verticalAlign="top" height={30} iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
                {H3.map((h, k) => (
                  <Bar key={h} dataKey={h} name={HEALTH[h].label} stackId="a" fill={H_COLOR[h]} maxBarSize={64} className="cursor-pointer" radius={k === 2 ? [4, 4, 0, 0] : 0} onClick={(d: { cat?: ProjectCategory }) => openHealth(h, d.cat)}>
                    <LabelList dataKey={h} position="center" fill="#fff" fontSize={12} fontWeight={700} formatter={(v: number) => (v ? v : "")} />
                    {k === 2 && <LabelList dataKey="total" position="top" fill="#334155" fontSize={12} fontWeight={700} />}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1">
            {H3.map((h) => { const v = countHealth(h); return (
              <button key={h} onClick={() => openHealth(h)} className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between rounded-md px-2 py-0.5 text-[13px] hover:bg-slate-50">
                <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: H_COLOR[h] }} />{HEALTH[h].label}</span>
                <span className="tabular font-semibold">{v} <span className="font-normal text-slate-400">({fmtPct(running.length ? v / running.length : 0)})</span></span>
              </button>
            ); })}
          </div>
          <p className="mt-3 border-t pt-2 text-[11px] leading-snug text-slate-400">Chưa qua 1/3 thời gian thi công: đúng tiến độ. Sau đó: % hoàn thành ≥ % kế hoạch đến hôm nay là đúng tiến độ, thấp hơn là chậm tiến độ.</p>
        </ChartCard>

        <ProjectMap stats={stats} className="xl:col-span-8" />
      </div>

      {/* Hợp đồng – chi phí – nghiệm thu (lũy kế từ khởi công) */}
      <div className="mt-4"><ContractCostAcceptance stats={stats.filter((s) => s.project.status === "dang_thi_cong")} /></div>

      {/* 3. Thẻ công trình theo loại – cuộn ngang, tối đa 2 dòng */}
      {(["quoc_phong", "giao_thong", "dan_dung"] as ProjectCategory[]).map((cat) => {
        const list = stats.filter((s) => s.project.category === cat);
        return list.length ? <CategoryRow key={cat} category={cat} list={list} /> : null;
      })}

      {/* 6. Máy móc thiết bị */}
      <div className="mt-5 mb-2 flex items-center gap-2"><Truck className="h-4 w-4 text-slate-500" /><h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-700">Máy móc thiết bị</h2><Link to="/equipment/list" className="ml-auto text-xs text-primary hover:underline">Danh sách XMTB</Link></div>
      <div className="grid gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-4" title="Tình trạng XMTB" description={`${eqList.length} máy · bấm vào biểu đồ để xem danh sách`}>
          <div className="relative h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={eqPie} isAnimationActive={false} className="cursor-pointer" onClick={(d: { key?: string }) => openEq(d.key)} dataKey="value" innerRadius={64} outerRadius={96} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                  {eqPie.map((p) => <Cell key={p.key} fill={p.color} />)}
                </Pie>
                <Tooltip formatter={(v: number, n) => [`${v} máy`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[28px] font-bold leading-none">{eqList.length}</div>
              <div className="mt-1 text-[12px] text-slate-500">máy</div>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {eqPie.map((p) => (
              <button key={p.key} onClick={() => openEq(p.key)} className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between rounded-md px-2 py-0.5 text-[13px] hover:bg-slate-50">
                <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.name}</span>
                <span className="tabular font-semibold">{p.value} <span className="font-normal text-slate-400">({fmtPct(eqList.length ? p.value / eqList.length : 0)})</span></span>
              </button>
            ))}
          </div>
        </ChartCard>
        <ChartCard className="xl:col-span-8" title="Số lượng xe máy thiết bị theo loại" description={`Toàn Tổng công ty · ${eqByGroup.length} loại · ${eqList.length} máy · bấm vào cột để xem danh sách`}>
          <div className="scrollbar-visible overflow-x-auto">
            <div className="h-[360px]" style={{ minWidth: Math.max(560, eqByGroup.length * 52) }}>
              <ResponsiveContainer>
                <BarChart data={eqByGroup} margin={{ top: 20, right: 12, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={84} tickLine={false} tick={{ fontSize: 11.5, fill: "#334155" }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} width={40} />
                  <Tooltip cursor={{ fill: "#F1F5F9" }} formatter={(v: number) => [`${v} máy`, "Số lượng"]} />
                  <Bar dataKey="count" fill={CHART_COLORS.info} radius={[4, 4, 0, 0]} maxBarSize={40} className="cursor-pointer" onClick={(d: { name?: string }) => d.name && navigate(`/equipment/list?group=${encodeURIComponent(d.name)}`)}>
                    <LabelList dataKey="count" position="top" fill="#334155" fontSize={12} fontWeight={700} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>
      </div>


    </div>
  );
}

function usePerPage() {
  const calc = () => (window.innerWidth >= 1280 ? 4 : window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1);
  const [n, setN] = useState(calc);
  useEffect(() => { const f = () => setN(calc()); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return n;
}

/** Một nhóm công trình: 1 hàng, 4 thẻ vừa khít bề ngang, mũi tên chuyển trang */
function CategoryRow({ category, list }: { category: ProjectCategory; list: ProjectStats[] }) {
  const per = usePerPage();
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(list.length / per));
  const p = Math.min(page, pages - 1);
  const from = p * per;
  const shown = list.slice(from, from + per);
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-3 w-1 rounded" style={{ background: CATEGORY_COLORS[category] }} />
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-700">{CATEGORY_LABELS[category]}</h2>
        <Badge tone="neutral">{list.length} dự án</Badge>
        {pages > 1 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="tabular text-[12px] text-slate-500">{from + 1}–{Math.min(from + per, list.length)} / {list.length}</span>
            <button disabled={p === 0} onClick={() => setPage(p - 1)} className="rounded-md border bg-white p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40" aria-label="Trang trước"><ChevronLeft className="h-4 w-4" /></button>
            <button disabled={p >= pages - 1} onClick={() => setPage(p + 1)} className="rounded-md border bg-white p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40" aria-label="Trang sau"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${per}, minmax(0, 1fr))` }}>
        {shown.map((s) => <ProjectCard key={s.project.id} stats={s} />)}
      </div>
    </div>
  );
}
