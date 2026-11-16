import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Banknote, ChevronLeft, ChevronRight, ClipboardCheck, Construction, Receipt, Truck, Wallet } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useDb } from "@/hooks/useDb";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tip } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { ChartCard } from "@/components/common/ChartCard";
import { PageSkeleton } from "@/components/common/LoadingState";
import { FilterSelect } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProjectCard } from "./ProjectCard";
import { AVAILABLE_HOURS_3W, getAlerts, getEquipmentUsage, getProjectStatsMap, ALERT_KIND_LABEL, LATE_DAYS_DELAYED, type ProjectStats } from "@/services/selectors";
import { CATEGORY_COLORS, CATEGORY_LABELS, CHART_COLORS, HEALTH, PROJECT_STATUS } from "@/utils/constants";
import { fmtDate, fmtNumber, fmtPct } from "@/utils/format";
import { DEMO_TODAY, addDays } from "@/utils/date";
import type { ProjectCategory } from "@/types";
import { cn } from "@/utils/cn";

const HEALTH_RANK = { cham_tien_do: 0, nguy_co_cham: 1, dung_tien_do: 2, chua_bat_dau: 3, hoan_thanh: 4 } as const;

export default function DashboardPage() {
  const { db } = useDb();
  const navigate = useNavigate();
  const loading = useSimulatedLoading();
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const filtering = !!(unit || category || status || projectId);

  const all = [...getProjectStatsMap(db).values()];
  const stats = all.filter(
    (s) => (!unit || s.project.unitId === unit) && (!category || s.project.category === category) && (!status || s.project.status === status) && (!projectId || s.project.id === projectId),
  );
  const ids = new Set(stats.map((s) => s.project.id));
  const running = stats.filter((s) => s.project.status === "dang_thi_cong");
  const sum = (f: (s: ProjectStats) => number) => stats.reduce((x, s) => x + f(s), 0);
  const contract = sum((s) => s.project.contractValue);
  const accepted = sum((s) => s.acceptedValue);
  const paid = sum((s) => s.paidValue);
  const cost = sum((s) => s.cost);
  const budget = sum((s) => s.project.budget);
  const countHealth = (h: keyof typeof HEALTH) => running.filter((s) => s.health === h).length;

  const alerts = getAlerts(db).filter((a) => !a.projectId || ids.has(a.projectId));
  const attention = running.filter((s) => s.health === "cham_tien_do" || s.health === "nguy_co_cham").sort((a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] || b.maxDaysLate - a.maxDaysLate);

  // ---- Máy móc thiết bị ----
  const usage = getEquipmentUsage(db);
  const eqList = filtering ? db.equipment.filter((e) => e.currentProjectId && ids.has(e.currentProjectId)) : db.equipment;
  const eqHours = eqList.reduce((x, e) => x + (usage.get(e.id)?.hours ?? 0), 0);
  const eqCapacity = eqList.length * AVAILABLE_HOURS_3W;
  const eqUtil = eqCapacity ? eqHours / eqCapacity : 0;
  const eqGroups = [...new Set(eqList.map((e) => e.group))]
    .map((group) => {
      const list = eqList.filter((e) => e.group === group);
      const hours = list.reduce((x, e) => x + (usage.get(e.id)?.hours ?? 0), 0);
      const projects = [...new Set(list.map((e) => e.currentProjectId).filter(Boolean))] as string[];
      return { group, count: list.length, hours, projects, utilization: hours / (list.length * AVAILABLE_HOURS_3W) };
    })
    .sort((a, b) => b.count - a.count);

  if (loading) return <PageSkeleton />;

  const pie = [
    { name: HEALTH.dung_tien_do.label, value: countHealth("dung_tien_do"), color: CHART_COLORS.success },
    { name: HEALTH.nguy_co_cham.label, value: countHealth("nguy_co_cham"), color: CHART_COLORS.warning },
    { name: HEALTH.cham_tien_do.label, value: countHealth("cham_tien_do"), color: CHART_COLORS.danger },
  ];
  const pName = (id: string) => db.projects.find((p) => p.id === id)?.shortName ?? "";

  return (
    <div>
      <PageHeader title="Tổng quan hoạt động dự án" description="Góc nhìn tổng thể cho Ban lãnh đạo Tổng công ty – số liệu tính trực tiếp từ kế hoạch, nhật ký, kho và hồ sơ nghiệm thu." />

      <Card className="mb-5 flex flex-wrap items-center gap-3 px-4 py-3">
        <FilterSelect label="Năm" value="2026" onChange={() => undefined} options={[{ value: "2026", label: "2026" }]} allLabel="2026" />
        <FilterSelect label="Đơn vị thành viên" value={unit} onChange={setUnit} allLabel="Tất cả đơn vị" options={db.departments.filter((d) => d.type === "cong_ty_con").map((d) => ({ value: d.id, label: d.code }))} />
        <FilterSelect label="Loại công trình" value={category} onChange={setCategory} allLabel="Tất cả loại" options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
        <FilterSelect label="Trạng thái" value={status} onChange={setStatus} allLabel="Tất cả trạng thái" options={Object.entries(PROJECT_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} />
        <FilterSelect label="Dự án" value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={db.projects.map((p) => ({ value: p.id, label: p.shortName }))} />
        {filtering && (
          <button className="text-xs font-medium text-primary hover:underline" onClick={() => { setUnit(""); setCategory(""); setStatus(""); setProjectId(""); }}>
            Xóa bộ lọc
          </button>
        )}
      </Card>

      {/* 1. Chỉ số tổng hợp */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Số dự án đang triển khai" value={running.length} unit="dự án" icon={<Construction />} tone="info" onClick={() => navigate("/projects")} sub={`${countHealth("cham_tien_do")} chậm · ${countHealth("nguy_co_cham")} nguy cơ chậm · ${countHealth("dung_tien_do")} đúng tiến độ`} />
        <KpiCard label="Giá trị hợp đồng" value={fmtNumber(contract / 1e9, 0)} unit="tỷ đồng" icon={<Wallet />} tone="primary" sub={`Tổng giá trị hợp đồng của ${stats.length} dự án`} />
        <KpiCard label="Giá trị đã nghiệm thu" value={fmtNumber(accepted / 1e9, 0)} unit="tỷ đồng" icon={<ClipboardCheck />} tone="warning" progress={contract ? accepted / contract : 0} sub={`${fmtPct(contract ? accepted / contract : 0)} giá trị hợp đồng`} onClick={() => navigate("/acceptance/reconcile")} />
        <KpiCard label="Chi phí thực hiện" value={fmtNumber(cost / 1e9, 0)} unit="tỷ đồng" icon={<Receipt />} tone="navy" progress={budget ? cost / budget : 0} sub={`${fmtPct(budget ? cost / budget : 0)} ngân sách dự kiến (${fmtNumber(budget / 1e9, 0)} tỷ)`} />
        <KpiCard label="Đã thu từ Chủ đầu tư" value={fmtNumber(paid / 1e9, 0)} unit="tỷ đồng" icon={<Banknote />} tone="success" progress={accepted ? paid / accepted : 0} sub={`${fmtPct(accepted ? paid / accepted : 0)} giá trị nghiệm thu`} onClick={() => navigate("/payments")} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-4" title="Tình trạng chung các dự án" description="Các dự án đang thi công">
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
          <p className="mt-3 border-t pt-2 text-[11px] leading-snug text-slate-400">Xác định theo thời hạn công việc: có việc quá hạn &gt; {LATE_DAYS_DELAYED} ngày = chậm; quá hạn ≤ {LATE_DAYS_DELAYED} ngày hoặc đang làm chậm so với kế hoạch = nguy cơ chậm.</p>
        </ChartCard>

        <Card className="xl:col-span-8">
          <CardHeader>
            <CardTitle>Dự án cần xử lý</CardTitle>
            <Badge tone="neutral">{attention.length} dự án</Badge>
          </CardHeader>
          <CardContent className="scrollbar-visible grid max-h-[340px] content-start gap-2 overflow-y-auto md:grid-cols-2">
            {attention.length === 0 && <div className="py-6 text-center text-xs text-slate-500 md:col-span-2">Tất cả dự án đang đúng tiến độ</div>}
            {attention.map((s) => (
              <Link key={s.project.id} to={`/projects/${s.project.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2.5 hover:border-slate-200 hover:bg-slate-50">
                <span className="truncate text-[13px] font-medium text-slate-800">{s.project.shortName}</span>
                <Tip content={s.healthReason}><span><StatusBadge map={HEALTH} value={s.health} dot={false} /></span></Tip>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 3. Thẻ công trình theo loại – cuộn ngang, tối đa 2 dòng */}
      {(["quoc_phong", "giao_thong", "dan_dung"] as ProjectCategory[]).map((cat) => {
        const list = stats.filter((s) => s.project.category === cat);
        return list.length ? <CategoryRow key={cat} category={cat} list={list} /> : null;
      })}

      {/* 6. Máy móc thiết bị */}
      <div className="mt-5 grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Truck className="h-4 w-4 text-slate-400" /> Máy móc thiết bị</CardTitle>
            <Link to="/equipment/list" className="text-xs text-primary hover:underline">Chi tiết</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Tổng số máy</div>
              <div className="mt-1 flex items-baseline gap-1.5"><span className="tabular text-2xl font-bold">{eqList.length}</span><span className="text-xs text-slate-500">máy</span></div>
              <div className="mt-1 text-[11.5px] text-slate-500">{eqList.filter((e) => e.status === "hoat_dong").length} đang hoạt động · {eqList.filter((e) => e.status === "nhan_roi").length} nhàn rỗi · {eqList.filter((e) => e.status === "bao_tri").length} bảo trì</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Hiệu suất sử dụng bình quân</div>
              <div className="tabular mt-1 text-2xl font-bold">{fmtPct(eqUtil, 0)}</div>
              <Progress value={eqUtil} tone={eqUtil >= 0.75 ? "success" : "info"} className="mt-2 h-2" />
              <div className="mt-1.5 text-[11.5px] text-slate-500">Mục tiêu từ 75% trở lên</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Giờ máy thực tế (3 tuần gần nhất)</div>
              <div className="mt-1 flex items-baseline gap-1.5"><span className="tabular text-2xl font-bold">{fmtNumber(eqHours, 0)}</span><span className="text-xs text-slate-500">giờ</span></div>
              <Progress value={eqUtil} tone="info" className="mt-2 h-2" />
              <div className="mt-1.5 text-[11.5px] text-slate-500">{fmtPct(eqUtil, 0)} giờ máy định mức ({fmtNumber(eqCapacity, 0)} giờ = 18 ngày × 8 giờ × {eqList.length} máy)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-8">
          <CardHeader className="items-start">
            <div>
              <CardTitle>Chi tiết theo loại máy</CardTitle>
              <p className="mt-0.5 text-[11.5px] text-slate-500">Số liệu 3 tuần gần nhất ({fmtDate(addDays(DEMO_TODAY, -21))} – {fmtDate(addDays(DEMO_TODAY, -1))}) · Hiệu suất = giờ máy thực tế ÷ giờ máy định mức (18 ngày làm việc × 8 giờ/ca × số máy)</p>
            </div>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Tên máy</TableHead><TableHead className="text-right">Số máy</TableHead><TableHead>Dự án</TableHead><TableHead>Hiệu suất sử dụng</TableHead><TableHead className="text-right">Giờ máy</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {eqGroups.map((g) => (
                <TableRow key={g.group} className="cursor-pointer" onClick={() => navigate(`/equipment/list?group=${encodeURIComponent(g.group)}`)}>
                  <TableCell className="whitespace-nowrap font-semibold text-slate-800">{g.group}</TableCell>
                  <TableCell className="tabular text-right">{g.count}</TableCell>
                  <TableCell className="max-w-[180px]">
                    {g.projects.length === 0 ? <span className="text-xs text-slate-400">Chưa phân bổ</span> : (
                      <Tip content={g.projects.map(pName).join(", ")}>
                        <span className="block truncate text-xs text-slate-600">{g.projects.slice(0, 2).map(pName).join(", ")}{g.projects.length > 2 && <span className="text-slate-400"> +{g.projects.length - 2}</span>}</span>
                      </Tip>
                    )}
                  </TableCell>
                  <TableCell className="w-44">
                    <div className="flex items-center gap-2">
                      <span className="tabular w-10 text-xs font-semibold">{fmtPct(g.utilization, 0)}</span>
                      <Progress value={g.utilization} tone={g.utilization >= 0.75 ? "success" : g.utilization >= 0.5 ? "info" : "warning"} className="h-1.5" />
                    </div>
                  </TableCell>
                  <TableCell className="tabular text-right">{fmtNumber(g.hours, 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Cảnh báo & vấn đề cần xử lý</CardTitle>
            <Link to="/alerts" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">Xem tất cả ({alerts.length}) <ArrowRight className="h-3.5 w-3.5" /></Link>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {alerts.slice(0, 8).map((a) => (
              <Link key={a.id} to={a.link} className="group flex min-w-0 items-start gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:border-slate-200 hover:bg-slate-50">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", a.severity === "danger" ? "bg-rose-500" : a.severity === "warning" ? "bg-amber-500" : "bg-blue-500")} />
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
      </div>
    </div>
  );
}

/** Một nhóm công trình: cuộn ngang, tối đa 2 dòng thẻ */
function CategoryRow({ category, list }: { category: ProjectCategory; list: ProjectStats[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const rows = list.length > 3 ? 2 : 1;
  const columns = Math.ceil(list.length / rows);
  const scrollBy = (dir: number) => ref.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-3 w-1 rounded" style={{ background: CATEGORY_COLORS[category] }} />
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-700">{CATEGORY_LABELS[category]}</h2>
        <Badge tone="neutral">{list.length} dự án</Badge>
        {columns > 2 && (
          <div className="ml-auto flex gap-1">
            <button onClick={() => scrollBy(-1)} className="rounded-md border bg-white p-1 text-slate-500 hover:bg-slate-50" aria-label="Cuộn trái"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => scrollBy(1)} className="rounded-md border bg-white p-1 text-slate-500 hover:bg-slate-50" aria-label="Cuộn phải"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      <div ref={ref} className="scrollbar-visible overflow-x-auto pb-3">
        <div className="grid auto-cols-[300px] grid-flow-col gap-3 sm:auto-cols-[320px]" style={{ gridTemplateRows: `repeat(${rows}, auto)` }}>
          {list.map((s) => <ProjectCard key={s.project.id} stats={s} />)}
        </div>
      </div>
    </div>
  );
}
