import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, Download, FileSpreadsheet, FileUp, FolderPlus, MoreVertical, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/common/EmptyState";
import { TableSkeleton } from "@/components/common/LoadingState";
import { TaskFormDialog, ItemFormDialog } from "./TaskFormDialog";
import { GanttChart, GanttLegend, type GanttRow, type GanttStatus, type GanttZoom } from "./GanttChart";
import { buildTaskTree, itemStats, projectStats, type TaskRow } from "@/services/selectors";
import { importPlanTasks } from "@/services/actions";
import { downloadTemplate, exportPlan, parsePlanFile, type ImportRow } from "@/services/planExcel";
import { fmtDateShort } from "@/utils/format";
import { diffDays } from "@/utils/date";
import { cn } from "@/utils/cn";
import { activeProjects } from "@/utils/labels";

export function PlanIndexRedirect() {
  const { db } = useDb();
  const first = db.projects.find((p) => p.id === "p01") ?? db.projects.find((p) => p.status === "dang_thi_cong") ?? db.projects[0];
  return first ? <Navigate to={`/construction/plan/${first.id}`} replace /> : <EmptyState title="Chưa có dự án" />;
}

/** Một dòng hiển thị của bảng kế hoạch (dự án / tổng hạng mục / hạng mục / công việc) */
interface Line {
  key: string;
  stt: string;
  code: string;
  name: string;
  depth: number;
  kind: "root" | "total" | "item" | "group" | "task";
  assignee: string;
  team: string;
  start: string;
  end: string;
  actualStart: string | null;
  actualEnd: string | null;
  lastUpdate?: string | null; // ngày cập nhật kết quả gần nhất
  actual: number;
  planned: number;
  unit: string;
  qty: number;
  actualQty?: number;
  predecessors?: { id: string; type: "FS" | "SS" }[];
  late: boolean;
  taskId?: string;
  itemId?: string;
  parentId?: string | null;
  childKeys: string[];
}

