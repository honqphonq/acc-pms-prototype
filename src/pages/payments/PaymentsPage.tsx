import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Stepper, Timeline } from "@/components/common/Workflow";
import { FormField } from "@/components/common/FormField";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { advancePayment, createPayment, deletePayment } from "@/services/actions";
import { acceptanceValue } from "@/services/selectors";
import { PAYMENT_STATUS } from "@/utils/constants";
import { DEMO_TODAY, addDays } from "@/utils/date";
import { fmtDate, fmtMoneyShort, fmtVnd } from "@/utils/format";
import type { PaymentRecord } from "@/types";
import { activeProjects } from "@/utils/labels";

const NEXT_LABEL: Record<string, string> = { lap_ho_so: "Trình duyệt", da_trinh: "Ghi nhận phê duyệt", da_duyet: "Ghi nhận thanh toán", thanh_toan_mot_phan: "Ghi nhận thanh toán tiếp" };
const STEP = { lap_ho_so: 0, da_trinh: 1, da_duyet: 2, thanh_toan_mot_phan: 3, da_thanh_toan: 4 } as const;

export default function PaymentsPage() {
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [dir, setDir] = useState<"thu_cdt" | "tra_ncc">("thu_cdt");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [selId, setSelId] = useQueryParam("id");
  const [createOpen, setCreateOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const sel = db.paymentRecords.find((p) => p.id === selId);
  useEffect(() => { if (sel) setDir(sel.direction); }, [sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = db.paymentRecords.filter((p) => p.direction === dir && (!projectId || p.projectId === projectId));
  const rows = base.filter((p) => !status || p.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sum = (f: (p: PaymentRecord) => number) => base.reduce((s, p) => s + f(p), 0);
  const editable = can("payment.edit");

  // ---- create from accepted records ----
  const [cp, setCp] = useState({ projectId: "p01", ids: [] as string[], retention: "5" });
  const available = db.acceptanceRecords.filter((a) => a.projectId === cp.projectId && a.status === "da_nghiem_thu" && !db.paymentRecords.some((p) => p.acceptanceIds.includes(a.id)));
  const amount = available.filter((a) => cp.ids.includes(a.id)).reduce((s, a) => s + acceptanceValue(db, a), 0);

  const cols: Column<PaymentRecord>[] = [
    { key: "t", header: "Hồ sơ", sortValue: (p) => p.code, cell: (p) => <div className="min-w-[260px]"><div className="font-semibold text-slate-800">{p.title}</div><div className="text-[11px] text-slate-400">{p.code} · {dir === "thu_cdt" ? db.projects.find((x) => x.id === p.projectId)?.shortName : db.suppliers.find((s) => s.id === p.supplierId)?.name}</div></div> },
    { key: "a", header: "Giá trị đề nghị", align: "right", sortValue: (p) => p.amount, cell: (p) => fmtMoneyShort(p.amount) },
    ...(dir === "thu_cdt" ? [{ key: "r", header: "Giữ lại 5%", align: "right" as const, cell: (p: PaymentRecord) => <span className="text-slate-500">{fmtMoneyShort(p.retention)}</span> }] : []),
    { key: "paid", header: "Đã thanh toán", sortValue: (p) => p.paidAmount, cell: (p) => <div className="w-32"><div className="mb-1 text-[11.5px] font-medium">{fmtMoneyShort(p.paidAmount)}</div><Progress value={p.paidAmount / (p.amount - p.retention || 1)} tone="success" className="h-1.5" /></div> },
    { key: "due", header: "Hạn", sortValue: (p) => p.dueDate, cell: (p) => <span className={`whitespace-nowrap text-xs ${p.status !== "da_thanh_toan" && p.dueDate < DEMO_TODAY ? "font-semibold text-rose-600" : ""}`}>{fmtDate(p.dueDate)}</span> },
    { key: "st", header: "Trạng thái", sortValue: (p) => p.status, cell: (p) => <StatusBadge map={PAYMENT_STATUS} value={p.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Hồ sơ thanh toán" description="Theo dõi hồ sơ thanh toán với Chủ đầu tư (từ hồ sơ nghiệm thu) và thanh toán / công nợ với nhà cung cấp." actions={editable && dir === "thu_cdt" && <Button onClick={() => { setCp({ projectId: projectId || "p01", ids: [], retention: "5" }); setCreateOpen(true); }}><Plus /> Lập hồ sơ thanh toán</Button>} />
      <Tabs value={dir} onValueChange={(v) => { setDir(v as typeof dir); setStatus(""); }}>
        <TabsList className="mb-4 rounded-xl bg-white px-2">
          <TabsTrigger value="thu_cdt">Thanh toán với Chủ đầu tư</TabsTrigger>
          <TabsTrigger value="tra_ncc">Thanh toán / công nợ nhà cung cấp</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={dir === "thu_cdt" ? "Tổng giá trị đề nghị thanh toán" : "Tổng giá trị phải trả NCC"} value={fmtMoneyShort(sum((p) => p.amount))} tone="navy" sub={`${base.length} hồ sơ`} />
        <KpiCard label={dir === "thu_cdt" ? "Đã thu" : "Đã trả"} value={fmtMoneyShort(sum((p) => p.paidAmount))} tone="success" progress={sum((p) => p.paidAmount) / (sum((p) => p.amount - p.retention) || 1)} />
        <KpiCard label={dir === "thu_cdt" ? "Còn phải thu" : "Công nợ còn lại"} value={fmtMoneyShort(sum((p) => p.amount - p.retention - p.paidAmount))} tone="warning" />
        <KpiCard label="Quá hạn" value={base.filter((p) => p.status !== "da_thanh_toan" && p.dueDate < DEMO_TODAY).length} unit="hồ sơ" tone="danger" />
      </div>
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(p) => p.id} loading={loading} onRowClick={(p) => setSelId(p.id)} resetKey={dir + projectId + status}
          searchText={(p) => `${p.code} ${p.title}`} searchPlaceholder="Tìm hồ sơ..."
          toolbar={<>
            <FilterSelect value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />
            <FilterSelect value={status} onChange={setStatus} allLabel="Tất cả trạng thái" options={Object.entries(PAYMENT_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} />
          </>}
        />
      </Card>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSelId("")}>
        <SheetContent className="sm:max-w-2xl">
          {sel && (
            <>
              <SheetHeader><div className="text-[11px] text-slate-500">{sel.code} · {sel.direction === "thu_cdt" ? "Thanh toán với Chủ đầu tư" : "Thanh toán nhà cung cấp"}</div><SheetTitle>{sel.title}</SheetTitle><StatusBadge map={PAYMENT_STATUS} value={sel.status} className="w-fit" /></SheetHeader>
              <SheetBody className="space-y-5">
                <Stepper steps={sel.direction === "thu_cdt" ? ["Lập hồ sơ", "Trình CĐT", "CĐT phê duyệt", "Thanh toán", "Hoàn tất"] : ["Lập đề nghị", "Trình KTT", "Phê duyệt", "Chuyển khoản", "Hoàn tất"]} current={STEP[sel.status]} />
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-[13px]">
                  <div><div className="text-xs text-slate-500">Giá trị đề nghị</div><b>{fmtVnd(sel.amount)} đ</b></div>
                  <div><div className="text-xs text-slate-500">Giữ lại bảo hành</div><b>{fmtVnd(sel.retention)} đ</b></div>
                  <div><div className="text-xs text-slate-500">Đã thanh toán</div><b className="text-success-fg">{fmtVnd(sel.paidAmount)} đ</b></div>
                  <div><div className="text-xs text-slate-500">Còn lại</div><b className="text-amber-600">{fmtVnd(sel.amount - sel.retention - sel.paidAmount)} đ</b></div>
                  <div><div className="text-xs text-slate-500">Ngày lập · hạn</div>{fmtDate(sel.createdAt)} · {fmtDate(sel.dueDate)}</div>
                  <div><div className="text-xs text-slate-500">Dự án</div>{db.projects.find((p) => p.id === sel.projectId)?.shortName}</div>
                </div>
                {sel.acceptanceIds.length > 0 && <div><div className="mb-1.5 text-xs font-semibold text-slate-500">CĂN CỨ NGHIỆM THU</div>{sel.acceptanceIds.map((id) => { const a = db.acceptanceRecords.find((x) => x.id === id); return a && <Link key={id} to={`/acceptance/${id}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-[13px] hover:bg-slate-50"><span>{a.code} – {a.title}</span><ArrowRight className="h-4 w-4 text-slate-400" /></Link>; })}</div>}
                {(sel.status === "da_duyet" || sel.status === "thanh_toan_mot_phan") && editable && (
                  <FormField label="Số tiền thanh toán đợt này (để trống = thanh toán đủ)"><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={String(sel.amount - sel.retention - sel.paidAmount)} /></FormField>
                )}
                <div><div className="mb-2 text-xs font-semibold text-slate-500">LỊCH SỬ</div><Timeline events={sel.history} /></div>
              </SheetBody>
              <SheetFooter>
                {editable && sel.status === "lap_ho_so" && <Button variant="ghost" className="mr-auto text-rose-600" onClick={async () => { if (await confirm({ title: "Xóa hồ sơ thanh toán?", destructive: true, confirmText: "Xóa" })) { run(deletePayment, sel.id); setSelId(""); toast.success("Đã xóa"); } }}><Trash2 /> Xóa</Button>}
                {editable && NEXT_LABEL[sel.status] && <Button onClick={() => { run(advancePayment, sel.id, user!.id, payAmount ? Number(payAmount) : undefined); setPayAmount(""); toast.success(`${NEXT_LABEL[sel.status]} thành công`); }}>{NEXT_LABEL[sel.status]}</Button>}
                {!editable && <span className="text-xs text-slate-500">Cần vai trò Tài chính – Kế toán để xử lý hồ sơ</span>}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Lập hồ sơ thanh toán với Chủ đầu tư</DialogTitle><DialogDescription>Chọn các hồ sơ đã nghiệm thu làm căn cứ thanh toán</DialogDescription></DialogHeader>
          <DialogBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Dự án"><Select value={cp.projectId} onChange={(e) => setCp({ ...cp, projectId: e.target.value, ids: [] })} options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} /></FormField>
              <FormField label="Tỷ lệ giữ lại bảo hành (%)"><Input type="number" value={cp.retention} onChange={(e) => setCp({ ...cp, retention: e.target.value })} /></FormField>
            </div>
            <div className="space-y-2">
              {available.length === 0 && <div className="rounded-md bg-slate-50 py-6 text-center text-xs text-slate-500">Không có hồ sơ đã nghiệm thu chưa lập thanh toán cho dự án này</div>}
              {available.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-[13px] hover:bg-slate-50">
                  <input type="checkbox" className="accent-[#E60028]" checked={cp.ids.includes(a.id)} onChange={(e) => setCp({ ...cp, ids: e.target.checked ? [...cp.ids, a.id] : cp.ids.filter((x) => x !== a.id) })} />
                  <div className="flex-1"><div className="font-medium">{a.title}</div><div className="text-[11px] text-slate-400">{a.code} · NT ngày {fmtDate(a.acceptedAt)}</div></div>
                  <b>{fmtMoneyShort(acceptanceValue(db, a))}</b>
                </label>
              ))}
            </div>
            <div className="flex justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm"><span>Giá trị đề nghị: <b>{fmtVnd(amount)} đ</b></span><span>Thực nhận: <b className="text-success-fg">{fmtVnd(amount * (1 - Number(cp.retention) / 100))} đ</b></span></div>
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button><Button disabled={!cp.ids.length} onClick={() => {
            const sel2 = available.filter((a) => cp.ids.includes(a.id));
            const next = run(createPayment, { projectId: cp.projectId, acceptanceIds: cp.ids, title: `Thanh toán ${sel2.map((a) => a.phase.toLowerCase()).join(", ")} – ${db.projects.find((p) => p.id === cp.projectId)?.shortName}`, amount: Math.round(amount), retention: Math.round((amount * Number(cp.retention)) / 100), dueDate: addDays(DEMO_TODAY, 45) }, user!.id);
            toast.success("Đã lập hồ sơ thanh toán"); setCreateOpen(false); setDir("thu_cdt"); setSelId(next.paymentRecords[0].id);
          }}>Lập hồ sơ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
