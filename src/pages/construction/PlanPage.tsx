import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronDown, ChevronRight, FolderPlus, GanttChartSquare, ListTree, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Trash2, TrendingUp, Eye } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterSelect } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/LoadingState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { Tip } from "@/components/ui/tooltip";
import { TaskProgressDialog } from "./TaskProgressDialog";
import { TaskFormDialog, ItemFormDialog } from "./TaskFormDialog";
import { TaskDrawer } from "./TaskDrawer";
import { GanttChart, GanttLegend, type GanttRow } from "./GanttChart";
import { buildTaskTree, itemStats, projectStats, TASK_HEALTH_LABEL, type TaskRow, type TaskHealth } from "@/services/selectors";
import { deleteItem, deleteTask } from "@/services/actions";
import { HEALTH } from "@/utils/constants";
import { fmtDateShort, fmtNumber, fmtPct } from "@/utils/format";
import { diffDays } from "@/utils/date";
import { cn } from "@/utils/cn";

export function PlanIndexRedirect() {
  const { db } = useDb();
  const first = db.projects.find((p) => p.id === "p01") ?? db.projects.find((p) => p.status === "dang_thi_cong") ?? db.projects[0];
  return first ? <Navigate to={`/construction/plan/${first.id}`} replace /> : <EmptyState title="Chưa có dự án" />;
}