export default function PlanPage() {
  const { projectId = "" } = useParams();
  const [params] = useSearchParams();
  const { db, run } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showGantt, setShowGantt] = useState(params.get("view") !== "table");
  const [zoom, setZoom] = useState<GanttZoom>("month");
  const [baseline, setBaseline] = useState(false);
  const [onlyLate, setOnlyLate] = useState(false);
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | undefined>();
  const [formDefaults, setFormDefaults] = useState<{ itemId?: string; parentId?: string | null }>({});
  const [itemOpen, setItemOpen] = useState(false);
  const [importRows, setImportRows] = useState<{ rows: ImportRow[]; errors: string[]; file: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drawerId = params.get("task");
  const focusItem = params.get("item");

  const reload = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 450);
  };
  useEffect(reload, [projectId]);
  useEffect(() => {
    if (drawerId) navigate(`/construction/plan/${projectId}/task/${drawerId}`, { replace: true });
  }, [drawerId, projectId, navigate]);
  useEffect(() => {
    if (focusItem && !loading) setTimeout(() => document.getElementById(`row-${focusItem}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }, [focusItem, loading]);

  const project = db.projects.find((p) => p.id === projectId);
  const tree = useMemo(() => (project ? buildTaskTree(db, project.id) : []), [db, project]);
  const userName = (id: string) => db.users.find((u) => u.id === id)?.name ?? "";

  // ---------- dựng các dòng hiển thị ----------
  const lines = useMemo(() => {
    if (!project) return [] as Line[];
    const out: Line[] = [];
    const st = projectStats(db, project.id);
    const all = db.constructionPlans.filter((t) => t.projectId === project.id);
    const leaf = all.filter((t) => !t.isGroup);
    const minStart = (ts: typeof all) => ts.map((t) => t.actualStart).filter(Boolean).sort()[0] ?? null;
    const maxEnd = (ts: typeof all) => (ts.length && ts.every((t) => t.actualEnd) ? ts.map((t) => t.actualEnd!).sort().pop()! : null);
    const pStart = all.map((t) => t.plannedStart).sort()[0] ?? project.startDate;
    const pEnd = all.map((t) => t.plannedEnd).sort().pop() ?? project.endDate;
    const items = db.constructionItems.filter((i) => i.projectId === project.id).sort((a, b) => a.order - b.order);
    const lastLog = new Map<string, string>();
    db.constructionLogs.forEach((l) => { if (l.projectId === project.id && l.qty > 0 && (lastLog.get(l.taskId) ?? "") < l.date) lastLog.set(l.taskId, l.date); });
    const lastOf = (ts: typeof all) => ts.map((t) => lastLog.get(t.id) ?? t.actualEnd ?? "").filter(Boolean).sort().pop() ?? null;
    const avgR = (rs: TaskRow[], f: (r: TaskRow) => number) => (rs.length ? rs.reduce((x, r) => x + f(r), 0) / rs.length : 0);
    const base = { team: "", unit: "", qty: 0, parentId: null, childKeys: [] as string[] };
    out.push({ ...base, key: "root", stt: "1", code: "W00001", name: "Thi công", depth: 0, kind: "root", assignee: "", start: pStart, end: pEnd, actualStart: minStart(leaf), actualEnd: maxEnd(leaf), lastUpdate: lastOf(leaf), actual: st.actual, planned: st.planned, late: st.health === "cham_tien_do", childKeys: ["total"] });
    out.push({ ...base, key: "total", stt: "1.1", code: "", name: "TỔNG TIẾN ĐỘ THI CÔNG", depth: 1, kind: "total", assignee: userName(project.commanderId), start: pStart, end: pEnd, actualStart: minStart(leaf), actualEnd: maxEnd(leaf), lastUpdate: lastOf(leaf), actual: st.actual, planned: st.planned, late: st.health === "cham_tien_do", childKeys: items.map((i) => i.id) });
    let w = 1;
    tree.forEach(({ itemId, rows }) => {
      const it = items.find((i) => i.id === itemId)!;
      const ist = itemStats(db, itemId);
      const its = leaf.filter((t) => t.itemId === itemId);
      out.push({ ...base, key: itemId, stt: it.code, code: "", name: it.name, depth: 2, kind: "item", assignee: userName(it.managerId), start: ist.start || pStart, end: ist.end || pEnd, actualStart: minStart(its), actualEnd: maxEnd(its), lastUpdate: lastOf(its), actual: avgR(rows, (r) => r.actual), planned: avgR(rows, (r) => r.planned), late: avgR(rows, (r) => r.actual) + 1e-9 < avgR(rows, (r) => r.planned), itemId, childKeys: rows.map((r) => r.task.id) });
      const walk = (rs: TaskRow[], depth: number) =>
        rs.forEach((r) => {
          const t = r.task;
          const descOf = (id: string): typeof all => all.filter((x) => x.parentId === id).flatMap((x) => [x, ...descOf(x.id)]);
          const desc = r.children.length ? descOf(t.id).filter((x) => !all.some((c) => c.parentId === x.id)) : [t];
          out.push({
            key: t.id, stt: t.code, code: `W${String(++w).padStart(5, "0")}`, name: t.name, depth, kind: r.children.length ? "group" : "task",
            assignee: userName(t.assigneeId), team: t.team, start: t.plannedStart, end: t.plannedEnd,
            actualStart: r.children.length ? minStart(desc) : t.actualStart, actualEnd: r.children.length ? maxEnd(desc) : t.actualEnd, lastUpdate: lastOf(r.children.length ? desc : [t]),
            actual: r.actual, planned: r.planned, unit: r.children.length ? "" : t.unit, qty: r.children.length ? 0 : t.contractQty, actualQty: r.children.length ? 0 : t.actualQty, predecessors: t.predecessors, late: r.health === "cham",
            taskId: t.id, itemId, parentId: t.parentId, childKeys: r.children.map((c) => c.task.id),
          });
          walk(r.children, depth + 1);
        });
      walk(rows, 3);
    });
    return out;
  }, [db, project, tree]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return <Card><EmptyState title="Không tìm thấy dự án" action={<Button onClick={() => navigate("/construction/plan")}>Chọn dự án khác</Button>} /></Card>;

  // ---------- lọc & thu gọn ----------
  const byKey = new Map(lines.map((l) => [l.key, l]));
  const selfMatch = (l: Line) => (!q || `${l.stt} ${l.name}`.toLowerCase().includes(q.toLowerCase())) && (!onlyLate || l.late);
  const visibleSet = new Set<string>();
  const markVisible = (l: Line): boolean => {
    const childVisible = l.childKeys.map((k) => byKey.get(k)).filter(Boolean).map((c) => markVisible(c!)).some(Boolean);
    const v = l.kind === "root" || l.kind === "total" || selfMatch(l) || childVisible;
    if (v) visibleSet.add(l.key);
    return v;
  };
  if (lines.length) markVisible(lines[0]);
  const filtering = !!(q || onlyLate);
  const hidden = new Set<string>();
  const hideDesc = (l: Line) => l.childKeys.forEach((k) => { hidden.add(k); const c = byKey.get(k); if (c) hideDesc(c); });
  if (!filtering) lines.forEach((l) => collapsed[l.key] && hideDesc(l));
  const shown = lines.filter((l) => visibleSet.has(l.key) && !hidden.has(l.key));

  const openDetail = (id: string) => navigate(`/construction/plan/${project.id}/task/${id}`);
  const newTask = (itemId?: string, parentId: string | null = null) => { setEditTaskId(undefined); setFormDefaults({ itemId, parentId }); setFormOpen(true); };
  const plus = (l: Line) => {
    if (!can("plan.edit")) return toast.info("Chỉ Chỉ huy trưởng được điều chỉnh kế hoạch để thêm công việc");
    if (l.kind === "root" || l.kind === "total") return setItemOpen(true);
    if (l.kind === "item") return newTask(l.itemId);
    if (l.kind === "group") return newTask(l.itemId, l.taskId);
    return newTask(l.itemId, l.parentId ?? null);
  };

  // ---------- Excel ----------
  const onImportFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const res = await parsePlanFile(f);
      setImportRows({ ...res, file: f.name });
    } catch {
      toast.error("Không đọc được file – hãy dùng file .xlsx theo template");
    }
  };
  const doImport = () => {
    if (!importRows?.rows.length) return;
    run(importPlanTasks, project.id, importRows.rows);
    toast.success(`Đã nhập ${importRows.rows.length} công việc từ Excel`);
    setImportRows(null);
  };

  // ---------- Gantt ----------
  /** Màu thanh Gantt: hoàn thành / hoàn thành muộn / chậm tiến độ / đang thực hiện / chưa bắt đầu */
  const ganttStatus = (l: Line): GanttStatus => {
    if (l.actual >= 1) return l.actualEnd && l.actualEnd > l.end ? "hoan_thanh_muon" : "dung_tien_do";
    // % thực tế < % kế hoạch đến hôm nay → chậm tiến độ (áp dụng cho cả công việc, hạng mục, tổng)
    if (l.actual + 1e-9 < l.planned) return "cham_tien_do";
    if (l.actual > 0) return "dang_thuc_hien";
    return "chua_bat_dau";
  };
  const ganttRows: GanttRow[] = shown.filter((l) => l.kind !== "root").map((l) => ({
    id: l.taskId ?? l.key, label: l.kind === "item" ? `${l.stt}. ${l.name.toUpperCase()}` : l.name, code: l.kind === "total" ? "1" : l.kind === "item" ? "" : l.stt, depth: Math.max(0, l.depth - 1), kind: l.kind === "total" ? "project" : l.kind === "item" ? "item" : l.kind === "group" ? "group" : "task",
    start: l.start, end: l.end, actualStart: l.actualStart, actualEnd: l.actualEnd, lastUpdate: l.lastUpdate,
    status: ganttStatus(l), progress: l.actual, planned: l.planned, unit: l.unit, qty: l.qty, actualQty: l.actualQty, predecessors: l.predecessors,
    assignee: l.assignee || undefined,
  }));
  const printGantt = () => {
    const prev = zoom;
    setShowGantt(true);
    setZoom("print");
    const restore = () => { setZoom(prev); window.removeEventListener("afterprint", restore); };
    window.addEventListener("afterprint", restore);
    setTimeout(() => window.print(), 350);
  };

  /** % làm tròn xuống khi chưa xong để không hiển thị 100% cho việc chưa hoàn thành */
  const pct = (v: number) => (v >= 1 ? "100%" : `${Math.min(99, Math.round(v * 100))}%`);
  const rowBg = (l: Line) =>
    l.kind === "total" ? "bg-[#FFF4DF]" : l.kind === "item" ? "bg-[#EAF2FA]" : l.actual >= 1 && (l.kind === "task" || l.kind === "group") ? "bg-[#EEF8F1]" : "bg-white";

  return (
    <div>
      <div className="mb-4 print:hidden">
        <div className="text-[12px] text-slate-500">Quản lý công trình / Tiến độ thi công</div>
        <h1 className="mt-0.5 text-[22px] font-bold uppercase tracking-tight text-slate-900">Tiến độ thi công dự án</h1>
      </div>

      <Card className="mb-3 flex flex-wrap items-center gap-2 px-4 py-3 xl:flex-nowrap print:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-1 text-[13.5px]">
          <Link to="/projects" className="shrink-0 text-success-fg hover:underline">Danh sách dự án</Link>
          <span className="text-slate-400">»</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex min-w-0 items-center gap-1 font-medium text-slate-800 hover:text-primary"><span className="truncate">{project.name}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 w-80 overflow-y-auto">
              <DropdownMenuLabel>Chọn dự án</DropdownMenuLabel>
              {activeProjects(db).map((p) => <DropdownMenuItem key={p.id} onClick={() => navigate(`/construction/plan/${p.id}`)} className={cn(p.id === project.id && "font-semibold text-primary")}>{p.name}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
        <Button size="sm" variant="ghost" className="bg-success-soft text-success-fg hover:bg-success-soft/70" onClick={() => { reload(); toast.success("Đã tải lại dữ liệu kế hoạch"); }}>Tải lại</Button>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm công việc..." className="h-8 pl-8" />
        </div>
        <div className="flex rounded-md border border-slate-200 p-0.5">
          <button className={cn("rounded px-2.5 py-1 text-[12.5px] font-medium", !showGantt ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100")} onClick={() => setShowGantt(false)}>Danh sách</button>
          <button className={cn("rounded px-2.5 py-1 text-[12.5px] font-medium", showGantt ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100")} onClick={() => setShowGantt(true)}>Gantt</button>
        </div>
        {showGantt && <select value={zoom === "print" ? "month" : zoom} onChange={(e) => setZoom(e.target.value as GanttZoom)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12.5px]" aria-label="Thang thời gian"><option value="week">Theo tuần</option><option value="month">Theo tháng</option><option value="quarter">Theo quý</option></select>}
        {!showGantt && <Button size="sm" variant="outline" className={cn(baseline && "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100")} onClick={() => setBaseline(!baseline)}>{baseline ? "Ẩn % kế hoạch" : "Hiện % kế hoạch"}</Button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="sm" variant="outline">Thao tác</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onClick={() => setCollapsed({})}>Mở rộng tất cả</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCollapsed(Object.fromEntries(lines.filter((l) => l.kind === "item" || l.kind === "group").map((l) => [l.key, true])))}>Thu gọn tất cả</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOnlyLate(!onlyLate)}>{onlyLate ? "Hiện tất cả công việc" : "Chỉ hiện công việc chậm / quá hạn"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            {can("plan.edit") && <DropdownMenuItem onClick={() => setItemOpen(true)}><FolderPlus /> Thêm hạng mục</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => navigate(`/construction/logs?project=${project.id}`)}>Nhật ký thi công</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex">
          <Button size="sm" variant="navy" className="rounded-r-none" disabled={!can("plan.edit")} onClick={() => newTask()}>Thêm công việc</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" variant="navy" className="rounded-l-none border-l border-white/20 px-2" aria-label="Thêm tùy chọn"><MoreVertical /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Công việc theo template Excel</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => downloadTemplate(db, project.id).then(() => toast.success("Đã tải template Excel"))}><FileSpreadsheet /> Tải template Excel</DropdownMenuItem>
              <DropdownMenuItem disabled={!can("plan.edit")} onClick={() => fileRef.current?.click()}><FileUp /> Nhập Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPlan(db, project.id).then((n) => toast.success(`Đã xuất ${n} công việc ra Excel`))}><Download /> Xuất Excel</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={printGantt}><Printer /> In biểu đồ Gantt</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { onImportFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        </div>
      </Card>
      {onlyLate && <div className="mb-2 text-xs text-amber-700">Đang chỉ hiện công việc chậm / quá hạn · <button className="underline" onClick={() => setOnlyLate(false)}>Hiện tất cả</button></div>}

      <Card className="overflow-hidden">
        {loading ? <TableSkeleton rows={14} cols={10} /> : lines.length <= 2 ? (
          <EmptyState title="Chưa có kế hoạch thi công" description={project.approvalStatus === "cho_duyet" ? "Dự án đang chờ Tổng công ty phê duyệt nhận thi công." : "Thêm hạng mục, sau đó thêm công việc – hoặc nhập kế hoạch từ file Excel theo template."} action={can("plan.edit") && project.approvalStatus !== "cho_duyet" ? <Button onClick={() => setItemOpen(true)}><FolderPlus /> Thêm hạng mục</Button> : undefined} />
        ) : showGantt ? (
          <>
            <div className="gantt-title border-b px-4 py-3 text-center">
              <div className="text-[15px] font-bold uppercase text-slate-900">Tiến độ thi công tổng thể</div>
              <div className="text-[12px] text-slate-600">Dự án: {project.name.toUpperCase()}</div>
            </div>
            <div className="border-b px-4 py-2 print:hidden"><GanttLegend /></div>
            <GanttChart rows={ganttRows} zoom={zoom} onRowClick={(id) => db.constructionPlans.some((t) => t.id === id) && openDetail(id)} />
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="whitespace-nowrap bg-slate-50 text-[12px] text-slate-500">
                <tr className="border-b">
                  <th className="px-2.5 py-2.5 text-left font-medium">STT</th>
                  <th className="px-1.5 text-left font-medium">Mã số</th>
                  <th className="w-8" />
                  <th className="px-1.5 text-left font-medium">Công việc</th>
                  <th className="px-1.5 text-left font-medium">Người thực hiện</th>
                  <th className="px-1.5 text-left font-medium">Tổ thực hiện</th>
                  <th className="px-1.5 text-left font-medium">Thời gian<br />(ngày)</th>
                  <th className="px-1.5 text-left font-medium">Bắt đầu<br />kế hoạch</th>
                  <th className="px-1.5 text-left font-medium">Kết thúc<br />kế hoạch</th>
                  <th className="px-1.5 text-left font-medium">Bắt đầu<br />thực tế</th>
                  <th className="px-1.5 text-left font-medium">Hoàn thành<br />thực tế</th>
                  <th className="px-1.5 text-left font-medium">% hoàn thành</th>
                  {baseline && <th className="px-1.5 text-left font-medium">Tiến độ<br />kế hoạch</th>}
                  <th className="px-2 text-left font-medium">ĐVT</th>
                  <th className="px-2 text-right font-medium">KL hợp đồng</th>
                  <th className="px-2 text-right font-medium">KL thực tế</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => {
                  const bold = l.kind !== "task";
                  const canToggle = l.childKeys.length > 0 && l.kind !== "root" && l.kind !== "total";
                  const isCol = collapsed[l.key] && !filtering;
                  const clickable = !!l.taskId;
                  return (
                    <tr key={l.key} id={`row-${l.key}`} className={cn("border-b border-slate-100", rowBg(l), drawerId === l.taskId && "ring-2 ring-inset ring-primary/30", focusItem === l.key && "ring-2 ring-inset ring-primary/40")}>
                      <td className="whitespace-nowrap px-2.5 py-2 text-slate-600">{l.stt}</td>
                      <td className="whitespace-nowrap px-1.5 py-2 text-slate-600">{l.code}</td>
                      <td className="px-1 text-center">
                        <button onClick={() => plus(l)} className="h-6 w-6 rounded text-[16px] font-medium leading-none text-info-fg hover:bg-info-soft" aria-label="Thêm">+</button>
                      </td>
                      <td className="px-1.5 py-2">
                        <div className="flex max-w-[250px] items-center gap-1 whitespace-nowrap" style={{ paddingLeft: l.depth * 12 }} title={l.name}>
                          {canToggle ? (
                            <button onClick={() => setCollapsed((c) => ({ ...c, [l.key]: !c[l.key] }))} className="text-[10px] text-slate-700">{isCol ? "▶" : "▼"}</button>
                          ) : l.kind === "root" || l.kind === "total" ? <span className="text-[10px] text-slate-700">▼</span> : <span className="inline-block w-3" />}
                          {clickable ? (
                            <button onClick={() => openDetail(l.taskId!)} className={cn("min-w-0 truncate text-left hover:text-primary hover:underline", bold ? "font-semibold text-slate-900" : "text-slate-700")}>{l.name}</button>
                          ) : (
                            <span className={cn("min-w-0 truncate", bold && "font-semibold text-slate-900")}>{l.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-1.5 py-2 text-slate-700">{l.assignee}</td>
                      <td className="max-w-[120px] truncate whitespace-nowrap px-1.5 py-2 text-slate-600" title={l.team}>{l.team}</td>
                      <td className="tabular px-1.5 py-2">{diffDays(l.start, l.end) + 1}</td>
                      <td className="tabular whitespace-nowrap px-1.5 py-2">{fmtDateShort(l.start)}</td>
                      <td className="tabular whitespace-nowrap px-1.5 py-2">{fmtDateShort(l.end)}</td>
                      <td className="tabular whitespace-nowrap px-1.5 py-2">{l.actualStart ? fmtDateShort(l.actualStart) : ""}</td>
                      <td className="tabular whitespace-nowrap px-1.5 py-2">{l.actual >= 1 && (l.actualEnd ?? l.lastUpdate) ? fmtDateShort((l.actualEnd ?? l.lastUpdate)!) : ""}</td>
                      <td className="tabular whitespace-nowrap px-1.5 py-2 text-slate-700">{pct(l.actual)}</td>
                      {baseline && <td className="tabular whitespace-nowrap px-1.5 py-2 text-slate-500">{pct(l.planned)}</td>}
                      <td className="whitespace-nowrap px-2.5 py-2 text-slate-600">{l.unit}</td>
                      <td className="tabular whitespace-nowrap px-2.5 py-2 text-right text-slate-700">{l.qty ? l.qty.toLocaleString("vi-VN") : ""}</td>
                      <td className="tabular whitespace-nowrap px-2.5 py-2 text-right text-slate-700">{l.kind === "task" && l.qty ? `${(l.actualQty ?? 0) > l.qty ? "+" : ""}${(l.actualQty ?? 0).toLocaleString("vi-VN")}` : ""}</td>
                    </tr>
                  );
                })}
                {shown.length <= 2 && <tr><td colSpan={16} className="py-8 text-center text-xs text-slate-400">Không có công việc phù hợp</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-2 text-[11.5px] text-slate-400 print:hidden">Bấm vào tên công việc để mở màn hình chi tiết và cập nhật kết quả · % hoàn thành của nhóm / hạng mục = trung bình cộng các công việc con · “+” thêm công việc tại vị trí dòng</p>

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} projectId={project.id} task={db.constructionPlans.find((t) => t.id === editTaskId)} defaults={formDefaults} />
      <ItemFormDialog open={itemOpen} onOpenChange={setItemOpen} projectId={project.id} />

      <Dialog open={!!importRows} onOpenChange={(o) => !o && setImportRows(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Nhập kế hoạch từ Excel</DialogTitle><DialogDescription>{importRows?.file} · {importRows?.rows.length ?? 0} công việc hợp lệ{importRows?.errors.length ? ` · ${importRows.errors.length} lỗi` : ""}</DialogDescription></DialogHeader>
          <DialogBody className="space-y-3">
            {!!importRows?.errors.length && (
              <div className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700"><div className="mb-1 font-semibold">Các dòng bị bỏ qua:</div><ul className="list-disc space-y-0.5 pl-4">{importRows.errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul></div>
            )}
            {!!importRows?.rows.length && (
              <div className="max-h-72 overflow-auto rounded-md border">
                <table className="w-full text-[12.5px]">
                  <thead className="sticky top-0 bg-slate-50 text-[11px] text-slate-500"><tr><th className="px-2 py-1.5 text-left">Hạng mục</th><th className="px-2 text-left">Công việc</th><th className="px-2 text-left">Người thực hiện</th><th className="px-2 text-left">Tổ</th><th className="px-2 text-right">KL</th><th className="px-2 text-left">Thời gian</th></tr></thead>
                  <tbody>{importRows.rows.map((r) => <tr key={r.line} className="border-t"><td className="px-2 py-1.5">{r.itemCode} {r.itemName}</td><td className="px-2">{r.name}</td><td className="px-2">{r.assigneeName}</td><td className="px-2">{r.team}</td><td className="px-2 text-right">{r.qty} {r.unit}</td><td className="whitespace-nowrap px-2">{fmtDateShort(r.start)} – {fmtDateShort(r.end)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
            <p className="text-[11.5px] text-slate-500">Công việc được thêm vào hạng mục theo “Mã hạng mục”; nếu chưa có hạng mục sẽ tự tạo mới. Người thực hiện được khớp theo họ tên.</p>
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setImportRows(null)}>Hủy</Button><Button disabled={!importRows?.rows.length} onClick={doImport}>Nhập {importRows?.rows.length ?? 0} công việc</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
