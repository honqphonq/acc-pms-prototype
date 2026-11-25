import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserCell } from "@/components/common/UserAvatar";
import { SitePhoto } from "@/components/common/SitePhoto";
import { EmptyState } from "@/components/common/EmptyState";
import { ActivityLog, type ActivityItem } from "@/components/common/ActivityLog";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { TaskUpdateForm, n1, p1 } from "./TaskUpdateForm";
import { TaskFormDialog } from "./TaskFormDialog";
import { confirmLog, deleteLog, deleteTask } from "@/services/actions";
import { TaskProgressDialog } from "./TaskProgressDialog";
import { cn } from "@/utils/cn";
import { DEMO_TODAY } from "@/utils/date";
import { taskActualPct, taskHealth, taskPlannedPct, TASK_HEALTH_LABEL } from "@/services/selectors";
import { TASK_STATUS } from "@/utils/constants";
import { diffDays } from "@/utils/date";
import { fmtDate, fmtNumber } from "@/utils/format";

/** Màn hình chi tiết công việc: thông tin, cập nhật kết quả (tự tính %), lịch sử nhật ký & hình ảnh */
export default function TaskDetailPage() {
  const { projectId = "", taskId = "" } = useParams();
  const { db, run } = useDb();
  const { can, user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [editOpen, setEditOpen] = useState(false);
  const [editLog, setEditLog] = useState<string | null>(null);
  const [quick, setQuick] = useState<string | null>(null);
  const task = db.constructionPlans.find((t) => t.id === taskId);
  const backTo = `/construction/plan/${projectId}`;
  if (!task) return <Card><EmptyState title="Không tìm thấy công việc" description="Công việc có thể đã bị xóa." action={<Button onClick={() => navigate(backTo)}>Về kế hoạch thi công</Button>} /></Card>;

  const project = db.projects.find((p) => p.id === task.projectId);
  const item = db.constructionItems.find((i) => i.id === task.itemId);
  const parent = db.constructionPlans.find((t) => t.id === task.parentId);
  const children = db.constructionPlans.filter((t) => t.parentId === task.id).sort((a, b) => a.order - b.order);
  const logs = db.constructionLogs.filter((l) => l.taskId === task.id).sort((a, b) => b.date.localeCompare(a.date));
  const a = taskActualPct(task);
  const pl = taskPlannedPct(task);
  const h = taskHealth({ actual: a, planned: pl, plannedEnd: task.plannedEnd, plannedStart: task.plannedStart, actualEnd: task.actualEnd });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={backTo} className="mb-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> Tiến độ thi công · {project?.shortName}</Link>
          <div className="text-[12px] text-slate-500">{item?.code} {item?.name}{parent ? ` › ${parent.name}` : ""}</div>
          <h1 className="mt-0.5 flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900">
            <span className="text-slate-400">{task.code}</span> {task.name}
            <StatusBadge map={TASK_STATUS} value={task.status} />
            {!task.isGroup && <Badge tone={TASK_HEALTH_LABEL[h].tone}>{TASK_HEALTH_LABEL[h].label}</Badge>}
          </h1>
        </div>
        {can("plan.edit") && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil /> Sửa / giao lại</Button>
            <Button variant="ghost" className="text-rose-600" onClick={async () => { if (await confirm({ title: `Xóa công việc ${task.code}?`, description: "Công việc cùng nhật ký liên quan sẽ bị xóa; tiến độ dự án được tính lại.", destructive: true, confirmText: "Xóa" })) { run(deleteTask, task.id); toast.success("Đã xóa công việc"); navigate(backTo); } }}><Trash2 /> Xóa</Button>
          </div>
        )}
      </div>

      <Card className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div><div className="mb-1 text-[11.5px] text-slate-500">Người thực hiện</div><UserCell userId={task.assigneeId} sub="" /></div>
        <div><div className="mb-1 text-[11.5px] text-slate-500">Tổ thực hiện</div><div className="text-[13px] font-medium text-slate-800">{task.team || "—"}</div></div>
        <div><div className="mb-1 text-[11.5px] text-slate-500">Kế hoạch</div><div className="text-[13px] font-medium text-slate-800">{fmtDate(task.plannedStart)} – {fmtDate(task.plannedEnd)}</div><div className="text-[11px] text-slate-400">{diffDays(task.plannedStart, task.plannedEnd) + 1} ngày{task.expectedEnd && task.expectedEnd !== task.plannedEnd ? ` · dự kiến xong ${fmtDate(task.expectedEnd)}` : ""}</div></div>
        <div><div className="mb-1 text-[11.5px] text-slate-500">Thực tế</div><div className="text-[13px] font-medium text-slate-800">{task.actualStart ? `${fmtDate(task.actualStart)} – ${a >= 1 && task.actualEnd ? fmtDate(task.actualEnd) : "đang thực hiện"}` : "Chưa bắt đầu"}</div>{a >= 1 && task.actualEnd && <div className="text-[11px] text-slate-400">Hoàn thành thực tế {fmtDate(task.actualEnd)}</div>}</div>
        <div>
          <div className="mb-1 flex justify-between text-[11.5px] text-slate-500"><span>Tiến độ (theo khối lượng)</span><b className="text-slate-800">{p1(a)}</b></div>
          <Progress value={a} tone={a >= 1 ? "success" : "info"} />
          {!task.isGroup && <div className="mt-1 text-[11px] text-slate-400">{n1(task.actualQty)} / {n1(task.contractQty)} {task.unit}</div>}
        </div>
      </Card>

      {task.isGroup || children.length ? (
        <Card>
          <CardHeader><CardTitle>Công việc con ({children.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {children.map((c) => (
              <Link key={c.id} to={`/construction/plan/${projectId}/task/${c.id}`} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 hover:bg-slate-50">
                <span className="text-[13px]"><span className="text-slate-400">{c.code}</span> {c.name}</span>
                <span className="flex items-center gap-3"><span className="w-40"><Progress value={taskActualPct(c)} tone={taskActualPct(c) >= 1 ? "success" : "info"} className="h-1.5" /></span><span className="w-12 text-right text-[12px] font-semibold">{Math.floor(taskActualPct(c) * 1000) / 10}%</span>{!c.isGroup && can("progress.update") && <Button size="xs" variant="soft" onClick={(e) => { e.preventDefault(); setQuick(c.id); }}>Cập nhật</Button>}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b px-5 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-700">Cập nhật kết quả thực hiện</div>
          <TaskUpdateForm taskId={task.id} editLogId={editLog} onEditDone={() => setEditLog(null)} />
        </Card>
      )}

      {!task.isGroup && <TaskLinks taskId={task.id} />}

      {!task.isGroup && (() => {
        const asc = [...logs].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
        const cum = new Map<string, number>();
        let acc = 0;
        asc.forEach((l) => { if (l.status !== "nhap") acc = Math.round((acc + l.qty) * 100) / 100; cum.set(l.id, acc); });
        const items: ActivityItem[] = logs.flatMap((l) => {
          const c = cum.get(l.id) ?? 0;
          const pctTxt = task.contractQty ? ` · ${Math.min(100, Math.round((c / task.contractQty) * 1000) / 10).toLocaleString("vi-VN")}%` : "";
          const out: ActivityItem[] = [{
            id: l.id, at: `${l.date}T17:00`, userId: l.reporterId,
            text: <>cập nhật khối lượng <b className="text-slate-800">+{fmtNumber(l.qty)} {task.unit}</b> (lũy kế {fmtNumber(c)} {task.unit}{pctTxt}){l.status === "nhap" && <Badge className="ml-1">Nháp</Badge>}</>,
            extra: (l.content || l.photos.length > 0) && <div className={cn("rounded-md bg-slate-50 px-2.5 py-1.5 text-[12.5px] text-slate-600", editLog === l.id && "ring-2 ring-sky-300")}>{l.content}{l.photos.length > 0 && <div className="mt-1.5 flex gap-1">{l.photos.slice(0, 4).map((ph, k) => <SitePhoto key={k} kind={ph} caption={false} className="h-10 w-14" />)}</div>}</div>,
            actions: <>
              {l.status === "da_gui" && can("log.confirm") && <Button size="xs" variant="success" onClick={() => { run(confirmLog, l.id, user!.id); toast.success("Đã xác nhận kết quả"); }}><CheckCircle2 /> Xác nhận</Button>}
              {can("progress.update") && <>
                <Button size="icon-sm" variant="ghost" aria-label="Sửa" className="text-slate-400 opacity-0 group-hover:opacity-100" onClick={() => { setEditLog(l.id); window.scrollTo({ top: 300, behavior: "smooth" }); }}><Pencil /></Button>
                <Button size="icon-sm" variant="ghost" aria-label="Xóa" className="text-slate-400 opacity-0 hover:text-rose-600 group-hover:opacity-100" onClick={async () => { if (await confirm({ title: `Xóa bản ghi ngày ${fmtDate(l.date)}?`, description: "Lũy kế, tiến độ và trạng thái công việc sẽ được tính lại.", destructive: true, confirmText: "Xóa" })) { run(deleteLog, l.id); if (editLog === l.id) setEditLog(null); toast.success("Đã xóa bản ghi"); } }}><Trash2 /></Button>
              </>}
            </>,
          }];
          if (l.status === "da_xac_nhan" && l.confirmedById) out.push({ id: `${l.id}-c`, at: `${l.date}T18:30`, userId: l.confirmedById, text: <>xác nhận kết quả ngày {fmtDate(l.date)}</> });
          return out;
        });
        if (task.actualStart) items.push({ id: "start", at: `${task.actualStart}T07:00`, userId: task.assigneeId, text: <>bắt đầu thực hiện công việc <b className="text-slate-800">{task.name}</b></> });
        if (task.actualEnd && a >= 1) items.push({ id: "end", at: `${task.actualEnd}T19:00`, userId: task.assigneeId, text: <>hoàn thành 100% khối lượng công việc</> });
        return (
          <Card>
            <CardHeader><CardTitle>Lịch sử hoạt động</CardTitle>{task.actualQty > task.contractQty && task.contractQty > 0 && <Badge tone="warning">Khối lượng phát sinh: {fmtNumber(task.actualQty - task.contractQty)} {task.unit}</Badge>}</CardHeader>
            <CardContent><ActivityLog items={items} empty="Chưa có cập nhật – nhập khối lượng thực hiện ở form phía trên." /></CardContent>
          </Card>
        );
      })()}
      <TaskProgressDialog taskId={quick} open={!!quick} onOpenChange={(o) => !o && setQuick(null)} />
      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} projectId={task.projectId} task={task} />
    </div>
  );
}

/** Liên kết công việc (FS/SS) */
function TaskLinks({ taskId }: { taskId: string }) {
  const { db } = useDb();
  const task = db.constructionPlans.find((t) => t.id === taskId)!;
  const byId = (id: string) => db.constructionPlans.find((t) => t.id === id);
  const preds = (task.predecessors ?? []).map((p) => ({ ...p, t: byId(p.id) })).filter((p) => p.t);
  const succs = db.constructionPlans.filter((t) => t.predecessors?.some((p) => p.id === task.id));
  const link = (t: { id: string; code: string; name: string; projectId: string }) => <Link to={`/construction/plan/${t.projectId}/task/${t.id}`} className="hover:text-primary hover:underline">[{t.code}] {t.name}</Link>;
  const linkWarn = preds.some((p) => p.type === "FS" && p.t!.status !== "hoan_thanh" && task.plannedStart <= DEMO_TODAY);
  return (
    <Card>
      <CardHeader><CardTitle>Liên kết công việc</CardTitle></CardHeader>
      <CardContent className="grid gap-3 text-[13px] sm:grid-cols-2">
        <div><div className="mb-1 text-[11.5px] text-slate-500">Công việc liền trước</div>{preds.length ? preds.map((p) => <div key={p.id} className="flex items-center gap-2"><Badge tone="outline">{p.type}</Badge>{link(p.t!)}<span className="text-[11px] text-slate-400">· {Math.floor(taskActualPct(p.t!) * 100)}%</span></div>) : <span className="text-slate-400">Không có</span>}</div>
        <div><div className="mb-1 text-[11.5px] text-slate-500">Công việc kế tiếp</div>{succs.length ? succs.map((t) => <div key={t.id} className="flex items-center gap-2"><Badge tone="outline">{t.predecessors!.find((p) => p.id === task.id)!.type}</Badge>{link(t)}</div>) : <span className="text-slate-400">Không có</span>}</div>
        {linkWarn && <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:col-span-2">Công việc liền trước (FS) chưa hoàn thành – có thể ảnh hưởng thời điểm bắt đầu công việc này.</div>}
      </CardContent>
    </Card>
  );
}
