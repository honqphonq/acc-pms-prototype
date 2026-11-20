import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { FormField } from "@/components/common/FormField";
import { EmptyState } from "@/components/common/EmptyState";
import { UserCell } from "@/components/common/UserAvatar";
import { FileUploader } from "@/components/common/Attachments";
import { completeDirective } from "@/services/actions";
import { DEMO_TODAY, diffDays } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Attachment, Directive } from "@/types";

export type DirState = "dang_thuc_hien" | "qua_han" | "hoan_thanh";
export const dirState = (d: Directive): DirState => (d.status === "hoan_thanh" ? "hoan_thanh" : d.dueDate < DEMO_TODAY ? "qua_han" : "dang_thuc_hien");
export const DIR_STATE: Record<DirState, { label: string; tone: "info" | "danger" | "success"; color: string }> = {
  dang_thuc_hien: { label: "Đang thực hiện", tone: "info", color: "#2563EB" },
  qua_han: { label: "Quá hạn", tone: "danger", color: "#E11D48" },
  hoan_thanh: { label: "Đã hoàn thành", tone: "success", color: "#16A34A" },
};

/** Bảng việc chỉ đạo – dùng ở Trang chủ và trang Việc chỉ đạo */
export function DirectiveTable({ rows, onComplete, showAssigner }: { rows: Directive[]; onComplete?: (d: Directive) => void; showAssigner?: boolean }) {
  if (!rows.length) return <EmptyState title="Không có việc nào" className="py-8" />;
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Công việc</TableHead><TableHead>Liên quan</TableHead>{showAssigner && <TableHead>Người giao</TableHead>}<TableHead>Người thực hiện</TableHead><TableHead>Hạn</TableHead><TableHead>Trạng thái</TableHead>{onComplete && <TableHead />}</TableRow></TableHeader>
      <TableBody>
        {rows.map((d) => {
          const st = dirState(d);
          const late = st === "qua_han" ? diffDays(d.dueDate, DEMO_TODAY) : 0;
          return (
            <TableRow key={d.id}>
              <TableCell className="min-w-[260px] max-w-[420px]">
                <div className="font-semibold text-slate-900">{d.title}</div>
                <div className="text-[12px] text-slate-500">{d.code} · giao ngày {fmtDate(d.createdAt)}</div>
                {d.content && <div className="mt-0.5 line-clamp-2 text-[12.5px] text-slate-600">{d.content}</div>}
                {d.result && <div className="mt-1 rounded bg-success-soft/60 px-2 py-1 text-[12.5px] text-success-fg"><b>Kết quả:</b> {d.result}{d.files?.length ? <span className="ml-1 inline-flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{d.files.length}</span> : null}</div>}
              </TableCell>
              <TableCell className="whitespace-nowrap"><Link to={d.link} className="text-[13px] text-primary hover:underline">{d.refLabel}</Link></TableCell>
              {showAssigner && <TableCell className="whitespace-nowrap"><UserCell userId={d.assignedBy} /></TableCell>}
              <TableCell className="whitespace-nowrap"><UserCell userId={d.assigneeId} /></TableCell>
              <TableCell className="whitespace-nowrap"><div className={cn(st === "qua_han" && "font-semibold text-rose-600")}>{fmtDate(d.dueDate)}</div>{late > 0 && <div className="text-[11.5px] text-rose-600">trễ {late} ngày</div>}{d.completedAt && <div className="text-[11.5px] text-slate-500">xong {fmtDate(d.completedAt)}</div>}</TableCell>
              <TableCell><Badge tone={DIR_STATE[st].tone}>{DIR_STATE[st].label}</Badge></TableCell>
              {onComplete && <TableCell className="text-right">{d.status !== "hoan_thanh" && <Button size="xs" onClick={() => onComplete(d)}><CheckCircle2 /> Báo cáo hoàn thành</Button>}</TableCell>}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Popup người nhận báo cáo hoàn thành – việc tự đóng */
export function CompleteDialog({ d, onClose }: { d: Directive | null; onClose: () => void }) {
  const { run } = useDb();
  const [result, setResult] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [last, setLast] = useState<Directive | null>(null);
  if (d && d !== last) { setLast(d); setResult(""); setFiles([]); }
  if (!d) return null;
  const save = () => {
    if (!result.trim()) return toast.error("Nhập kết quả thực hiện");
    run(completeDirective, d.id, result.trim(), files);
    toast.success("Đã báo cáo hoàn thành", { description: d.title });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Báo cáo hoàn thành</DialogTitle><DialogDescription>{d.code} · {d.title}</DialogDescription></DialogHeader>
        <DialogBody className="space-y-3">
          <FormField label="Kết quả thực hiện" required><Textarea rows={4} autoFocus value={result} onChange={(e) => setResult(e.target.value)} placeholder="Đã làm gì, kết quả ra sao…" /></FormField>
          <FormField label="Đính kèm (biên bản, hình ảnh…)"><FileUploader value={files} onChange={setFiles} /></FormField>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={onClose}>Hủy</Button><Button onClick={save}><CheckCircle2 /> Hoàn thành</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DirectivesPage() {
  const { db } = useDb();
  const { user } = useAuth();
  const [scope, setScope] = useState<"cua_toi" | "da_giao" | "tat_ca">("cua_toi");
  const [state, setState] = useState<DirState | "">("");
  const [done, setDone] = useState<Directive | null>(null);
  const base = db.directives.filter((d) => scope === "tat_ca" || (scope === "cua_toi" ? d.assigneeId === user?.id : d.assignedBy === user?.id));
  const rows = base.filter((d) => !state || dirState(d) === state).sort((a, b) => Number(a.status === "hoan_thanh") - Number(b.status === "hoan_thanh") || a.dueDate.localeCompare(b.dueDate));
  const canComplete = (d: Directive) => d.assigneeId === user?.id || !!user?.isDemoAccount;
  const SCOPES = [["cua_toi", "Việc giao cho tôi"], ["da_giao", "Việc tôi đã giao"], ["tat_ca", "Tất cả"]] as const;
  return (
    <div>
      <CompleteDialog d={done} onClose={() => setDone(null)} />
      <PageHeader title="Việc chỉ đạo" description="Việc Ban lãnh đạo giao trực tiếp từ màn hình báo cáo. Người thực hiện bấm “Báo cáo hoàn thành” để đóng việc." />
      <Card>
        <CardHeader className="flex-wrap gap-2">
          <div className="flex rounded-lg border bg-slate-50 p-0.5">
            {SCOPES.map(([k, l]) => <button key={k} onClick={() => setScope(k)} className={cn("rounded-md px-3 py-1.5 text-[13px]", scope === k ? "bg-white font-semibold text-primary shadow-sm" : "text-slate-600")}>{l} ({db.directives.filter((d) => k === "tat_ca" || (k === "cua_toi" ? d.assigneeId === user?.id : d.assignedBy === user?.id)).filter((d) => d.status !== "hoan_thanh").length})</button>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setState("")} className={cn("rounded-full border px-3 py-1 text-[12.5px]", !state && "border-primary bg-primary-soft text-primary")}>Tất cả ({base.length})</button>
            {(Object.keys(DIR_STATE) as DirState[]).map((k) => <button key={k} onClick={() => setState(k)} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px]", state === k && "border-primary bg-primary-soft text-primary")}><span className="h-2 w-2 rounded-full" style={{ background: DIR_STATE[k].color }} />{DIR_STATE[k].label} ({base.filter((d) => dirState(d) === k).length})</button>)}
          </div>
        </CardHeader>
        {rows.length > 0 && <CardTitle className="sr-only">Danh sách</CardTitle>}
        <DirectiveTable rows={rows} showAssigner onComplete={(d) => (canComplete(d) ? setDone(d) : toast.error("Chỉ người thực hiện mới báo cáo hoàn thành"))} />
      </Card>
    </div>
  );
}
