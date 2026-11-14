import { CheckCircle2, Pencil, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserCell } from "@/components/common/UserAvatar";
import { SitePhoto } from "@/components/common/SitePhoto";
import { EmptyState } from "@/components/common/EmptyState";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { confirmLog } from "@/services/actions";
import { taskActualPct, taskDuration, taskHealth, taskPlannedPct, TASK_HEALTH_LABEL } from "@/services/selectors";
import { TASK_STATUS } from "@/utils/constants";
import { fmtDate, fmtNumber, fmtPct, fmtVnd } from "@/utils/format";

export function TaskDrawer({ taskId, onClose, onUpdate, onEdit }: { taskId: string | null; onClose: () => void; onUpdate: (id: string) => void; onEdit: (id: string) => void }) {
  const { db, run } = useDb();
  const { can, user } = useAuth();
  const t = db.constructionPlans.find((x) => x.id === taskId);
  const item = db.constructionItems.find((i) => i.id === t?.itemId);
  const logs = db.constructionLogs.filter((l) => l.taskId === taskId).sort((a, b) => b.date.localeCompare(a.date));
  const txs = db.stockTransactions.filter((x) => x.taskId === taskId && x.type === "xuat");
  const a = t ? taskActualPct(t) : 0;
  const p = t ? taskPlannedPct(t) : 0;
  const h = t ? taskHealth({ actual: a, planned: p, plannedEnd: t.plannedEnd, plannedStart: t.plannedStart }) : "dung";

  return (
    <Sheet open={!!t} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl">
        {t && (
          <>
            <SheetHeader>
              <div className="text-[11px] text-slate-500">{item?.code} {item?.name}</div>
              <SheetTitle><span className="text-slate-400">{t.code}</span> {t.name}</SheetTitle>
              <div className="flex flex-wrap gap-1.5"><StatusBadge map={TASK_STATUS} value={t.status} /><Badge tone={TASK_HEALTH_LABEL[h].tone}>{TASK_HEALTH_LABEL[h].label}</Badge></div>
            </SheetHeader>
            <SheetBody>
              <div className="rounded-lg border bg-slate-50/60 p-4">
                <div className="mb-1.5 flex items-end justify-between">
                  <div><div className="text-[11px] text-slate-500">Tiến độ thực tế</div><div className="text-2xl font-bold">{fmtPct(a)}</div></div>
                  <div className="text-right text-xs text-slate-500">Kế hoạch đến hôm nay: <b className="text-slate-700">{fmtPct(p)}</b></div>
                </div>
                <Progress value={a} marker={p} tone={h === "qua_han" ? "danger" : h === "cham" ? "warning" : "success"} />
                <div className="mt-3 grid grid-cols-3 gap-3 text-[12.5px]">
                  <div><div className="text-slate-500">KL kế hoạch</div><div className="font-semibold">{fmtNumber(t.contractQty)} {t.unit}</div></div>
                  <div><div className="text-slate-500">KL thực hiện</div><div className="font-semibold text-success-fg">{fmtNumber(t.actualQty)} {t.unit}</div></div>
                  <div><div className="text-slate-500">Còn lại</div><div className="font-semibold">{fmtNumber(Math.max(0, t.contractQty - t.actualQty))} {t.unit}</div></div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-[150px_1fr] gap-y-2 text-[13px]">
                <dt className="text-slate-500">Người phụ trách</dt><dd><UserCell userId={t.assigneeId} sub="" /></dd>
                <dt className="text-slate-500">Tổ đội</dt><dd>{t.team || "—"}</dd>
                <dt className="text-slate-500">Kế hoạch</dt><dd>{fmtDate(t.plannedStart)} – {fmtDate(t.plannedEnd)} ({taskDuration(t)} ngày)</dd>
                <dt className="text-slate-500">Thực tế</dt><dd>{fmtDate(t.actualStart)} – {t.actualEnd ? fmtDate(t.actualEnd) : "đang thực hiện"}</dd>
                <dt className="text-slate-500">Đơn giá / Giá trị</dt><dd>{fmtVnd(t.unitPrice)} đ / {t.unit} · <b>{fmtVnd(t.contractQty * t.unitPrice)} đ</b></dd>
                <dt className="text-slate-500">Ghi chú gần nhất</dt><dd className="text-slate-700">{t.note || "—"}</dd>
              </dl>
              <Tabs defaultValue="logs" className="mt-5">
                <TabsList>
                  <TabsTrigger value="logs">Nhật ký thi công ({logs.length})</TabsTrigger>
                  <TabsTrigger value="photos">Hình ảnh ({logs.reduce((s, l) => s + l.photos.length, 0)})</TabsTrigger>
                  <TabsTrigger value="materials">Vật tư đã xuất ({txs.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="logs" className="space-y-2">
                  {logs.length === 0 && <EmptyState title="Chưa có nhật ký" description="Tổ trưởng cập nhật khối lượng thực hiện để ghi nhận nhật ký." className="py-8" />}
                  {logs.map((l) => (
                    <div key={l.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[12.5px] font-semibold">{fmtDate(l.date)} · <span className="text-success-fg">+{fmtNumber(l.qty)} {t.unit}</span></div>
                        {l.status === "da_xac_nhan" ? <Badge tone="success">CHT đã xác nhận</Badge> : l.status === "nhap" ? <Badge>Nháp</Badge> : can("log.confirm") ? (
                          <Button size="xs" variant="success" onClick={() => { run(confirmLog, l.id, user!.id); toast.success("Đã xác nhận kết quả"); }}><CheckCircle2 /> Xác nhận</Button>
                        ) : <Badge tone="warning">Chờ xác nhận</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">{l.content}</div>
                      <div className="mt-1 text-[11px] text-slate-400">{db.users.find((u) => u.id === l.reporterId)?.name} · {l.weather} · {l.labor.reduce((s, x) => s + x.people, 0)} nhân công</div>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="photos">
                  <div className="grid grid-cols-3 gap-2">{logs.flatMap((l) => l.photos.map((p, i) => <SitePhoto key={l.id + i} kind={p} date={fmtDate(l.date)} />))}</div>
                  {logs.every((l) => !l.photos.length) && <EmptyState title="Chưa có hình ảnh hiện trường" className="py-8" />}
                </TabsContent>
                <TabsContent value="materials" className="space-y-1.5">
                  {txs.length === 0 && <EmptyState title="Chưa xuất vật tư cho công việc này" className="py-8" />}
                  {txs.map((x) => {
                    const m = db.materials.find((mm) => mm.id === x.materialId);
                    return <div key={x.id} className="flex justify-between rounded-md border px-3 py-2 text-[12.5px]"><span>{x.code} · {m?.name}</span><span className="font-semibold">{fmtNumber(x.qty)} {m?.unit} · {fmtDate(x.date)}</span></div>;
                  })}
                </TabsContent>
              </Tabs>
            </SheetBody>
            <SheetFooter>
              {can("plan.edit") && <Button variant="outline" onClick={() => onEdit(t.id)}><Pencil /> Sửa / giao lại</Button>}
              {can("progress.update") && !t.isGroup && <Button variant="success" onClick={() => onUpdate(t.id)}><TrendingUp /> Cập nhật khối lượng</Button>}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
