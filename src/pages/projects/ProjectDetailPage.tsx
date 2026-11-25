import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BarChart3, CalendarRange, CheckCircle2, ClipboardList, Download, FileBarChart, Pencil, TrendingUp, Users, Wallet, ChevronRight } from "lucide-react";
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirectiveWorkspace } from "@/pages/directives/DirectivesPage";
import { useQueryParam } from "@/hooks/useQueryParam";
import { ContractsTab, DocsTab, MethodsTab, StaffTab } from "./ProjectTabs";
import { Tip } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/common/KpiCard";
import { ChartCard } from "@/components/common/ChartCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { AvatarGroup, UserCell } from "@/components/common/UserAvatar";
import { EmptyState } from "@/components/common/EmptyState";
import { PageSkeleton } from "@/components/common/LoadingState";
import { SitePhoto } from "@/components/common/SitePhoto";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { TaskProgressDialog } from "../construction/TaskProgressDialog";
import {
  equipmentByGroup, equipmentWork, utilizationOf, getStockRows, itemStats, leafTasks, monthlyProgress, projectStats, requestValue,
  STOCK_STATUS, taskActualPct, taskPlannedPct, TASK_HEALTH_LABEL, taskHealth,
} from "@/services/selectors";
import { CATEGORY_LABELS, CHART_COLORS, EQUIPMENT_STATUS, PROJECT_HEALTH, MR_STATUS, PROJECT_STATUS, SERIES } from "@/utils/constants";
import { fmtDate, fmtNumber, fmtPct, fmtMoneyShort } from "@/utils/format";
import { DEMO_TODAY, monthLabel } from "@/utils/date";

