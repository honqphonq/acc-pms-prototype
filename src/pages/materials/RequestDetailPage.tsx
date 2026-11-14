import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, PackageCheck, PackageOpen, Pencil, Send, ShoppingCart, Trash2, Undo2, XCircle, Boxes } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Stepper, Timeline } from "@/components/common/Workflow";
import { UserCell } from "@/components/common/UserAvatar";
import { EmptyState } from "@/components/common/EmptyState";
import { FormField } from "@/components/common/FormField";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { decideRequest, deleteRequest, fulfillFromStock, issueRequest, placeOrder, receiveRequest, submitRequest } from "@/services/actions";
import { isRequestOverdue, requestValue, stockOf } from "@/services/selectors";
import { MR_STATUS, MR_TYPE } from "@/utils/constants";
import { DEMO_TODAY, addDays } from "@/utils/date";
import { fmtDate, fmtNumber, fmtVnd } from "@/utils/format";

const STEPS = ["Lập đề xuất", "CHT phê duyệt", "Kiểm tra tồn kho / chọn NCC", "Mua hàng", "Nhập kho", "Xuất sử dụng"];
const stepOf: Record<string, number> = { nhap: 0, tra_lai: 0, cho_duyet: 1, tu_choi: 1, da_duyet: 2, dat_hang: 3, da_nhap_kho: 5, hoan_thanh: 6 };

