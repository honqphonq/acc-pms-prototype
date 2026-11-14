import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Banknote, Building2, ChevronRight, ClipboardCheck, Construction, HardHat, Package, TrendingUp, Truck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDb } from "@/hooks/useDb";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { ChartCard } from "@/components/common/ChartCard";
import { PageSkeleton } from "@/components/common/LoadingState";
import { FilterSelect } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProjectCard } from "./ProjectCard";
import { equipmentByGroup, getAlerts, getProjectStatsMap, getStockRows, monthlyProgress, ALERT_KIND_LABEL } from "@/services/selectors";
import { CATEGORY_LABELS, CHART_COLORS, EQUIPMENT_STATUS, HEALTH, PROJECT_STATUS, SERIES } from "@/utils/constants";
import { fmtBillion, fmtNumber, fmtPct } from "@/utils/format";
import { monthLabel } from "@/utils/date";
import type { ProjectCategory } from "@/types";
import { cn } from "@/utils/cn";

export default function DashboardPage() {
  const { db } = useDb();
  const navigate = useNavigate();
  const loading = useSimulatedLoading();
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");

  const all = [...getProjectStatsMap(db).values()];
  const stats = all.filter(
    (s) => (!unit || s.project.unitId === unit) && (!category || s.project.category === category) && (!status || s.project.status === status) && (!projectId || s.project.id === projectId),
  );
  const ids = new Set(stats.map((s) => s.project.id));
  const running = stats.filter((s) => s.project.status === "dang_thi_cong");
  const sum = (f: (s: (typeof stats)[number]) => number, arr = stats) => arr.reduce((x, s) => x + f(s), 0);
  const contract = sum((s) => s.project.contractValue);
  const execValue = sum((s) => s.execValue);
  const planValue = sum((s) => s.planValue);
  const plannedV = sum((s) => s.planned * s.planValue);
  const accepted = sum((s) => s.acceptedValue);
  const paid = sum((s) => s.paidValue);
  const cost = sum((s) => s.cost);
  const budget = sum((s) => s.project.budget);
  const overallActual = planValue ? execValue / planValue : 0;
  const overallPlanned = planValue ? plannedV / planValue : 0;
  const health = { dung: running.filter((s) => s.health === "dung_tien_do").length, risk: running.filter((s) => s.health === "nguy_co_cham").length, late: running.filter((s) => s.health === "cham_tien_do").length };

  const series = useMemo(() => {
    const rows = monthlyProgress(db, projectId || undefined);
    return rows.filter((r) => r.month >= "2025-07" && r.month <= "2027-12");
  }, [db, projectId]);

  const stock = getStockRows(db).filter((r) => ids.has(r.inv.projectId));
  const shortage = stock.filter((r) => r.status === "thieu_hang");
  const overNorm = stock.filter((r) => r.status === "vuot_dinh_muc" || r.status === "sap_vuot");
  const eqAll = db.equipment;
  const eqStatus = (Object.keys(EQUIPMENT_STATUS) as (keyof typeof EQUIPMENT_STATUS)[]).map((k) => ({ key: k, ...EQUIPMENT_STATUS[k], value: eqAll.filter((e) => e.status === k).length }));
  const eqGroups = equipmentByGroup(db).sort((a, b) => b.count - a.count).slice(0, 6);
  const alerts = getAlerts(db).filter((a) => !a.projectId || ids.has(a.projectId));
  const attention = running.filter((s) => s.health !== "dung_tien_do").sort((a, b) => a.delta - b.delta);
  const pendingApprovals = db.materialRequests.filter((r) => r.status === "cho_duyet" && ids.has(r.projectId)).length + db.equipmentAssignments.filter((a) => a.status === "cho_duyet").length + db.projects.filter((p) => p.approvalStatus === "cho_duyet").length;

  const progressBars = running.map((s) => ({ name: s.project.shortName, id: s.project.id, "Kế hoạch": +(s.planned * 100).toFixed(1), "Thực tế": +(s.actual * 100).toFixed(1) })).sort((a, b) => b["Kế hoạch"] - a["Kế hoạch"]);

  if (loading) return <PageSkeleton />;

  const pie = [
    { name: HEALTH.dung_tien_do.label, value: health.dung, color: CHART_COLORS.success },
    { name: HEALTH.nguy_co_cham.label, value: health.risk, color: CHART_COLORS.warning },
    { name: HEALTH.cham_tien_do.label, value: health.late, color: CHART_COLORS.danger },
  ];

  return (
    <div>
      <PageHeader title="Tổng quan hoạt động dự án" description="Góc nhìn tổng thể cho Ban lãnh đạo Tổng công ty – số liệu tính trực tiếp từ kế hoạch, nhật ký, kho và hồ sơ nghiệm thu." />

      <Card className="mb-5 flex flex-wrap items-center gap-3 px-4 py-3">
        <FilterSelect label="Năm" value="2026" onChange={() => undefined} options={[{ value: "2026", label: "2026" }]} allLabel="2026" />
        <FilterSelect label="Đơn vị thành viên" value={unit} onChange={setUnit} allLabel="Tất cả đơn vị" options={db.departments.filter((d) => d.type === "cong_ty_con").map((d) => ({ value: d.id, label: d.code }))} />
        <FilterSelect label="Loại công trình" value={category} onChange={setCategory} allLabel="Tất cả loại" options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
        <FilterSelect label="Trạng thái" value={status} onChange={setStatus} allLabel="Tất cả trạng thái" options={Object.entries(PROJECT_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} />
        <FilterSelect label="Dự án" value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={db.projects.map((p) => ({ value: p.id, label: p.shortName }))} />
        {(unit || category || status || projectId) && (
          <button className="text-xs font-medium text-primary hover:underline" onClick={() => { setUnit(""); setCategory(""); setStatus(""); setProjectId(""); }}>
            Xóa bộ lọc
          </button>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Tổng số dự án" value={stats.length} unit="dự án" icon={<Building2 />} tone="navy" sub={`${stats.filter((s) => s.project.status === "chuan_bi").length} chuẩn bị · ${stats.filter((s) => s.project.status === "hoan_thanh").length} hoàn thành`} onClick={() => navigate("/projects")} />
        <KpiCard label="Công trình đang triển khai" value={running.length} unit="công trình" icon={<Construction />} tone="info" progress={stats.length ? running.length / stats.length : 0} sub={`${health.late} chậm · ${health.risk} có nguy cơ chậm`} />
        <KpiCard label="Tổng giá trị hợp đồng" value={fmtNumber(contract / 1e9, 0)} unit="tỷ đồng" icon={<Banknote />} tone="primary" progress={budget ? cost / budget : 0} sub={`Ngân sách chi phí ${fmtBillion(budget, 0)} · đã chi ${fmtPct(budget ? cost / budget : 0)}`} />
        <KpiCard label="Giá trị (khối lượng) thực hiện" value={fmtNumber(execValue / 1e9, 0)} unit="tỷ đồng" icon={<TrendingUp />} tone="success" progress={contract ? execValue / contract : 0} sub={`${fmtPct(contract ? execValue / contract : 0)} giá trị hợp đồng`} />
        <KpiCard label="Giá trị đã nghiệm thu" value={fmtNumber(accepted / 1e9, 0)} unit="tỷ đồng" icon={<ClipboardCheck />} tone="warning" progress={execValue ? accepted / execValue : 0} sub={`${fmtPct(execValue ? accepted / execValue : 0)} giá trị thực hiện`} onClick={() => navigate("/acceptance/reconcile")} />
        <KpiCard label="Đã thu từ Chủ đầu tư" value={fmtNumber(paid / 1e9, 0)} unit="tỷ đồng" icon={<Banknote />} tone="navy" progress={accepted ? paid / accepted : 0} sub={`${fmtPct(accepted ? paid / accepted : 0)} giá trị nghiệm thu`} onClick={() => navigate("/payments")} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-5"
          title="Tiến độ tổng thể (lũy kế giá trị)"
          description="Nét liền: thực tế (từ nhật ký thi công) · nét đứt: kế hoạch"
          right={
            <div className="text-right">
              <div className="tabular text-2xl font-bold text-slate-900">{fmtPct(overallActual)}</div>
              <div className="text-[11px] text-slate-500">Kế hoạch {fmtPct(overallPlanned)} · <span className={overallActual >= overallPlanned - 0.03 ? "text-success-fg" : "text-danger-fg"}>{fmtNumber((overallActual - overallPlanned) * 100)} điểm</span></div>
            </div>
          }
        >
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="month" tickFormatter={monthLabel} interval={3} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} tickLine={false} axisLine={false} />
                <Tooltip labelFormatter={(l) => `Tháng ${monthLabel(String(l))}`} formatter={(v: number, n) => [v == null ? "—" : fmtPct(v), n]} />
                <Legend iconType="plainline" />
                <Line name="Kế hoạch" type="monotone" dataKey="planPct" stroke={CHART_COLORS.plan} strokeDasharray="5 4" strokeWidth={2} dot={false} />
                <Line name="Thực tế" type="monotone" dataKey="actualPct" stroke={CHART_COLORS.actual} strokeWidth={2} dot={false} connectNulls={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard className="xl:col-span-3" title="Tình trạng chung các dự án" description="Các dự án đang thi công">
          <div className="relative h-40">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} isAnimationActive={false} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                  {pie.map((p) => <Cell key={p.name} fill={p.color} />)}
                </Pie>
                <Tooltip formatter={(v: number, n) => [`${v} dự án`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold">{running.length}</div>
              <div className="text-[11px] text-slate-500">dự án</div>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {pie.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.name}</span>
                <span className="tabular font-semibold">{p.value} <span className="font-normal text-slate-400">({fmtPct(running.length ? p.value / running.length : 0)})</span></span>
              </div>
            ))}
          </div>
        </ChartCard>

        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Dự án cần xử lý</CardTitle>
            {pendingApprovals > 0 && <Badge tone="primary">{pendingApprovals} chờ duyệt</Badge>}
          </CardHeader>
          <CardContent className="space-y-2">
            {attention.length === 0 && <div className="py-6 text-center text-xs text-slate-500">Tất cả dự án đang đúng tiến độ</div>}
            {attention.slice(0, 5).map((s) => (
              <Link key={s.project.id} to={`/projects/${s.project.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 hover:border-slate-200 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-slate-800">{s.project.shortName}</div>
                  <div className="text-[11px] text-slate-500">{fmtNumber(s.delta * 100)} điểm so với kế hoạch · {s.tasksOverdue} việc quá hạn</div>
                </div>
                <StatusBadge map={HEALTH} value={s.health} dot={false} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {(["quoc_phong", "giao_thong", "dan_dung"] as ProjectCategory[]).map((cat) => {
        const list = stats.filter((s) => s.project.category === cat);
        if (!list.length) return null;
        return (
          <div key={cat} className="mt-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-3 w-1 rounded" style={{ background: { quoc_phong: SERIES[2], giao_thong: SERIES[0], dan_dung: SERIES[3] }[cat] }} />
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-700">{CATEGORY_LABELS[cat]}</h2>
              <Badge tone="neutral">{list.length} dự án</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {list.map((s) => <ProjectCard key={s.project.id} stats={s} />)}
            </div>
          </div>
        );
      })}

      <div className="mt-5 grid gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-6" title="So sánh tiến độ kế hoạch – thực tế" description="% hoàn thành theo giá trị, các dự án đang thi công · bấm cột để mở dự án">
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart layout="vertical" data={progressBars} margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barGap={2} barCategoryGap={8} onClick={(e) => { const id = (e?.activePayload?.[0]?.payload as { id?: string })?.id; if (id) navigate(`/projects/${id}`); }}>
                <CartesianGrid stroke="#eef2f6" horizontal={false} />
                <XAxis type="number" unit="%" domain={[0, 100]} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} interval={0} />
                <Tooltip formatter={(v: number, n) => [`${v}%`, n]} cursor={{ fill: "#f1f5f9" }} />
                <Legend />
                <Bar dataKey="Kế hoạch" fill={CHART_COLORS.plan} radius={[0, 4, 4, 0]} maxBarSize={10} className="cursor-pointer" />
                <Bar dataKey="Thực tế" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={10} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-4 w-4 text-slate-400" /> Tình trạng vật tư</CardTitle>
            <Link to="/materials/inventory" className="text-xs text-primary hover:underline">Chi tiết</Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{stock.length}</div><div className="text-[10.5px] text-slate-500">Mã tồn kho</div></div>
              <div className="rounded-lg bg-danger-soft p-2"><div className="text-lg font-bold text-danger-fg">{shortage.length}</div><div className="text-[10.5px] text-danger-fg">Thiếu hụt</div></div>
              <div className="rounded-lg bg-warning-soft p-2"><div className="text-lg font-bold text-warning-fg">{overNorm.length}</div><div className="text-[10.5px] text-warning-fg">Vượt/sắp vượt ĐM</div></div>
            </div>
            <div className="mt-3 space-y-2">
              {[...shortage, ...overNorm].slice(0, 5).map((r) => (
                <div key={r.inv.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-700">{r.material.name}</div>
                    <div className="truncate text-[11px] text-slate-400">{db.projects.find((p) => p.id === r.inv.projectId)?.shortName}</div>
                  </div>
                  <Badge tone={r.status === "thieu_hang" ? "danger" : "warning"}>{r.status === "thieu_hang" ? "Thiếu" : `${Math.round(r.usage * 100)}% ĐM`}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t pt-2 text-[11.5px] text-slate-500">
              {db.materialRequests.filter((r) => r.status === "cho_duyet").length} đề xuất chờ duyệt · {db.materialRequests.filter((r) => r.status === "dat_hang").length} đang đặt hàng
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Truck className="h-4 w-4 text-slate-400" /> Máy móc thiết bị</CardTitle>
            <Link to="/equipment/list" className="text-xs text-primary hover:underline">Chi tiết</Link>
          </CardHeader>
          <CardContent>
            <div className="flex h-2.5 overflow-hidden rounded-full">
              {eqStatus.map((s) => (
                <div key={s.key} style={{ width: `${(s.value / eqAll.length) * 100}%`, background: { success: CHART_COLORS.success, neutral: "#94A3B8", warning: CHART_COLORS.warning, danger: CHART_COLORS.danger }[s.tone as string] }} className="border-r-2 border-white last:border-0" />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              {eqStatus.map((s) => (
                <div key={s.key} className="flex items-center justify-between text-[12px] text-slate-600">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: { success: CHART_COLORS.success, neutral: "#94A3B8", warning: CHART_COLORS.warning, danger: CHART_COLORS.danger }[s.tone as string] }} />{s.label}</span>
                  <span className="tabular font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2 border-t pt-3">
              <div className="text-[11px] font-medium text-slate-500">Hiệu suất sử dụng (3 tuần gần nhất)</div>
              {eqGroups.map((g) => (
                <div key={g.group} className="grid grid-cols-[1fr_90px_36px] items-center gap-2 text-[12px]">
                  <span className="truncate text-slate-600">{g.group}</span>
                  <Progress value={g.utilization} tone={g.utilization >= 0.75 ? "success" : g.utilization >= 0.5 ? "info" : "warning"} className="h-1.5" />
                  <span className="tabular text-right text-slate-700">{Math.round(g.utilization * 100)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Cảnh báo & vấn đề cần xử lý</CardTitle>
          <Link to="/alerts" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">Xem tất cả ({alerts.length}) <ArrowRight className="h-3.5 w-3.5" /></Link>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {alerts.slice(0, 8).map((a) => (
            <Link key={a.id} to={a.link} className="group flex min-w-0 items-start gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:border-slate-200 hover:bg-slate-50">
              <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", a.severity === "danger" ? "bg-rose-500" : a.severity === "warning" ? "bg-amber-500" : "bg-blue-500")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge tone="outline" className="text-[10px]">{ALERT_KIND_LABEL[a.kind]}</Badge>
                  <span className="truncate text-[13px] font-medium text-slate-800">{a.title}</span>
                </div>
                <div className="mt-0.5 truncate text-[11.5px] text-slate-500">{a.detail}</div>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" />
            </Link>
          ))}
        </CardContent>
      </Card>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
        <HardHat className="h-3.5 w-3.5" /> Ngưỡng đánh giá: lệch ≥ −3 điểm % = đúng tiến độ; −3 đến −10 = có nguy cơ chậm; &lt; −10 = chậm tiến độ (giả định của prototype).
      </div>
    </div>
  );
}
