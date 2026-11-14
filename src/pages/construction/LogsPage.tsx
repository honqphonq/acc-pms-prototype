import { useState } from "react";
import { CheckCircle2, NotebookPen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { UserCell } from "@/components/common/UserAvatar";
import { SitePhoto } from "@/components/common/SitePhoto";
import { FormField } from "@/components/common/FormField";
import { KpiCard } from "@/components/common/KpiCard";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { TaskProgressDialog } from "./TaskProgressDialog";
import { confirmLog, deleteLog } from "@/services/actions";
import { taskActualPct } from "@/services/selectors";
import { fmtDate, fmtNumber } from "@/utils/format";
import { DEMO_TODAY, addDays } from "@/utils/date";
import type { ConstructionLog } from "@/types";

const LOG_STATUS = { nhap: { label: "Nháp", tone: "neutral" }, da_gui: { label: "Chờ CHT xác nhận", tone: "warning" }, da_xac_nhan: { label: "CHT đã xác nhận", tone: "success" } } as const;

export default function LogsPage() {
  const { db, run } = useDb();
  const { can, user } = useAuth();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [projectId, setProjectId] = useQueryParam("project");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [detail, setDetail] = useState<ConstructionLog | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [pickProject, setPickProject] = useState("p01");
  const [pickTask, setPickTask] = useState("");
  const [progressId, setProgressId] = useState<string | null>(null);

  const rows = db.constructionLogs
    .filter((l) => (!projectId || l.projectId === projectId) && (!status || l.status === status) && (!period || l.date >= addDays(DEMO_TODAY, -Number(period))))
    .sort((a, b) => b.date.localeCompare(a.date));
  const taskOf = (id: string) => db.constructionPlans.find((t) => t.id === id);
  const pending = rows.filter((l) => l.status === "da_gui");
  const week = rows.filter((l) => l.date >= addDays(DEMO_TODAY, -7));

  const cols: Column<ConstructionLog>[] = [
    { key: "date", header: "Ngày", sortValue: (l) => l.date, cell: (l) => <span className="whitespace-nowrap">{fmtDate(l.date)}</span> },
    { key: "task", header: "Công việc", sortValue: (l) => taskOf(l.taskId)?.code, cell: (l) => { const t = taskOf(l.taskId); return <div className="min-w-[220px]"><div className="font-medium text-slate-800">{t?.code} {t?.name}</div><div className="text-[11px] text-slate-400">{db.projects.find((p) => p.id === l.projectId)?.shortName}</div></div>; } },
    { key: "qty", header: "KL thực hiện", align: "right", sortValue: (l) => l.qty, cell: (l) => <span className="font-semibold text-success-fg">+{fmtNumber(l.qty)} <span className="font-normal text-slate-400">{taskOf(l.taskId)?.unit}</span></span> },
    { key: "content", header: "Nội dung", cell: (l) => <div className="line-clamp-2 max-w-xs text-xs text-slate-600">{l.content}</div> },
    { key: "rep", header: "Người báo cáo", cell: (l) => <UserCell userId={l.reporterId} /> },
    { key: "labor", header: "Nhân công", align: "right", cell: (l) => l.labor.reduce((s, x) => s + x.people, 0) },
    { key: "photo", header: "Ảnh", cell: (l) => <div className="flex gap-1">{l.photos.slice(0, 2).map((p, i) => <SitePhoto key={i} kind={p} caption={false} className="h-8 w-10" />)}</div> },
    { key: "st", header: "Trạng thái", sortValue: (l) => l.status, cell: (l) => <Badge tone={LOG_STATUS[l.status].tone} dot>{LOG_STATUS[l.status].label}</Badge> },
    {
      key: "act", header: "", cell: (l) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {l.status === "da_gui" && can("log.confirm") && <Button size="xs" variant="success" onClick={() => { run(confirmLog, l.id, user!.id); toast.success("Đã xác nhận kết quả thi công"); }}><CheckCircle2 /> Xác nhận</Button>}
          {can("progress.update") && <Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (await confirm({ title: "Xóa nhật ký thi công?", description: "Khối lượng của nhật ký sẽ được trừ khỏi lũy kế công việc và tiến độ dự án.", destructive: true, confirmText: "Xóa" })) { run(deleteLog, l.id); toast.success("Đã xóa nhật ký, tiến độ được tính lại"); } }}><Trash2 /></Button>}
        </div>
      ),
    },
  ];
  const openTasks = db.constructionPlans.filter((t) => t.projectId === pickProject && !t.isGroup && taskActualPct(t) < 1);

  return (
    <div>
      <PageHeader title="Nhật ký thi công" description="Sở cứ đánh giá kết quả công việc tại các tổ đội: khối lượng, nhân công, thời tiết, hình ảnh hiện trường – CHT xác nhận kết quả." actions={can("progress.update") && <Button onClick={() => { setPickProject(projectId || "p01"); setPickTask(""); setPickOpen(true); }}><NotebookPen /> Ghi nhật ký / cập nhật khối lượng</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Tổng số nhật ký" value={rows.length} unit="bản ghi" tone="info" />
        <KpiCard label="Trong 7 ngày qua" value={week.length} unit="bản ghi" tone="success" />
        <KpiCard label="Chờ CHT xác nhận" value={pending.length} unit="bản ghi" tone="warning" />
        <KpiCard label="Hình ảnh hiện trường" value={rows.reduce((s, l) => s + l.photos.length, 0)} unit="ảnh" tone="navy" />
      </div>
      <Card>
        <DataTable
          columns={cols} rows={rows} rowKey={(l) => l.id} loading={loading} onRowClick={setDetail} resetKey={projectId + status + period}
          searchText={(l) => { const t = taskOf(l.taskId); return `${t?.code} ${t?.name} ${l.content} ${db.users.find((u) => u.id === l.reporterId)?.name}`; }}
          searchPlaceholder="Tìm công việc, nội dung, người báo cáo..."
          toolbar={<>
            <FilterSelect value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={db.projects.map((p) => ({ value: p.id, label: p.shortName }))} />
            <FilterSelect value={status} onChange={setStatus} allLabel="Tất cả trạng thái" options={Object.entries(LOG_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} />
            <FilterSelect value={period} onChange={setPeriod} allLabel="Toàn thời gian" options={[{ value: "7", label: "7 ngày qua" }, { value: "30", label: "30 ngày qua" }, { value: "90", label: "90 ngày qua" }]} />
          </>}
          emptyTitle="Chưa có nhật ký thi công"
        />
      </Card>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent>
          {detail && (() => { const t = taskOf(detail.taskId); const live = db.constructionLogs.find((l) => l.id === detail.id) ?? detail; return (
            <>
              <SheetHeader><div className="text-[11px] text-slate-500">Nhật ký ngày {fmtDate(live.date)} · {live.shift}</div><SheetTitle>{t?.code} {t?.name}</SheetTitle><Badge tone={LOG_STATUS[live.status].tone} dot className="w-fit">{LOG_STATUS[live.status].label}</Badge></SheetHeader>
              <SheetBody className="space-y-4">
                <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-[13px]">
                  <div><div className="text-[11px] text-slate-500">Khối lượng</div><b className="text-success-fg">+{fmtNumber(live.qty)} {t?.unit}</b></div>
                  <div><div className="text-[11px] text-slate-500">Thời tiết</div>{live.weather}</div>
                  <div><div className="text-[11px] text-slate-500">Lũy kế công việc</div>{fmtNumber(t?.actualQty)} / {fmtNumber(t?.contractQty)}</div>
                </div>
                <div><div className="mb-1 text-xs font-semibold text-slate-500">NỘI DUNG THỰC HIỆN</div><p className="text-[13px] text-slate-700">{live.content}</p></div>
                <div><div className="mb-1 text-xs font-semibold text-slate-500">NHÂN CÔNG</div>
                  <table className="w-full text-[13px]"><tbody>{live.labor.map((x, i) => <tr key={i} className="border-b"><td className="py-1.5">{x.role}</td><td>{x.grade}</td><td className="text-right">{x.people} người</td></tr>)}</tbody></table>
                </div>
                <div><div className="mb-2 text-xs font-semibold text-slate-500">HÌNH ẢNH HIỆN TRƯỜNG</div><div className="grid grid-cols-2 gap-2">{live.photos.map((p, i) => <SitePhoto key={i} kind={p} date={fmtDate(live.date)} />)}</div></div>
                <div className="text-xs text-slate-500">Người báo cáo: <b>{db.users.find((u) => u.id === live.reporterId)?.name}</b>{live.confirmedById && <> · Xác nhận: <b>{db.users.find((u) => u.id === live.confirmedById)?.name}</b></>}</div>
              </SheetBody>
              {live.status === "da_gui" && can("log.confirm") && <SheetFooter><Button variant="success" onClick={() => { run(confirmLog, live.id, user!.id); toast.success("Đã xác nhận"); }}><CheckCircle2 /> Xác nhận kết quả</Button></SheetFooter>}
            </>
          ); })()}
        </SheetContent>
      </Sheet>

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chọn công việc cần cập nhật</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <FormField label="Dự án"><Select value={pickProject} onChange={(e) => { setPickProject(e.target.value); setPickTask(""); }} options={db.projects.filter((p) => p.status === "dang_thi_cong").map((p) => ({ value: p.id, label: p.shortName }))} /></FormField>
            <FormField label="Công việc (chưa hoàn thành)" required><Select value={pickTask} onChange={(e) => setPickTask(e.target.value)} placeholder="— Chọn công việc —" options={openTasks.map((t) => ({ value: t.id, label: `${t.code} ${t.name} (${Math.round(taskActualPct(t) * 100)}%)` }))} /></FormField>
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setPickOpen(false)}>Hủy</Button><Button disabled={!pickTask} onClick={() => { setPickOpen(false); setProgressId(pickTask); }}>Tiếp tục</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <TaskProgressDialog taskId={progressId} open={!!progressId} onOpenChange={(o) => !o && setProgressId(null)} />
    </div>
  );
}
