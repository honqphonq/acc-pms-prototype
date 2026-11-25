import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Receipt, Send, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Stepper, Timeline } from "@/components/common/Workflow";
import { EmptyState } from "@/components/common/EmptyState";
import { FormField } from "@/components/common/FormField";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { acceptanceNextAction, advanceAcceptance, createPayment, deleteAcceptance, returnAcceptance, updateAcceptance } from "@/services/actions";
import { acceptanceValue } from "@/services/selectors";
import { ACCEPTANCE_STATUS } from "@/utils/constants";
import { DEMO_TODAY, addDays } from "@/utils/date";
import { fmtDate, fmtNumber, fmtVnd } from "@/utils/format";

const STEPS = ["Lập hồ sơ", "TVGS kiểm tra, xác nhận", "Chủ đầu tư ký biên bản", "Lập hồ sơ thanh toán"];
const stepOf = { nhap: 0, tra_lai: 0, cho_tvgs: 1, cho_cdt: 2, da_nghiem_thu: 3 } as const;

export default function AcceptanceDetailPage() {
  const { id } = useParams();
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [returnOpen, setReturnOpen] = useState(false);
  const [note, setNote] = useState("");
  const a = db.acceptanceRecords.find((x) => x.id === id);
  if (!a) return <Card><EmptyState title="Không tìm thấy hồ sơ nghiệm thu" action={<Button onClick={() => navigate("/acceptance")}>Về danh sách</Button>} /></Card>;
  const value = acceptanceValue(db, a);
  const exec = a.lines.reduce((s, l) => s + l.executedQty * (db.constructionPlans.find((t) => t.id === l.taskId)?.unitPrice ?? 0), 0);
  const next = acceptanceNextAction(a.status);
  const payment = db.paymentRecords.find((p) => p.acceptanceIds.includes(a.id));
  const editable = (a.status === "nhap" || a.status === "tra_lai") && can("acceptance.edit");
  const canAdvance = a.status === "nhap" || a.status === "tra_lai" ? can("acceptance.edit") : can("acceptance.approve");
  const step = payment ? 4 : stepOf[a.status];

  const makePayment = () => {
    const nextDb = run(createPayment, { projectId: a.projectId, acceptanceIds: [a.id], title: `Thanh toán ${a.phase.toLowerCase()} – ${a.title.replace("Nghiệm thu ", "")}`, amount: Math.round(value), retention: Math.round(value * 0.05), dueDate: addDays(DEMO_TODAY, 45) }, user!.id);
    toast.success("Đã lập hồ sơ thanh toán", { description: nextDb.paymentRecords[0].code });
    navigate(`/finance/payments?id=${nextDb.paymentRecords[0].id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/acceptance" className="mb-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> Hồ sơ nghiệm thu</Link>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold">{a.title}</h1><StatusBadge map={ACCEPTANCE_STATUS} value={a.status} /></div>
          <div className="mt-1 text-[13px] text-slate-500">{a.code} · {a.phase} · {db.projects.find((p) => p.id === a.projectId)?.name}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {next && canAdvance && <Button variant={a.status === "cho_cdt" ? "success" : "default"} onClick={async () => { if (await confirm({ title: `${next.action}?`, description: `Giá trị nghiệm thu: ${fmtVnd(value)} đ` })) { run(advanceAcceptance, a.id, user!.id); toast.success(`${next.action} – trạng thái: ${ACCEPTANCE_STATUS[next.next].label}`); } }}><Send /> {next.action}</Button>}
          {next && !canAdvance && <span className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">Bước tiếp theo: {next.action} (cần vai trò phù hợp)</span>}
          {(a.status === "cho_tvgs" || a.status === "cho_cdt") && can("acceptance.approve") && <Button variant="outline" onClick={() => { setNote(""); setReturnOpen(true); }}><Undo2 /> Trả lại</Button>}
          {a.status === "da_nghiem_thu" && !payment && (can("payment.edit") || can("acceptance.edit")) && <Button variant="navy" onClick={makePayment}><Receipt /> Lập hồ sơ thanh toán</Button>}
          {payment && <Button variant="outline" onClick={() => navigate(`/finance/payments?id=${payment.id}`)}><Receipt /> {payment.code}</Button>}
          {editable && <Button variant="ghost" className="text-rose-600" onClick={async () => { if (await confirm({ title: "Xóa hồ sơ nghiệm thu?", destructive: true, confirmText: "Xóa" })) { run(deleteAcceptance, a.id); toast.success("Đã xóa"); navigate("/acceptance"); } }}><Trash2 /></Button>}
        </div>
      </div>
      <Card className="px-4 py-5"><Stepper steps={STEPS} current={step} failed={a.status === "tra_lai"} /></Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4"><div className="text-xs text-slate-500">Giá trị thi công thực tế</div><div className="tabular mt-1 text-xl font-bold">{fmtVnd(exec)} đ</div></Card>
            <Card className="p-4"><div className="text-xs text-slate-500">Giá trị đề nghị / được nghiệm thu</div><div className="tabular mt-1 text-xl font-bold text-success-fg">{fmtVnd(value)} đ</div></Card>
            <Card className="p-4"><div className="text-xs text-slate-500">Chênh lệch (chưa nghiệm thu)</div><div className="tabular mt-1 text-xl font-bold text-amber-600">{fmtVnd(exec - value)} đ</div></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Đối chiếu khối lượng thực hiện – nghiệm thu</CardTitle>{editable && <span className="text-xs text-slate-500">Có thể điều chỉnh KL nghiệm thu khi hồ sơ đang lập</span>}</CardHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Công việc</TableHead><TableHead>ĐVT</TableHead><TableHead className="text-right">KL thực hiện</TableHead><TableHead className="text-right">KL nghiệm thu</TableHead><TableHead className="text-right">Chênh lệch</TableHead><TableHead className="text-right">Đơn giá</TableHead><TableHead className="text-right">Giá trị NT</TableHead></TableRow></TableHeader>
              <TableBody>
                {a.lines.map((l, i) => {
                  const t = db.constructionPlans.find((x) => x.id === l.taskId);
                  return (
                    <TableRow key={l.taskId}>
                      <TableCell><div className="font-medium">{t?.code} {t?.name}</div></TableCell>
                      <TableCell>{t?.unit}</TableCell>
                      <TableCell className="tabular text-right">{fmtNumber(l.executedQty)}</TableCell>
                      <TableCell className="tabular text-right">{editable ? <Input type="number" className="ml-auto h-8 w-28 text-right" value={l.acceptedQty} onChange={(e) => run(updateAcceptance, a.id, { lines: a.lines.map((x, j) => (j === i ? { ...x, acceptedQty: Math.min(Number(e.target.value), x.executedQty) } : x)) })} /> : <b>{fmtNumber(l.acceptedQty)}</b>}</TableCell>
                      <TableCell className={`tabular text-right ${l.executedQty - l.acceptedQty > 0 ? "text-amber-600" : "text-slate-400"}`}>{fmtNumber(l.executedQty - l.acceptedQty)}</TableCell>
                      <TableCell className="tabular text-right">{fmtVnd(t?.unitPrice)}</TableCell>
                      <TableCell className="tabular text-right font-medium">{fmtVnd(l.acceptedQty * (t?.unitPrice ?? 0))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter><TableRow><TableCell colSpan={6}>Tổng giá trị nghiệm thu</TableCell><TableCell className="tabular text-right">{fmtVnd(value)}</TableCell></TableRow></TableFooter>
            </Table>
          </Card>
          <Card>
            <CardHeader><CardTitle>Tài liệu hồ sơ</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {a.documents.map((d) => <div key={d} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px]"><FileText className="h-4 w-4 text-rose-500" />{d}</div>)}
              {a.documents.length === 0 && <div className="text-xs text-slate-500">Chưa có tài liệu</div>}
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader><CardTitle>Lịch sử xử lý</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 text-xs text-slate-500">Lập ngày {fmtDate(a.createdAt)}{a.acceptedAt && ` · nghiệm thu ngày ${fmtDate(a.acceptedAt)}`}</div>
            <Timeline events={a.history} />
          </CardContent>
        </Card>
      </div>
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Trả lại hồ sơ nghiệm thu</DialogTitle></DialogHeader>
          <DialogBody><FormField label="Lý do" required><Textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Khối lượng cốt thép chưa khớp bản vẽ hoàn công" /></FormField></DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setReturnOpen(false)}>Hủy</Button><Button variant="destructive" disabled={!note.trim()} onClick={() => { run(returnAcceptance, a.id, user!.id, note); toast.success("Đã trả lại hồ sơ"); setReturnOpen(false); }}>Trả lại</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
