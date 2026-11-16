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
import { useConfirm } from "@/components/common/ConfirmProvider";
import { TaskUpdateForm, n1, p1 } from "./TaskUpdateForm";
import { TaskFormDialog } from "./TaskFormDialog";
import { confirmLog, deleteTask } from "@/services/actions";
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
  const task = db.constructionPlans.find((t) => t.id === taskId);
  const backTo = `/construction/plan/${projectId}`;
  if (!task) return <Card><EmptyState title="Không tìm thấy công việc" description="Công việc có thể đã bị xóa." action={<Button onClick={() => navigate(backTo)}>Về kế hoạch thi công</Button>} /></Card>;

  const project = db.projects.find((p) => p.id === task.projectId);
  const item = db.constructionItems.find((i) => i.id === task.itemId);
  const parent = db.constructionPlans.find((t) => t.id === task.parentId);
  const children = db.constructionPlans.filter((t) => t.parentId === task.id).sort((a, b) => a.order - b.order);
  const logs = db.constructionLogs.filter((l) => l.taskId === task.id).sort((a, b) => b.date.localeCompare(a.date));
  const photos = logs.flatMap((l) => l.photos.map((p) => ({ p, date: l.date })));
  const a = taskActualPct(task);
  const pl = taskPlannedPct(task);
  const h = taskHealth({ actual: a, planned: pl, plannedEnd: task.plannedEnd, plannedStart: task.plannedStart });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={backTo} className="mb-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> Kế hoạch thi công · {project?.shortName}</Link>
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
        <div><div className="mb-1 text-[11.5px] text-slate-500">Thực tế</div><div className="text-[13px] font-medium text-slate-800">{task.actualStart ? `${fmtDate(task.actualStart)} – ${task.actualEnd ? fmtDate(task.actualEnd) : "đang thực hiện"}` : "Chưa bắt đầu"}</div></div>
        <div>
          <div className="mb-1 flex justify-between text-[11.5px] text-slate-500"><span>Tiến độ (theo khối lượng)</span><b className="text-slate-800">{p1(a)}</b></div>
          <Progress value={a} tone={a >= 1 ? "success" : h === "qua_han" || h === "cham" ? "danger" : "info"} />
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
                <span className="w-40"><Progress value={taskActualPct(c)} tone={taskActualPct(c) >= 1 ? "success" : "info"} className="h-1.5" /></span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b px-5 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-700">Cập nhật kết quả thực hiện</div>
          <TaskUpdateForm taskId={task.id} />
        </Card>
      )}

      {!task.isGroup && (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader><CardTitle>Lịch sử nhật ký thi công ({logs.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {logs.length === 0 && <EmptyState title="Chưa có nhật ký" description="Cập nhật khối lượng ở form phía trên để ghi nhận nhật ký." className="py-8" />}
              {logs.map((l) => (
                <div key={l.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold">{fmtDate(l.date)} · <span className="text-success-fg">+{fmtNumber(l.qty)} {task.unit}</span></div>
                    {l.status === "da_xac_nhan" ? <Badge tone="success">CHT đã xác nhận</Badge> : l.status === "nhap" ? <Badge>Nháp</Badge> : can("log.confirm") ? (
                      <Button size="xs" variant="success" onClick={() => { run(confirmLog, l.id, user!.id); toast.success("Đã xác nhận kết quả"); }}><CheckCircle2 /> Xác nhận</Button>
                    ) : <Badge tone="warning">Chờ CHT xác nhận</Badge>}
                  </div>
                  <div className="mt-1 text-[13px] text-slate-600">{l.content}</div>
                  <div className="mt-1 text-[11.5px] text-slate-400">{db.users.find((u) => u.id === l.reporterId)?.name} · {l.labor.reduce((s, x) => s + x.people, 0)} nhân công · {l.photos.length} ảnh</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader><CardTitle>Hình ảnh hiện trường ({photos.length})</CardTitle></CardHeader>
            <CardContent>
              {photos.length === 0 ? <EmptyState title="Chưa có hình ảnh" className="py-8" /> : <div className="grid grid-cols-2 gap-2">{photos.map((x, i) => <SitePhoto key={i} kind={x.p} date={fmtDate(x.date)} />)}</div>}
            </CardContent>
          </Card>
        </div>
      )}
      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} projectId={task.projectId} task={task} />
    </div>
  );
}
