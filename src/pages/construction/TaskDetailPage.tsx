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
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserCell } from "@/components/common/UserAvatar";
import { SitePhoto } from "@/components/common/SitePhoto";
import { EmptyState } from "@/components/common/EmptyState";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { TaskUpdateForm, n1, p1 } from "./TaskUpdateForm";
import { TaskFormDialog } from "./TaskFormDialog";
import { confirmLog, deleteTask, saveRow } from "@/services/actions";
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

      {!task.isGroup && <LinksAndQuality taskId={task.id} />}

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

/** Liên kết công việc (FS/SS) và đánh giá chất lượng / nghiệm thu nội bộ */
function LinksAndQuality({ taskId }: { taskId: string }) {
  const { db, run } = useDb();
  const { can, user } = useAuth();
  const [result, setResult] = useState<"dat" | "khong_dat">("dat");
  const [note, setNote] = useState("");
  const task = db.constructionPlans.find((t) => t.id === taskId)!;
  const byId = (id: string) => db.constructionPlans.find((t) => t.id === id);
  const preds = (task.predecessors ?? []).map((p) => ({ ...p, t: byId(p.id) })).filter((p) => p.t);
  const succs = db.constructionPlans.filter((t) => t.predecessors?.some((p) => p.id === task.id));
  const q = task.quality;
  const link = (t: { id: string; code: string; name: string; projectId: string }) => <Link to={`/construction/plan/${t.projectId}/task/${t.id}`} className="hover:text-primary hover:underline">[{t.code}] {t.name}</Link>;
  const linkWarn = preds.some((p) => p.type === "FS" && p.t!.status !== "hoan_thanh" && task.plannedStart <= DEMO_TODAY);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Liên kết công việc</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-[13px]">
          <div><div className="mb-1 text-[11.5px] text-slate-500">Công việc liền trước</div>{preds.length ? preds.map((p) => <div key={p.id} className="flex items-center gap-2"><Badge tone="outline">{p.type}</Badge>{link(p.t!)}<span className="text-[11px] text-slate-400">· {Math.floor(taskActualPct(p.t!) * 100)}%</span></div>) : <span className="text-slate-400">Không có</span>}</div>
          <div><div className="mb-1 text-[11.5px] text-slate-500">Công việc kế tiếp</div>{succs.length ? succs.map((t) => <div key={t.id} className="flex items-center gap-2"><Badge tone="outline">{t.predecessors!.find((p) => p.id === task.id)!.type}</Badge>{link(t)}</div>) : <span className="text-slate-400">Không có</span>}</div>
          {linkWarn && <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Công việc liền trước (FS) chưa hoàn thành – có thể ảnh hưởng thời điểm bắt đầu công việc này.</div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Đánh giá chất lượng / nghiệm thu</CardTitle></CardHeader>
        <CardContent className="text-[13px]">
          {q ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">{q.result === "dat" ? <Badge tone="success">Đạt yêu cầu</Badge> : <Badge tone="danger">Không đạt – yêu cầu khắc phục</Badge>}<span className="text-xs text-slate-500">{db.users.find((u) => u.id === q.byId)?.name} · {fmtDate(q.at)}</span></div>
              <p className="text-slate-700">{q.note}</p>
              {(can("log.confirm") || can("plan.edit")) && <Button size="sm" variant="outline" onClick={() => { run(saveRow, "constructionPlans", { ...task, quality: null }); toast.success("Đã hủy kết quả đánh giá"); }}>Đánh giá lại</Button>}
            </div>
          ) : task.actualQty <= 0 ? (
            <p className="text-slate-400">Công việc chưa có khối lượng thực hiện để đánh giá.</p>
          ) : can("log.confirm") || can("plan.edit") ? (
            <div className="space-y-2.5">
              <div className="flex gap-2">
                {(["dat", "khong_dat"] as const).map((r) => <button key={r} onClick={() => setResult(r)} className={`flex-1 rounded-md border px-3 py-2 text-[13px] font-medium ${result === r ? (r === "dat" ? "border-success bg-success-soft text-success-fg" : "border-rose-400 bg-rose-50 text-rose-700") : "text-slate-600 hover:bg-slate-50"}`}>{r === "dat" ? "Đạt" : "Không đạt"}</button>)}
              </div>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nhận xét: kết quả thí nghiệm, kiểm tra hiện trường..." />
              <Button size="sm" onClick={() => { run(saveRow, "constructionPlans", { ...task, quality: { result, byId: user!.id, at: DEMO_TODAY, note: note || (result === "dat" ? "Đạt yêu cầu kỹ thuật" : "Không đạt, yêu cầu khắc phục") } }); toast.success("Đã ghi nhận đánh giá chất lượng"); setNote(""); }}>Ghi nhận đánh giá</Button>
            </div>
          ) : <p className="text-slate-400">Chưa đánh giá. Chỉ huy trưởng / Phòng KHKT thực hiện đánh giá, nghiệm thu nội bộ.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