export default function RequestDetailPage() {
  const { id } = useParams();
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const r = db.materialRequests.find((x) => x.id === id);
  const [decision, setDecision] = useState<null | "da_duyet" | "tu_choi" | "tra_lai">(null);
  const [note, setNote] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const [order, setOrder] = useState({ supplierId: "", orderNo: "", expected: addDays(DEMO_TODAY, 5) });
  if (!r) return <Card><EmptyState title="Không tìm thấy đề xuất vật tư" action={<Button onClick={() => navigate("/materials/requests")}>Về danh sách</Button>} /></Card>;

  const project = db.projects.find((p) => p.id === r.projectId);
  const lines = r.lines.map((l) => ({ l, m: db.materials.find((x) => x.id === l.materialId)!, s: stockOf(db, r.projectId, l.materialId) }));
  const enoughStock = lines.every((x) => (x.s?.onHand ?? 0) >= x.l.qty);
  const canApprove = can("material.approve");
  const canPurchase = can("material.purchase");
  const total = requestValue(r);
  const sup = db.suppliers.find((s) => s.id === r.supplierId);
  const matGroups = new Set(lines.map((x) => x.m.group));
  const suggested = db.suppliers.filter((s) => s.materialGroups.some((g) => matGroups.has(g)));

  const doDecide = () => {
    if (decision !== "da_duyet" && !note.trim()) return toast.error("Vui lòng nhập lý do");
    run(decideRequest, r.id, decision!, user!.id, note);
    toast.success(decision === "da_duyet" ? "Đã phê duyệt – trạng thái chuyển sang “Đã phê duyệt”" : decision === "tu_choi" ? "Đã từ chối đề xuất" : "Đã trả lại đề xuất để bổ sung");
    setDecision(null);
    setNote("");
  };
  const step = stepOf[r.status];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/materials/requests" className="mb-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> Danh sách đề xuất</Link>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold text-slate-900">{r.title}</h1><StatusBadge map={MR_STATUS} value={r.status} />{isRequestOverdue(r) && <Badge tone="danger">Quá hạn cung ứng</Badge>}</div>
          <div className="mt-1 text-[13px] text-slate-500">{r.code} · {MR_TYPE[r.type]} · {project?.name}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {["nhap", "tra_lai"].includes(r.status) && can("material.request") && (
            <>
              <Button variant="outline" onClick={() => navigate(`/materials/requests/${r.id}/edit`)}><Pencil /> Sửa</Button>
              <Button onClick={() => { run(submitRequest, r.id, user!.id); toast.success("Đã gửi phê duyệt"); }}><Send /> Gửi phê duyệt</Button>
              <Button variant="ghost" className="text-rose-600" onClick={async () => { if (await confirm({ title: "Xóa đề xuất?", destructive: true, confirmText: "Xóa" })) { run(deleteRequest, r.id); toast.success("Đã xóa đề xuất"); navigate("/materials/requests"); } }}><Trash2 /></Button>
            </>
          )}
          {r.status === "cho_duyet" && (canApprove ? (
            <>
              <Button variant="success" onClick={() => setDecision("da_duyet")}><CheckCircle2 /> Phê duyệt</Button>
              <Button variant="outline" onClick={() => setDecision("tra_lai")}><Undo2 /> Trả lại</Button>
              <Button variant="outline" className="text-rose-600" onClick={() => setDecision("tu_choi")}><XCircle /> Từ chối</Button>
            </>
          ) : <Badge tone="warning" className="py-1.5">Chờ {db.users.find((u) => u.id === r.approverId)?.name} phê duyệt · đổi sang vai trò CHT/Lãnh đạo để duyệt</Badge>)}
          {r.status === "da_duyet" && canPurchase && (
            <>
              <Button variant="navy" disabled={!enoughStock} title={enoughStock ? "" : "Tồn kho không đủ"} onClick={async () => { if (await confirm({ title: "Xuất trực tiếp từ tồn kho?", description: "Tồn kho công trường đủ đáp ứng – xuất sử dụng ngay, không cần mua hàng." })) { run(fulfillFromStock, r.id, user!.id); toast.success("Đã xuất vật tư từ tồn kho – đề xuất hoàn thành"); } }}><Boxes /> Còn hàng: xuất từ kho</Button>
              <Button onClick={() => { setOrder({ supplierId: suggested[0]?.id ?? "", orderNo: `ĐH-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`, expected: addDays(DEMO_TODAY, 5) }); setOrderOpen(true); }}><ShoppingCart /> Hết hàng: chọn NCC & đặt hàng</Button>
            </>
          )}
          {r.status === "dat_hang" && canPurchase && <Button onClick={() => { run(receiveRequest, r.id, user!.id); toast.success("Đã nhập kho – tồn kho được cập nhật", { description: "Đề nghị thanh toán NCC đã được tạo tự động." }); }}><PackageCheck /> Xác nhận nhập kho</Button>}
          {r.status === "da_nhap_kho" && can("stock.move") && <Button variant="navy" onClick={() => { run(issueRequest, r.id, user!.id); toast.success("Đã xuất sử dụng – đề xuất hoàn thành"); }}><PackageOpen /> Xuất sử dụng</Button>}
        </div>
      </div>

      <Card className="px-4 py-5"><Stepper steps={STEPS} current={step} failed={r.status === "tu_choi"} /></Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader><CardTitle>Thông tin đề xuất</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-2.5 text-[13px] md:grid-cols-2">
                <div><dt className="text-xs text-slate-500">Dự án / hợp đồng</dt><dd className="font-medium">{project?.shortName} · {project?.contractNo}</dd></div>
                <div><dt className="text-xs text-slate-500">Hạng mục / công việc</dt><dd className="font-medium">{db.constructionItems.find((i) => i.id === r.itemId)?.name ?? "—"}{r.taskId && ` › ${db.constructionPlans.find((t) => t.id === r.taskId)?.name}`}</dd></div>
                <div><dt className="text-xs text-slate-500">Người đề xuất</dt><dd><UserCell userId={r.requesterId} sub="" /></dd></div>
                <div><dt className="text-xs text-slate-500">Người xét duyệt</dt><dd><UserCell userId={r.approverId} sub="" /></dd></div>
                <div><dt className="text-xs text-slate-500">Ngày tạo · Ngày cần</dt><dd className="font-medium">{fmtDate(r.createdAt)} · <span className={isRequestOverdue(r) ? "text-rose-600" : ""}>{fmtDate(r.neededDate)}</span></dd></div>
                <div><dt className="text-xs text-slate-500">Tổng giá trị</dt><dd className="text-base font-bold">{fmtVnd(total)} đ</dd></div>
                {r.note && <div className="md:col-span-2"><dt className="text-xs text-slate-500">Ghi chú</dt><dd>{r.note}</dd></div>}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Chi tiết vật tư & kiểm tra tồn kho</CardTitle>{["da_duyet", "cho_duyet"].includes(r.status) && <Badge tone={enoughStock ? "success" : "danger"}>{enoughStock ? "Tồn kho đủ đáp ứng" : "Tồn kho không đủ – cần mua hàng"}</Badge>}</CardHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Vật tư</TableHead><TableHead>ĐVT</TableHead><TableHead className="text-right">KL đề xuất</TableHead><TableHead className="text-right">Đơn giá</TableHead><TableHead className="text-right">Thành tiền</TableHead><TableHead className="text-right">Tồn kho</TableHead><TableHead className="text-right">Đã dùng / ĐM</TableHead></TableRow></TableHeader>
              <TableBody>
                {lines.map(({ l, m, s }) => (
                  <TableRow key={l.materialId}>
                    <TableCell><div className="font-medium">{m.name}</div><div className="text-[11px] text-slate-400">{m.code} · {m.spec}</div></TableCell>
                    <TableCell>{m.unit}</TableCell>
                    <TableCell className="tabular text-right font-semibold">{fmtNumber(l.qty)}</TableCell>
                    <TableCell className="tabular text-right">{fmtVnd(l.unitPrice)}</TableCell>
                    <TableCell className="tabular text-right">{fmtVnd(l.qty * l.unitPrice)}</TableCell>
                    <TableCell className={`tabular text-right ${(s?.onHand ?? 0) < l.qty ? "text-rose-600" : "text-success-fg"}`}>{fmtNumber(s?.onHand ?? 0)}</TableCell>
                    <TableCell className="tabular text-right text-xs">{s ? `${fmtNumber(s.issued)} / ${fmtNumber(s.inv.normQty)} (${Math.round(s.usage * 100)}%)` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter><TableRow><TableCell colSpan={4}>Tổng cộng</TableCell><TableCell className="tabular text-right">{fmtVnd(total)}</TableCell><TableCell colSpan={2} /></TableRow></TableFooter>
            </Table>
          </Card>
          {sup && (
            <Card>
              <CardHeader><CardTitle>Tình trạng cung ứng / đặt hàng</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-[13px] md:grid-cols-4">
                <div><div className="text-xs text-slate-500">Nhà cung cấp</div><div className="font-medium">{sup.name}</div></div>
                <div><div className="text-xs text-slate-500">Số đơn hàng</div><div className="font-medium">{r.orderNo}</div></div>
                <div><div className="text-xs text-slate-500">Ngày đặt</div><div className="font-medium">{fmtDate(r.orderDate)}</div></div>
                <div><div className="text-xs text-slate-500">Dự kiến giao</div><div className="font-medium">{fmtDate(r.expectedDelivery)} {r.status === "dat_hang" && r.expectedDelivery && r.expectedDelivery < DEMO_TODAY && <Badge tone="danger">Giao chậm</Badge>}</div></div>
              </CardContent>
            </Card>
          )}
        </div>
        <Card className="h-fit">
          <CardHeader><CardTitle>Lịch sử xử lý</CardTitle></CardHeader>
          <CardContent><Timeline events={r.history} /></CardContent>
        </Card>
      </div>

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{decision === "da_duyet" ? "Phê duyệt đề xuất" : decision === "tu_choi" ? "Từ chối đề xuất" : "Trả lại đề xuất"}</DialogTitle><DialogDescription>{r.code} – {r.title} · {fmtVnd(total)} đ</DialogDescription></DialogHeader>
          <DialogBody><FormField label={decision === "da_duyet" ? "Ý kiến phê duyệt (không bắt buộc)" : "Lý do"} required={decision !== "da_duyet"}><Textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder={decision === "tra_lai" ? "VD: Bổ sung bảng tính khối lượng" : ""} /></FormField></DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setDecision(null)}>Hủy</Button><Button variant={decision === "da_duyet" ? "success" : "destructive"} onClick={doDecide}>Xác nhận</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lựa chọn nhà cung cấp & đặt hàng</DialogTitle><DialogDescription>Tồn kho không đủ – thực hiện mua hàng theo đề xuất {r.code}</DialogDescription></DialogHeader>
          <DialogBody className="space-y-3">
            <FormField label="Nhà cung cấp" required>
              <Select value={order.supplierId} onChange={(e) => setOrder({ ...order, supplierId: e.target.value })} placeholder="— Chọn NCC —" options={db.suppliers.map((s) => ({ value: s.id, label: `${s.name}${suggested.includes(s) ? " ★ phù hợp" : ""} · đánh giá ${s.rating}` }))} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Số đơn hàng"><Input value={order.orderNo} onChange={(e) => setOrder({ ...order, orderNo: e.target.value })} /></FormField>
              <FormField label="Ngày giao dự kiến"><Input type="date" value={order.expected} min={DEMO_TODAY} onChange={(e) => setOrder({ ...order, expected: e.target.value })} /></FormField>
            </div>
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setOrderOpen(false)}>Hủy</Button><Button disabled={!order.supplierId} onClick={() => { run(placeOrder, r.id, order.supplierId, order.orderNo, order.expected, user!.id); toast.success("Đã đặt hàng – trạng thái “Đang đặt hàng”"); setOrderOpen(false); }}>Đặt hàng</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
