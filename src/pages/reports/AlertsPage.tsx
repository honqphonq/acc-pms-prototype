import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserCell } from "@/components/common/UserAvatar";
import { FormField } from "@/components/common/FormField";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { getAlerts, ALERT_KIND_LABEL, type Alert } from "@/services/selectors";
import { deleteIssue, saveIssue } from "@/services/actions";
import { ISSUE_CATEGORY, ISSUE_SEVERITY, ISSUE_STATUS } from "@/utils/constants";
import { DEMO_TODAY, addDays } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Issue } from "@/types";

const SEV = { danger: { label: "Nghiêm trọng", tone: "danger" }, warning: { label: "Cảnh báo", tone: "warning" }, info: { label: "Lưu ý", tone: "info" } } as const;
type IssueForm = Omit<Issue, "id" | "code">;

export default function AlertsPage() {
  const { db, run } = useDb();
  const { user } = useAuth();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [tab, setTab] = useQueryParam("tab", "alerts");
  const [projectId, setProjectId] = useQueryParam("project");
  const [kind, setKind] = useState("");
  const [sev, setSev] = useState("");
  const [istatus, setIstatus] = useState("");
  const [edit, setEdit] = useState<{ id?: string; f: IssueForm } | null>(null);

  const alerts = getAlerts(db).filter((a) => (!projectId || a.projectId === projectId) && (!kind || a.kind === kind) && (!sev || a.severity === sev));
  const issues = db.issues.filter((i) => (!projectId || i.projectId === projectId) && (!istatus || i.status === istatus)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const allAlerts = getAlerts(db);
  const newIssue = (): IssueForm => ({ projectId: projectId || "p01", title: "", category: "ky_thuat", severity: "trung_binh", status: "moi", reportedById: user!.id, assigneeId: db.projects.find((p) => p.id === (projectId || "p01"))?.commanderId ?? "u04", createdAt: DEMO_TODAY, dueDate: addDays(DEMO_TODAY, 7), description: "" });

  const aCols: Column<Alert>[] = [
    { key: "s", header: "Mức độ", sortValue: (a) => ({ danger: 0, warning: 1, info: 2 })[a.severity], cell: (a) => <Badge tone={SEV[a.severity].tone} dot>{SEV[a.severity].label}</Badge> },
    { key: "k", header: "Loại", sortValue: (a) => a.kind, cell: (a) => <Badge tone="outline">{ALERT_KIND_LABEL[a.kind]}</Badge> },
    { key: "t", header: "Cảnh báo", cell: (a) => <div className="min-w-[300px]"><div className="font-medium text-slate-800">{a.title}</div><div className="text-[11.5px] text-slate-500">{a.detail}</div></div> },
    { key: "p", header: "Dự án", sortValue: (a) => a.projectId, cell: (a) => <span className="whitespace-nowrap text-xs">{db.projects.find((p) => p.id === a.projectId)?.shortName ?? "—"}</span> },
    { key: "go", header: "", cell: (a) => <Button asChild size="xs" variant="ghost"><Link to={a.link}>Xử lý <ChevronRight /></Link></Button> },
  ];
  const iCols: Column<Issue>[] = [
    { key: "t", header: "Vấn đề", sortValue: (i) => i.createdAt, cell: (i) => <div className="min-w-[280px]"><div className="font-medium text-slate-800">{i.title}</div><div className="text-[11px] text-slate-400">{i.code} · {ISSUE_CATEGORY[i.category]} · {db.projects.find((p) => p.id === i.projectId)?.shortName}</div></div> },
    { key: "sv", header: "Mức độ", sortValue: (i) => i.severity, cell: (i) => <StatusBadge map={ISSUE_SEVERITY} value={i.severity} /> },
    { key: "as", header: "Phụ trách", cell: (i) => <UserCell userId={i.assigneeId} /> },
    { key: "d", header: "Hạn xử lý", sortValue: (i) => i.dueDate, cell: (i) => <span className={cn("whitespace-nowrap text-xs", i.status !== "da_xu_ly" && i.dueDate < DEMO_TODAY && "font-semibold text-rose-600")}>{fmtDate(i.dueDate)}</span> },
    {
      key: "st", header: "Trạng thái", sortValue: (i) => i.status, cell: (i) => (
        <select value={i.status} onClick={(e) => e.stopPropagation()} onChange={(e) => { run(saveIssue, { ...i, status: e.target.value as Issue["status"] }, i.id); toast.success(`Đã chuyển trạng thái: ${ISSUE_STATUS[e.target.value as Issue["status"]].label}`); }} className={cn("h-7 rounded-full border px-2 text-[11px] font-medium", i.status === "moi" ? "border-rose-200 bg-rose-50 text-rose-700" : i.status === "dang_xu_ly" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-green-200 bg-green-50 text-green-700")}>
          {Object.entries(ISSUE_STATUS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
        </select>
      ),
    },
    { key: "a", header: "", cell: (i) => <div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" onClick={() => setEdit({ id: i.id, f: { ...i } })}><Pencil /></Button><Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (await confirm({ title: "Xóa vấn đề?", destructive: true, confirmText: "Xóa" })) { run(deleteIssue, i.id); toast.success("Đã xóa"); } }}><Trash2 /></Button></div> },
  ];
  const f = edit?.f;
  const setF = (c: Partial<IssueForm>) => setEdit((e) => (e ? { ...e, f: { ...e.f, ...c } } : e));

  return (
    <div>
      <PageHeader title="Cảnh báo & vấn đề phát sinh" description="Cảnh báo được hệ thống tự động phát hiện từ dữ liệu tiến độ, kho, thiết bị, thanh toán; vấn đề phát sinh do công trường báo cáo." actions={<><FilterSelect value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={db.projects.map((p) => ({ value: p.id, label: p.shortName }))} /><Button onClick={() => { setTab("issues"); setEdit({ f: newIssue() }); }}><Plus /> Báo cáo vấn đề</Button></>} />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {(["tien_do", "vat_tu", "thiet_bi", "thanh_toan"] as const).map((k) => (
          <KpiCard key={k} label={`Cảnh báo ${ALERT_KIND_LABEL[k].toLowerCase()}`} value={allAlerts.filter((a) => a.kind === k && (!projectId || a.projectId === projectId)).length} tone={k === "tien_do" ? "danger" : k === "vat_tu" ? "warning" : k === "thiet_bi" ? "info" : "navy"} onClick={() => { setTab("alerts"); setKind(k); }} sub={`${allAlerts.filter((a) => a.kind === k && a.severity === "danger" && (!projectId || a.projectId === projectId)).length} nghiêm trọng`} />
        ))}
        <KpiCard label="Vấn đề chưa xử lý" value={db.issues.filter((i) => i.status !== "da_xu_ly" && (!projectId || i.projectId === projectId)).length} tone="primary" onClick={() => setTab("issues")} sub={`${db.issues.filter((i) => i.status !== "da_xu_ly" && i.dueDate < DEMO_TODAY).length} quá hạn xử lý`} />
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-t-xl bg-white px-2">
          <TabsTrigger value="alerts">Cảnh báo hệ thống ({alerts.length})</TabsTrigger>
          <TabsTrigger value="issues">Vấn đề phát sinh ({issues.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="alerts" className="mt-0">
          <Card className="rounded-t-none">
            <DataTable columns={aCols} rows={alerts} rowKey={(a) => a.id} loading={loading} resetKey={projectId + kind + sev} pageSize={15} searchText={(a) => `${a.title} ${a.detail}`} searchPlaceholder="Tìm cảnh báo..."
              toolbar={<>
                <FilterSelect value={kind} onChange={setKind} allLabel="Tất cả loại" options={Object.entries(ALERT_KIND_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
                <FilterSelect value={sev} onChange={setSev} allLabel="Mọi mức độ" options={Object.entries(SEV).map(([v, l]) => ({ value: v, label: l.label }))} />
              </>}
              emptyTitle="Không có cảnh báo" emptyDescription="Các chỉ số đang trong ngưỡng an toàn." />
          </Card>
        </TabsContent>
        <TabsContent value="issues" className="mt-0">
          <Card className="rounded-t-none">
            <DataTable columns={iCols} rows={issues} rowKey={(i) => i.id} loading={loading} resetKey={projectId + istatus} searchText={(i) => `${i.code} ${i.title}`}
              toolbar={<FilterSelect value={istatus} onChange={setIstatus} allLabel="Tất cả trạng thái" options={Object.entries(ISSUE_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} />}
              emptyTitle="Chưa có vấn đề phát sinh" emptyAction={<Button size="sm" onClick={() => setEdit({ f: newIssue() })}><Plus /> Báo cáo vấn đề</Button>} />
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Cập nhật vấn đề" : "Báo cáo vấn đề phát sinh"}</DialogTitle></DialogHeader>
          {f && (
            <DialogBody className="grid gap-3 sm:grid-cols-2">
              <FormField label="Dự án" className="sm:col-span-2"><Select value={f.projectId} onChange={(e) => setF({ projectId: e.target.value })} options={db.projects.map((p) => ({ value: p.id, label: p.name }))} /></FormField>
              <FormField label="Tiêu đề" required className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ title: e.target.value })} /></FormField>
              <FormField label="Phân loại"><Select value={f.category} onChange={(e) => setF({ category: e.target.value as Issue["category"] })} options={Object.entries(ISSUE_CATEGORY).map(([v, l]) => ({ value: v, label: l }))} /></FormField>
              <FormField label="Mức độ"><Select value={f.severity} onChange={(e) => setF({ severity: e.target.value as Issue["severity"] })} options={Object.entries(ISSUE_SEVERITY).map(([v, l]) => ({ value: v, label: l.label }))} /></FormField>
              <FormField label="Người phụ trách xử lý"><Select value={f.assigneeId} onChange={(e) => setF({ assigneeId: e.target.value })} options={db.users.filter((u) => !u.isOperator).map((u) => ({ value: u.id, label: u.name }))} /></FormField>
              <FormField label="Hạn xử lý"><Input type="date" value={f.dueDate} onChange={(e) => setF({ dueDate: e.target.value })} /></FormField>
              <FormField label="Trạng thái"><Select value={f.status} onChange={(e) => setF({ status: e.target.value as Issue["status"] })} options={Object.entries(ISSUE_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} /></FormField>
              <FormField label="Mô tả" className="sm:col-span-2"><Textarea value={f.description} onChange={(e) => setF({ description: e.target.value })} /></FormField>
            </DialogBody>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={() => { if (!f?.title.trim()) return toast.error("Nhập tiêu đề"); run(saveIssue, f, edit?.id); toast.success(edit?.id ? "Đã cập nhật vấn đề" : "Đã ghi nhận vấn đề phát sinh"); setEdit(null); }}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