export default function ProjectDetailPage() {
  const { id = "" } = useParams();
  const { db } = useDb();
  const [tab, setTab] = useQueryParam("tab", "overview");
  const { can } = useAuth();
  const navigate = useNavigate();
  const loading = useSimulatedLoading(380, [id]);
  const [editOpen, setEditOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const project = db.projects.find((p) => p.id === id);

  const series = useMemo(() => (project ? monthlyProgress(db, project.id) : []), [db, project]);
  if (!project) return <Card><EmptyState title="Không tìm thấy dự án" description="Dự án có thể đã bị xóa." action={<Button onClick={() => navigate("/projects")}>Về danh sách công trình</Button>} /></Card>;
  if (loading) return <PageSkeleton />;

  const s = projectStats(db, project.id);
  const tasks = leafTasks(db, project.id);
  const items = db.constructionItems.filter((i) => i.projectId === project.id).sort((a, b) => a.order - b.order);
  const unit = db.departments.find((d) => d.id === project.unitId);
  const lateTasks = tasks
    .map((t) => ({ t, a: taskActualPct(t), p: taskPlannedPct(t) }))
    .filter((x) => x.a < 1 && (x.t.plannedEnd < DEMO_TODAY || x.p - x.a > 0.15))
    .sort((a, b) => a.t.plannedEnd.localeCompare(b.t.plannedEnd));
  const pie = [
    { name: "Hoàn thành đúng hạn", value: s.tasksDone - s.tasksDoneLate, color: CHART_COLORS.success },
    { name: "Hoàn thành muộn", value: s.tasksDoneLate, color: CHART_COLORS.warning },
    { name: "Đang làm", value: s.tasksInProgress - tasks.filter((t) => taskActualPct(t) > 0 && taskActualPct(t) < 1 && t.plannedEnd < DEMO_TODAY).length, color: SERIES[0] },
    { name: "Quá hạn", value: s.tasksOverdue, color: CHART_COLORS.danger },
    { name: "Chưa đến hạn", value: s.tasksNotStarted, color: "#CBD5E1" },
  ].filter((x) => x.value > 0);
  const eqList = db.equipment.filter((e) => e.currentProjectId === project.id);
  // giờ máy lũy kế từ khi máy về công trình đến nay
  const eqWork = eqList.map((e) => equipmentWork(db, e.id, project.id));
  const eqHours = eqWork.reduce((x, w) => x + w.hours, 0);
  const eqUtil = utilizationOf({ hours: eqHours, availableDays: eqWork.reduce((x, w) => x + w.availableDays, 0) });
  const stock = getStockRows(db).filter((r) => r.inv.projectId === project.id);
  const requests = db.materialRequests.filter((r) => r.projectId === project.id);
  const logs = db.constructionLogs.filter((l) => l.projectId === project.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  const sNow = series.filter((r) => r.month >= project.startDate.slice(0, 7));
  // Tổ thực hiện: gom theo tổ đội của các công việc; nhân công lấy từ nhật ký gần nhất của tổ
  const teams = [...new Set(tasks.map((t) => t.team).filter((tm) => tm && !/ban chỉ huy/i.test(tm)))].map((name) => {
    const tts = tasks.filter((t) => t.team === name);
    const leaderId = Object.entries(tts.reduce<Record<string, number>>((m, t) => ({ ...m, [t.assigneeId]: (m[t.assigneeId] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0]?.[0];
    const lastLog = db.constructionLogs.filter((l) => tts.some((t) => t.id === l.taskId)).sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      name,
      leader: db.users.find((u) => u.id === leaderId)?.name ?? "—",
      tasks: tts.length,
      active: tts.filter((t) => taskActualPct(t) > 0 && taskActualPct(t) < 1).length,
      workers: lastLog ? lastLog.labor.reduce((x, l) => x + l.people, 0) : 0,
      taskNames: tts.map((t) => `${t.code} ${t.name}`),
    };
  });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              <StatusBadge map={PROJECT_HEALTH} value={s.health} />
              <StatusBadge map={PROJECT_STATUS} value={project.status} dot={false} />
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[13px] md:grid-cols-[130px_1fr]">
              <dt className="text-slate-500">Chủ đầu tư</dt><dd className="font-medium text-slate-800">{project.investor}</dd>
              <dt className="text-slate-500">Nhà thầu thi công</dt><dd className="text-slate-800">{project.contractor}</dd>
              <dt className="text-slate-500">Hợp đồng</dt><dd className="text-slate-800">HĐ số {project.contractNo} ngày {fmtDate(project.contractDate)}{db.contracts.filter((c) => c.projectId === project.id && c.kind === "phu_luc").length ? ` · ${db.contracts.filter((c) => c.projectId === project.id && c.kind === "phu_luc").length} phụ lục` : ""}</dd>
              <dt className="text-slate-500">Thời gian thực hiện</dt><dd className="font-medium text-slate-800">{fmtDate(project.startDate)} – {fmtDate(project.endDate)} · {project.status === "hoan_thanh" ? "đã hoàn thành" : `còn lại ${s.daysLeft} ngày`}</dd>
              <dt className="text-slate-500">Đơn vị · Loại</dt><dd className="text-slate-800">{unit?.name} · {CATEGORY_LABELS[project.category]} · {project.location}</dd>
              <dt className="self-center text-slate-500">Người thực hiện</dt><dd><AvatarGroup userIds={project.memberIds} max={8} /></dd>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="navy" onClick={() => navigate(`/construction/plan/${project.id}`)}><CalendarRange /> Tiến độ thi công</Button>
            <Button variant="outline" onClick={() => navigate(`/finance/value?project=${project.id}`)}><FileBarChart /> Giá trị thực hiện</Button>
            <Button variant="outline" onClick={() => toast.info("Chức năng “Xuất hồ sơ dự án” đang phát triển")}><Download /> Xuất hồ sơ dự án</Button>
            {can("project.edit") && <Button variant="outline" size="icon" onClick={() => setEditOpen(true)} title="Chỉnh sửa"><Pencil /></Button>}
          </div>
        </div>
        {teams.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <div className="mb-2 text-[13px] text-slate-500">Tổ thực hiện ({teams.length} tổ)</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {teams.map((tm) => (
                <Tip key={tm.name} content={<div><div className="font-semibold">{tm.name}</div><div>Công việc: {tm.taskNames.join("; ")}</div></div>}>
                  <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 ring-1 ring-slate-200"><Users className="h-3.5 w-3.5" /></span>
                    <div className="min-w-0 leading-tight">
                      <div className="truncate text-[13px] font-semibold text-slate-800">{tm.name}</div>
                      <div className="mt-0.5 truncate text-[11.5px] text-slate-500">Tổ trưởng: {tm.leader}</div>
                      <div className="text-[11.5px] text-slate-500">{tm.workers ? `${tm.workers} nhân công · ` : ""}{tm.tasks} công việc{tm.active ? ` · ${tm.active} đang làm` : ""}</div>
                    </div>
                  </div>
                </Tip>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Số công việc" value={s.tasksTotal} unit="công việc" icon={<ClipboardList />} tone="info" progress={s.tasksTotal ? s.tasksDone / s.tasksTotal : 0} sub={<>{s.tasksDone} hoàn thành ({fmtPct(s.tasksTotal ? s.tasksDone / s.tasksTotal : 0)}) · {s.tasksOverdue > 0 ? <Badge tone="danger">{s.tasksOverdue} quá hạn</Badge> : "0 quá hạn"}</>} />
        <KpiCard label="Tiến độ thực hiện" value={fmtPct(s.actual)} unit="hoàn thành" icon={<TrendingUp />} tone={s.health === "cham_tien_do" ? "danger" : "success"} progress={s.actual} marker={s.planned} sub={<>Kế hoạch đến hôm nay {fmtPct(s.planned)} (vạch đen){!s.measured && " · chưa qua 1/3 thời gian, chưa đo tiến độ"}</>} />
        <KpiCard onClick={() => setTab("contracts")} label="Giá trị hợp đồng" value={fmtNumber(project.contractValue / 1e9, 0)} unit="tỷ đồng" icon={<Wallet />} tone="primary" progress={s.execValue / (project.contractValue || 1)} sub={`Giá trị khối lượng thực hiện ${fmtNumber(s.execValue / 1e9)} tỷ (${fmtPct(s.execValue / (project.contractValue || 1))})`} />
        <KpiCard label="Giá trị đã nghiệm thu" value={fmtNumber(s.acceptedValue / 1e9)} unit="tỷ đồng" icon={<CheckCircle2 />} tone="warning" progress={s.acceptedValue / (project.contractValue || 1)} sub={`${fmtPct(s.acceptedValue / (project.contractValue || 1))} giá trị HĐ · chờ duyệt ${fmtNumber(s.pendingAcceptanceValue / 1e9)} tỷ`} />
        <KpiCard label="Chi phí thực hiện" value={fmtNumber(s.cost / 1e9)} unit="tỷ đồng" icon={<BarChart3 />} tone="navy" progress={s.cost / (project.budget || 1)} sub={`${fmtPct(s.cost / (project.budget || 1))} ngân sách dự kiến ${fmtNumber(project.budget / 1e9, 0)} tỷ`} />
      </div>

      {(
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto flex-wrap rounded-t-xl bg-white px-2">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="contracts">Hợp đồng ({db.contracts.filter((c) => c.projectId === project.id).length})</TabsTrigger>
            <TabsTrigger value="methods">Phương án TCTC ({db.constructionMethods.filter((m) => m.projectId === project.id).length})</TabsTrigger>
            <TabsTrigger value="items">Tiến độ thi công ({items.length})</TabsTrigger>
            <TabsTrigger value="staff">Nhân sự thi công ({db.siteStaff.filter((x) => x.projectId === project.id && x.status === "dang_lam").length})</TabsTrigger>
            <TabsTrigger value="docs">Hồ sơ thi công ({db.documents.filter((d) => d.projectId === project.id).length})</TabsTrigger>
            <TabsTrigger value="materials">Vật tư ({stock.length})</TabsTrigger>
            <TabsTrigger value="equipment">Thiết bị ({eqList.length})</TabsTrigger>
            <TabsTrigger value="logs">Nhật ký & hình ảnh</TabsTrigger>
            <TabsTrigger value="directives">Công việc điều hành ({db.directives.filter((d) => d.projectId === project.id && d.status !== "hoan_thanh").length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {tasks.length === 0 ? (
              <Card>
                <EmptyState icon={<CalendarRange />} title="Dự án chưa có tiến độ thi công" description="Bắt đầu lập tiến độ: tạo hạng mục, phân rã công việc và giao cho tổ đội – hoặc nhập từ Excel." action={<Button onClick={() => navigate(`/construction/plan/${project.id}`)}>Lập tiến độ thi công</Button>} />
              </Card>
            ) : <>
            <div className="grid gap-4 xl:grid-cols-12">
              <ChartCard className="xl:col-span-4" title="Tình trạng công việc">
                <div className="relative h-44">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pie} isAnimationActive={false} dataKey="value" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="#fff" strokeWidth={2}>{pie.map((p) => <Cell key={p.name} fill={p.color} />)}</Pie>
                      <Tooltip formatter={(v: number, n) => [`${v} công việc`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><div className="text-2xl font-bold">{s.tasksTotal}</div><div className="text-[11px] text-slate-500">công việc</div></div>
                </div>
                <div className="mt-2 space-y-1">
                  {pie.map((p) => (
                    <div key={p.name} className="flex justify-between text-[12.5px]"><span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.name}</span><span className="tabular font-semibold">{p.value}</span></div>
                  ))}
                </div>
              </ChartCard>
              <ChartCard className="xl:col-span-8" title="Tiến độ thi công lũy kế theo tháng" description="Giá trị lũy kế (tỷ đồng) · nét đứt: kế hoạch · nét liền: thực hiện">
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={sNow} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke="#eef2f6" vertical={false} />
                      <XAxis dataKey="month" tickFormatter={monthLabel} interval="preserveStartEnd" minTickGap={18} tickLine={false} />
                      <YAxis tickFormatter={(v) => fmtNumber(v / 1e9, 0)} tickLine={false} axisLine={false} />
                      <Tooltip labelFormatter={(l) => `Tháng ${monthLabel(String(l))}`} formatter={(v: number, n) => [v == null ? "—" : `${fmtNumber(v / 1e9)} tỷ`, n]} />
                      <Legend iconType="plainline" />
                      <ReferenceLine x={DEMO_TODAY.slice(0, 7)} stroke="#94a3b8" strokeDasharray="2 3" label={{ value: "Hôm nay", fontSize: 10, fill: "#64748b", position: "insideTopRight" }} />
                      <Line name="Kế hoạch" dataKey="planValue" stroke={CHART_COLORS.plan} strokeDasharray="5 4" strokeWidth={2} dot={false} />
                      <Line name="Thực hiện" dataKey="actualValue" stroke={CHART_COLORS.actual} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            <div className="grid gap-4 xl:grid-cols-12">
              <Card className="xl:col-span-8">
                <CardHeader>
                  <CardTitle>Công việc chậm tiến độ / quá hạn</CardTitle>
                  <Badge tone={lateTasks.length ? "danger" : "success"}>{lateTasks.length} công việc</Badge>
                </CardHeader>
                <CardContent className="px-0 pb-2">
                  {lateTasks.length === 0 ? <EmptyState title="Không có công việc chậm tiến độ" className="py-8" /> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Công việc</TableHead><TableHead>Người thực hiện</TableHead><TableHead>Tổ</TableHead><TableHead>Hạn KH</TableHead><TableHead>Tiến độ</TableHead><TableHead /></TableRow></TableHeader>
                      <TableBody>
                        {lateTasks.slice(0, 8).map(({ t, a, p }) => {
                          const h = taskHealth({ actual: a, planned: p, plannedEnd: t.plannedEnd, plannedStart: t.plannedStart, actualEnd: t.actualEnd });
                          return (
                            <TableRow key={t.id}>
                              <TableCell className="min-w-[200px]"><div className="font-medium text-slate-800">{t.code} {t.name}</div><Badge tone={TASK_HEALTH_LABEL[h].tone} className="mt-0.5">{TASK_HEALTH_LABEL[h].label}</Badge></TableCell>
                              <TableCell className="whitespace-nowrap"><UserCell userId={t.assigneeId} /></TableCell>
                              <TableCell className="whitespace-nowrap text-xs text-slate-600">{t.team || "—"}</TableCell>
                              <TableCell className="whitespace-nowrap text-xs">{fmtDate(t.plannedEnd)}</TableCell>
                              <TableCell className="w-32"><div className="mb-1 text-[11.5px]"><b className="text-rose-600">{fmtPct(a, 1)}</b></div><Progress value={a} tone="danger" className="h-1.5" /></TableCell>
                              <TableCell>{can("progress.update") && <Button size="xs" variant="soft" onClick={() => setTaskId(t.id)}>Cập nhật</Button>}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
              <Card className="xl:col-span-4">
                <CardHeader><CardTitle>Máy móc thiết bị tại công trường</CardTitle><Link to="/equipment/list" className="text-xs text-primary hover:underline">Danh sách</Link></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-slate-50 p-3"><div className="text-[11px] text-slate-500">Tổng số máy</div><div className="text-xl font-bold">{eqList.length}</div></div>
                    <div className="rounded-lg bg-slate-50 p-3"><div className="text-[11px] text-slate-500">Hiệu suất BQ</div><div className="text-xl font-bold">{fmtPct(eqUtil, 0)}</div></div>
                    <div className="rounded-lg bg-slate-50 p-3"><div className="text-[11px] text-slate-500">Giờ máy</div><div className="text-xl font-bold">{fmtNumber(eqHours, 0)}</div></div>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {equipmentByGroup(db, project.id).map((g) => (
                      <div key={g.group} className="grid grid-cols-[1fr_30px_1fr_40px] items-center gap-2 text-[12.5px]">
                        <span className="truncate font-medium text-slate-700">{g.group}</span>
                        <span className="tabular text-right text-slate-500">{g.count}</span>
                        <Progress value={g.utilization} tone={g.utilization >= 0.75 ? "success" : g.utilization >= 0.6 ? "info" : "warning"} className="h-1.5" />
                        <span className="tabular text-right">{fmtPct(g.utilization, 0)}</span>
                      </div>
                    ))}
                    {eqList.length === 0 && <div className="py-4 text-center text-xs text-slate-500">Chưa có thiết bị được điều động đến công trình</div>}
                  </div>
                </CardContent>
              </Card>
            </div>
            </>}
          </TabsContent>

          <TabsContent value="contracts"><ContractsTab projectId={project.id} /></TabsContent>
          <TabsContent value="methods"><MethodsTab projectId={project.id} /></TabsContent>
          <TabsContent value="staff"><StaffTab projectId={project.id} /></TabsContent>
          <TabsContent value="docs"><DocsTab projectId={project.id} /></TabsContent>

          <TabsContent value="items">
            <Card>
              <CardHeader><CardTitle>Tiến độ theo hạng mục</CardTitle><Button size="sm" variant="outline" onClick={() => navigate(`/construction/plan/${project.id}`)}>Mở Gantt tiến độ <ChevronRight /></Button></CardHeader>
              {items.length === 0 && <EmptyState title="Chưa có hạng mục" action={<Button onClick={() => navigate(`/construction/plan/${project.id}`)}>Lập tiến độ thi công</Button>} />}
              <Table>
                <TableHeader><TableRow><TableHead>Mã</TableHead><TableHead>Hạng mục</TableHead><TableHead>Phụ trách</TableHead><TableHead>Thời gian</TableHead><TableHead className="text-right">Giá trị (tỷ)</TableHead><TableHead>Tiến độ TT / KH</TableHead><TableHead>Quá hạn</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const st = itemStats(db, it.id);
                    return (
                      <TableRow key={it.id} className="cursor-pointer" onClick={() => navigate(`/construction/plan/${project.id}?item=${it.id}`)}>
                        <TableCell className="text-slate-500">{it.code}</TableCell>
                        <TableCell className="font-medium text-slate-800">{it.name}</TableCell>
                        <TableCell><UserCell userId={it.managerId} /></TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{fmtDate(st.start)} – {fmtDate(st.end)}</TableCell>
                        <TableCell className="tabular text-right">{fmtNumber(st.value / 1e9, 2)}</TableCell>
                        <TableCell className="w-48"><div className="mb-1 text-[11.5px]"><b>{fmtPct(st.actual)}</b></div><Progress value={st.actual} tone={st.actual + 0.03 >= st.planned ? "success" : "warning"} className="h-1.5" /></TableCell>
                        <TableCell>{st.overdue ? <Badge tone="danger">{st.overdue} việc</Badge> : <span className="text-slate-400">—</span>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="materials" className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Tồn kho dự án</CardTitle><Button size="sm" variant="outline" onClick={() => navigate(`/materials/stock/${project.id}`)}>Mở kho vật tư <ChevronRight /></Button></CardHeader>
              <Table>
                <TableHeader><TableRow><TableHead>Vật tư</TableHead><TableHead className="text-right">Tồn</TableHead><TableHead>Đã dùng / ĐM</TableHead><TableHead>Tình trạng</TableHead></TableRow></TableHeader>
                <TableBody>
                  {stock.map((r) => (
                    <TableRow key={r.inv.id}>
                      <TableCell><div className="font-medium">{r.material.name}</div><div className="text-[11px] text-slate-400">{r.material.code}</div></TableCell>
                      <TableCell className="tabular text-right">{fmtNumber(r.onHand)} <span className="text-slate-400">{r.material.unit}</span></TableCell>
                      <TableCell className="w-32"><div className="mb-1 text-[11px]">{fmtPct(r.usage, 0)}</div><Progress value={r.usage} tone={r.usage > 1 ? "danger" : r.usage >= 0.9 ? "warning" : "info"} className="h-1.5" /></TableCell>
                      <TableCell><Badge tone={STOCK_STATUS[r.status].tone}>{STOCK_STATUS[r.status].label}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <Card>
              <CardHeader><CardTitle>Đề xuất vật tư</CardTitle><Link className="text-xs text-primary hover:underline" to={`/materials/stock/${project.id}?tab=de_xuat`}>Tất cả</Link></CardHeader>
              <Table>
                <TableBody>
                  {requests.length === 0 && <TableRow><TableCell className="py-8 text-center text-slate-500">Chưa có đề xuất</TableCell></TableRow>}
                  {requests.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/materials/requests/${r.id}`)}>
                      <TableCell><div className="font-medium">{r.title}</div><div className="text-[11px] text-slate-400">{r.code} · {fmtDate(r.createdAt)}</div></TableCell>
                      <TableCell className="tabular text-right">{fmtMoneyShort(requestValue(r))}</TableCell>
                      <TableCell><StatusBadge map={MR_STATUS} value={r.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="equipment">
            <Card>
              {eqList.length === 0 ? <EmptyState title="Chưa có thiết bị" /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Mã máy</TableHead><TableHead>Tên máy</TableHead><TableHead>Nhóm</TableHead><TableHead>Sở hữu</TableHead><TableHead>Người vận hành</TableHead><TableHead className="text-right">Giờ máy tại công trình</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {eqList.map((e) => (
                      <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/equipment/${e.id}`)}>
                        <TableCell className="font-medium">{e.code}</TableCell><TableCell>{e.name}</TableCell><TableCell>{e.group}</TableCell>
                        <TableCell><Badge tone={e.ownership === "so_huu" ? "info" : "purple"}>{e.ownership === "so_huu" ? "Sở hữu" : "Thuê ngoài"}</Badge></TableCell>
                        <TableCell><UserCell userId={e.operatorId} /></TableCell>
                        <TableCell className="tabular text-right">{fmtNumber(equipmentWork(db, e.id, project.id).hours, 0)}</TableCell>
                        <TableCell><StatusBadge map={EQUIPMENT_STATUS} value={e.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {logs.map((l) => {
                const t = db.constructionPlans.find((x) => x.id === l.taskId);
                return (
                  <Card key={l.id} className="overflow-hidden">
                    <div className="grid grid-cols-2 gap-1 p-1">{l.photos.slice(0, 2).map((p, i) => <SitePhoto key={i} kind={p} date={fmtDate(l.date)} />)}</div>
                    <div className="p-3">
                      <div className="text-[11px] text-slate-400">{fmtDate(l.date)} · {l.weather}</div>
                      <div className="mt-0.5 text-[13px] font-semibold text-slate-800">{t?.code} {t?.name}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-slate-600">{l.content}</div>
                      <div className="mt-2 flex items-center justify-between text-xs"><span className="font-semibold text-success-fg">+{fmtNumber(l.qty)} {t?.unit}</span><Badge tone={l.status === "da_xac_nhan" ? "success" : l.status === "nhap" ? "neutral" : "warning"}>{l.status === "da_xac_nhan" ? "CHT đã xác nhận" : l.status === "nhap" ? "Nháp" : "Chờ xác nhận"}</Badge></div>
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="mt-3 text-right"><Link to={`/construction/logs?project=${project.id}`} className="text-xs font-medium text-primary hover:underline">Xem toàn bộ nhật ký thi công →</Link></div>
          </TabsContent>

          <TabsContent value="directives"><DirectiveWorkspace projectId={project.id} /></TabsContent>

        </Tabs>
      )}
      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      <TaskProgressDialog taskId={taskId} open={!!taskId} onOpenChange={(o) => !o && setTaskId(null)} />
    </div>
  );
}