export default function PlanPage() {
  const { projectId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { db, run } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const loading = useSimulatedLoading(350, [projectId]);
  const [view, setView] = useState<"table" | "gantt">("table");
  const [q, setQ] = useState("");
  const [healthF, setHealthF] = useState("");
  const [assignee, setAssignee] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [baseline, setBaseline] = useState(true);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | undefined>();
  const [formDefaults, setFormDefaults] = useState<{ itemId?: string; parentId?: string | null }>({});
  const [itemOpen, setItemOpen] = useState(false);
  const drawerId = params.get("task");
  const focusItem = params.get("item");

  useEffect(() => {
    if (focusItem) setTimeout(() => document.getElementById(`row-${focusItem}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 450);
  }, [focusItem, loading]);

  const project = db.projects.find((p) => p.id === projectId);
  const tree = useMemo(() => (project ? buildTaskTree(db, project.id) : []), [db, project]);
  if (!project) return <Card><EmptyState title="Không tìm thấy dự án" action={<Button onClick={() => navigate("/construction/plan")}>Chọn dự án khác</Button>} /></Card>;
  const stats = projectStats(db, project.id);
  const items = db.constructionItems.filter((i) => i.projectId === project.id).sort((a, b) => a.order - b.order);
  const assignees = [...new Set(db.constructionPlans.filter((t) => t.projectId === project.id).map((t) => t.assigneeId))];

  const matches = (r: TaskRow): boolean => {
    const self =
      (!q || `${r.task.code} ${r.task.name}`.toLowerCase().includes(q.toLowerCase())) &&
      (!healthF || r.health === healthF) &&
      (!assignee || r.task.assigneeId === assignee);
    return self || r.children.some(matches);
  };
  const filtering = !!(q || healthF || assignee);

  const openDrawer = (id: string) => setParams((p) => { p.set("task", id); return p; });
  const closeDrawer = () => setParams((p) => { p.delete("task"); return p; });
  const newTask = (itemId?: string, parentId: string | null = null) => { setEditTaskId(undefined); setFormDefaults({ itemId, parentId }); setFormOpen(true); };
  const editTask = (id: string) => { setEditTaskId(id); setFormOpen(true); closeDrawer(); };
  const removeTask = async (r: TaskRow) => {
    if (await confirm({ title: `Xóa công việc ${r.task.code}?`, description: `“${r.task.name}”${r.children.length ? ` và ${r.children.length} công việc con` : ""} cùng nhật ký liên quan sẽ bị xóa. Tiến độ dự án sẽ được tính lại.`, destructive: true, confirmText: "Xóa" })) {
      run(deleteTask, r.task.id);
      toast.success("Đã xóa công việc");
    }
  };
  const removeItem = async (id: string, name: string) => {
    if (await confirm({ title: `Xóa hạng mục “${name}”?`, description: "Toàn bộ công việc và nhật ký thuộc hạng mục sẽ bị xóa.", destructive: true, confirmText: "Xóa hạng mục" })) {
      run(deleteItem, id);
      toast.success("Đã xóa hạng mục");
    }
  };

  // ---------- flatten for gantt ----------
  const ganttRows: GanttRow[] = [];
  if (tree.length) {
    const allStart = db.constructionPlans.filter((t) => t.projectId === project.id).map((t) => t.plannedStart).sort()[0];
    const allEnd = db.constructionPlans.filter((t) => t.projectId === project.id).map((t) => t.plannedEnd).sort().pop()!;
    ganttRows.push({ id: "project", label: "Tổng hạng mục thi công", code: "1.1", depth: 0, kind: "project", start: allStart, end: allEnd, actual: stats.actual, planned: stats.planned, health: stats.actual >= 1 ? "hoan_thanh" : stats.delta < -0.1 ? "cham" : "dung" });
    tree.forEach(({ itemId, rows }) => {
      const it = items.find((i) => i.id === itemId)!;
      const st = itemStats(db, itemId);
      if (!rows.length) return;
      ganttRows.push({ id: itemId, label: it.name, code: it.code, depth: 1, kind: "item", start: st.start, end: st.end, actual: st.actual, planned: st.planned, health: st.actual >= 1 ? "hoan_thanh" : st.overdue ? "qua_han" : st.planned - st.actual > 0.1 ? "cham" : "dung" });
      const walk = (rs: TaskRow[]) => rs.filter(matches).forEach((r) => {
        ganttRows.push({ id: r.task.id, label: r.task.name, code: r.task.code, depth: r.depth + 1, kind: r.children.length ? "group" : "task", start: r.task.plannedStart, end: r.task.plannedEnd, actualStart: r.task.actualStart, actualEnd: r.task.actualEnd, actual: r.actual, planned: r.planned, health: r.health });
        walk(r.children);
      });
      walk(rows);
    });
  }

  const pctColor = (h: TaskHealth) => (h === "hoan_thanh" ? "text-success-fg" : h === "qua_han" ? "text-rose-600" : h === "cham" ? "text-amber-600" : "text-slate-700");
  const rowBg = (r: TaskRow) => (r.health === "hoan_thanh" ? "bg-green-50/50" : "");

  const renderRows = (rows: TaskRow[]): JSX.Element[] =>
    rows.filter(matches).map((r) => {
      const t = r.task;
      const hasChildren = r.children.length > 0;
      const isCollapsed = collapsed[t.id] && !filtering;
      const flagged = r.health === "qua_han" || r.health === "cham";
      return (
        <Fragment key={t.id}>
          <tr id={`row-${t.id}`} className={cn("group border-b border-slate-100 hover:bg-slate-50", rowBg(r), drawerId === t.id && "bg-primary-soft/60", hasChildren && "font-semibold")}>
            <td className="whitespace-nowrap px-3 py-2 text-[12px] text-slate-500">{t.code}</td>
            <td className="px-2 py-2">
              <div className="flex items-center gap-1" style={{ paddingLeft: (r.depth - 1) * 18 }}>
                {hasChildren ? (
                  <button onClick={() => setCollapsed((c) => ({ ...c, [t.id]: !c[t.id] }))} className="rounded p-0.5 text-slate-500 hover:bg-slate-200">{isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
                ) : <span className="w-4.5 inline-block w-[18px]" />}
                {flagged && <Tip content={TASK_HEALTH_LABEL[r.health].label}><AlertTriangle className={cn("h-3.5 w-3.5 shrink-0", r.health === "qua_han" ? "text-rose-500" : "text-amber-500")} /></Tip>}
                <button onClick={() => openDrawer(t.id)} className="truncate text-left text-[13px] text-slate-800 hover:text-primary hover:underline">{t.name}</button>
              </div>
            </td>
            <td className="whitespace-nowrap px-2 py-2 text-[12.5px] text-slate-600">{db.users.find((u) => u.id === t.assigneeId)?.name}</td>
            <td className="tabular px-2 py-2 text-right text-[12.5px]">{diffDays(t.plannedStart, t.plannedEnd) + 1}</td>
            <td className="tabular whitespace-nowrap px-2 py-2 text-[12.5px]">{fmtDateShort(t.plannedStart)}</td>
            <td className="tabular whitespace-nowrap px-2 py-2 text-[12.5px]">{fmtDateShort(t.plannedEnd)}</td>
            <td className="tabular whitespace-nowrap px-2 py-2 text-[12.5px] text-slate-600">{t.actualStart ? fmtDateShort(t.actualStart) : ""}</td>
            <td className="tabular whitespace-nowrap px-2 py-2 text-[12.5px] text-slate-600">{t.actualEnd ? fmtDateShort(t.actualEnd) : ""}</td>
            <td className="tabular whitespace-nowrap px-2 py-2 text-right text-[12.5px]">{hasChildren ? "" : `${fmtNumber(t.actualQty)} / ${fmtNumber(t.contractQty)}`}</td>
            <td className="px-2 py-2">
              <div className="flex items-center gap-2">
                <span className={cn("tabular w-12 text-right text-[12.5px] font-semibold", pctColor(r.health))}>{fmtPct(r.actual, r.actual > 0 && r.actual < 1 ? 1 : 0)}</span>
                <Progress value={r.actual} marker={r.planned} tone={r.health === "hoan_thanh" ? "success" : r.health === "qua_han" ? "danger" : r.health === "cham" ? "warning" : "info"} className="hidden h-1.5 w-16 xl:block" />
              </div>
            </td>
            <td className="whitespace-nowrap px-2 py-2 text-[12.5px] text-slate-500">{t.unit}</td>
            <td className="px-2 py-2">
              <div className="flex items-center justify-end gap-0.5">
                {!hasChildren && !t.isGroup && can("progress.update") && (
                  <Tip content="Cập nhật khối lượng thực hiện"><Button size="icon-sm" variant="ghost" className="text-success-fg" onClick={() => setProgressId(t.id)}><TrendingUp /></Button></Tip>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost"><MoreHorizontal /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openDrawer(t.id)}><Eye /> Xem chi tiết & nhật ký</DropdownMenuItem>
                    {can("plan.edit") && (
                      <>
                        {t.isGroup && <DropdownMenuItem onClick={() => newTask(t.itemId, t.id)}><Plus /> Thêm đầu việc con</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => editTask(t.id)}><Pencil /> Sửa / giao lại</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onClick={() => removeTask(r)}><Trash2 /> Xóa</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </td>
          </tr>
          {!isCollapsed && renderRows(r.children)}
        </Fragment>
      );
    });

  return (
    <div>
      <PageHeader
        title="Kế hoạch thi công dự án"
        description={<>QT tổ chức & theo dõi thi công: CHT phân giao kế hoạch chi tiết → tổ trưởng tiếp nhận, báo cáo khối lượng → CHT xác nhận → tổng hợp tiến độ.</>}
        actions={
          <>
            <FilterSelect value={project.id} onChange={(v) => v && navigate(`/construction/plan/${v}`)} allLabel="— Chọn dự án —" options={db.projects.map((p) => ({ value: p.id, label: p.shortName }))} />
            <Button variant="outline" onClick={() => navigate(`/construction/logs?project=${project.id}`)}>Nhật ký thi công</Button>
            <Button variant="outline" onClick={() => navigate(`/construction/value-report?project=${project.id}`)}>Báo cáo giá trị thực hiện</Button>
          </>
        }
      />

      <Card className="mb-4 grid gap-4 p-4 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="text-[12px] text-slate-500"><Link to="/projects" className="text-success-fg hover:underline">Danh sách công trình</Link> » <Link to={`/projects/${project.id}`} className="font-medium text-slate-800 hover:text-primary">{project.name}</Link></div>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
            <div className="w-56"><div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Thực tế / kế hoạch</span><span><b>{fmtPct(stats.actual)}</b> / {fmtPct(stats.planned)}</span></div><Progress value={stats.actual} marker={stats.planned} tone={stats.health === "cham_tien_do" ? "danger" : stats.health === "nguy_co_cham" ? "warning" : "success"} /></div>
            <StatusBadge map={HEALTH} value={stats.health} />
            <span className="text-slate-600"><b>{stats.tasksTotal}</b> đầu việc · <b className="text-success-fg">{stats.tasksDone}</b> hoàn thành · <b className="text-info-fg">{stats.tasksInProgress}</b> đang làm</span>
            {stats.tasksOverdue > 0 && <Badge tone="danger"><AlertTriangle className="h-3 w-3" /> {stats.tasksOverdue} công việc quá hạn – nguy cơ ảnh hưởng tiến độ dự án</Badge>}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm công việc..." className="pl-8" />
          </div>
          <FilterSelect value={healthF} onChange={setHealthF} allLabel="Tất cả tình trạng" options={Object.entries(TASK_HEALTH_LABEL).map(([v, l]) => ({ value: v, label: l.label }))} />
          <FilterSelect value={assignee} onChange={setAssignee} allLabel="Tất cả người thực hiện" options={assignees.map((id) => ({ value: id, label: db.users.find((u) => u.id === id)?.name ?? id }))} />
          {filtering && <Button variant="ghost" size="sm" onClick={() => { setQ(""); setHealthF(""); setAssignee(""); }}><RotateCcw /> Xóa lọc</Button>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border bg-white p-0.5">
              <Button size="xs" variant={view === "table" ? "secondary" : "ghost"} onClick={() => setView("table")}><ListTree /> Bảng kế hoạch</Button>
              <Button size="xs" variant={view === "gantt" ? "secondary" : "ghost"} onClick={() => setView("gantt")}><GanttChartSquare /> Sơ đồ Gantt</Button>
            </div>
            {view === "gantt" && <Button size="sm" variant={baseline ? "soft" : "outline"} onClick={() => setBaseline(!baseline)}>Hiện baseline</Button>}
            {view === "table" && tree.length > 0 && <Button size="sm" variant="outline" onClick={() => setCollapsed(Object.keys(collapsed).some((k) => collapsed[k]) ? {} : Object.fromEntries([...items.map((i) => [i.id, true]), ...db.constructionPlans.filter((t) => t.isGroup).map((t) => [t.id, true])]))}>Thu gọn / mở rộng</Button>}
            {can("plan.edit") && <Button size="sm" variant="outline" onClick={() => setItemOpen(true)}><FolderPlus /> Thêm hạng mục</Button>}
            {can("plan.edit") && items.length > 0 && <Button size="sm" variant="navy" onClick={() => newTask()}><Plus /> Thêm công việc</Button>}
          </div>
        </div>

        {loading ? <TableSkeleton rows={12} cols={9} /> : items.length === 0 ? (
          <EmptyState icon={<ListTree />} title="Chưa có kế hoạch thi công" description={project.approvalStatus === "cho_duyet" ? "Dự án đang chờ Tổng công ty phê duyệt nhận thi công." : "Tạo hạng mục, sau đó phân rã thành các công việc chi tiết và giao cho tổ đội."} action={can("plan.edit") && project.approvalStatus !== "cho_duyet" ? <Button onClick={() => setItemOpen(true)}><FolderPlus /> Thêm hạng mục đầu tiên</Button> : undefined} />
        ) : view === "gantt" ? (
          <>
            <div className="border-b px-4 py-2"><GanttLegend /></div>
            <GanttChart rows={ganttRows} showBaseline={baseline} onRowClick={(id) => db.constructionPlans.some((t) => t.id === id) && openDrawer(id)} />
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px]">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr className="border-b">
                  <th className="px-3 py-2.5 text-left">Mã số</th><th className="px-2 text-left">Công việc</th><th className="px-2 text-left">Người thực hiện</th>
                  <th className="px-2 text-right">T.gian<br />(ngày)</th><th className="px-2 text-left">Bắt đầu<br />KH</th><th className="px-2 text-left">Kết thúc<br />KH</th>
                  <th className="px-2 text-left">Bắt đầu<br />TT</th><th className="px-2 text-left">Kết thúc<br />TT</th><th className="px-2 text-right">KL thực hiện<br />/ kế hoạch</th>
                  <th className="px-2 text-left">Tiến độ</th><th className="px-2 text-left">Đơn vị</th><th className="w-20" />
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-orange-50 font-bold">
                  <td className="px-3 py-2 text-[12px] text-slate-500">1.1</td>
                  <td className="px-2 py-2 text-[13px]">TỔNG HẠNG MỤC THI CÔNG</td>
                  <td className="px-2 text-[12.5px] font-normal">{db.users.find((u) => u.id === project.commanderId)?.name}</td>
                  <td className="tabular px-2 text-right text-[12.5px]">{diffDays(project.startDate, project.endDate) + 1}</td>
                  <td className="tabular px-2 text-[12.5px]">{fmtDateShort(project.startDate)}</td><td className="tabular px-2 text-[12.5px]">{fmtDateShort(project.endDate)}</td>
                  <td colSpan={3} />
                  <td className="tabular px-2 text-[12.5px]">{fmtPct(stats.actual)}</td><td colSpan={2} />
                </tr>
                {tree.map(({ itemId, rows }) => {
                  const it = items.find((i) => i.id === itemId)!;
                  const st = itemStats(db, itemId);
                  const isCol = collapsed[itemId] && !filtering;
                  if (filtering && !rows.some(matches)) return null;
                  return (
                    <Fragment key={itemId}>
                      <tr id={`row-${itemId}`} className={cn("border-b bg-sky-50/70 font-semibold", focusItem === itemId && "ring-2 ring-inset ring-primary/40")}>
                        <td className="px-3 py-2 text-[12px] text-slate-500">{it.code}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setCollapsed((c) => ({ ...c, [itemId]: !c[itemId] }))} className="rounded p-0.5 text-slate-500 hover:bg-slate-200">{isCol ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
                            {st.overdue > 0 && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
                            <span className="text-[13px]">{it.name}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 text-[12.5px] font-normal">{db.users.find((u) => u.id === it.managerId)?.name}</td>
                        <td className="tabular px-2 text-right text-[12.5px]">{st.start ? diffDays(st.start, st.end) + 1 : ""}</td>
                        <td className="tabular px-2 text-[12.5px]">{fmtDateShort(st.start)}</td><td className="tabular px-2 text-[12.5px]">{fmtDateShort(st.end)}</td>
                        <td colSpan={3} />
                        <td className={cn("tabular px-2 text-[12.5px]", st.actual >= 1 ? "text-success-fg" : st.overdue ? "text-rose-600" : "")}>{fmtPct(st.actual)}</td>
                        <td />
                        <td className="px-2 text-right">
                          {can("plan.edit") && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost"><MoreHorizontal /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => newTask(itemId)}><Plus /> Thêm công việc vào hạng mục</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem destructive onClick={() => removeItem(itemId, it.name)}><Trash2 /> Xóa hạng mục</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                      {!isCol && renderRows(rows)}
                      {!isCol && rows.length === 0 && <tr className="border-b"><td /><td colSpan={11} className="px-2 py-3 text-xs text-slate-400">Hạng mục chưa có công việc. {can("plan.edit") && <button className="text-primary hover:underline" onClick={() => newTask(itemId)}>Thêm công việc</button>}</td></tr>}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-[11.5px] text-slate-500">
          <span><AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-rose-500" />Quá hạn kế hoạch · <AlertTriangle className="mx-1 inline h-3.5 w-3.5 text-amber-500" />Chậm &gt; 15 điểm % so với kế hoạch · vạch đen trên thanh tiến độ = kế hoạch đến hôm nay</span>
          <span>Tiến độ nhóm/hạng mục/dự án = bình quân gia quyền theo giá trị (KL × đơn giá)</span>
        </div>
      </Card>

      <TaskProgressDialog taskId={progressId} open={!!progressId} onOpenChange={(o) => !o && setProgressId(null)} />
      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} projectId={project.id} task={db.constructionPlans.find((t) => t.id === editTaskId)} defaults={formDefaults} />
      <ItemFormDialog open={itemOpen} onOpenChange={setItemOpen} projectId={project.id} />
      <TaskDrawer taskId={drawerId} onClose={closeDrawer} onUpdate={(id) => { closeDrawer(); setProgressId(id); }} onEdit={editTask} />
    </div>
  );
}
