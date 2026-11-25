import { useState } from "react";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Timeline } from "@/components/common/Workflow";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { saveRow } from "@/services/actions";
import { contractTotal, getProjectStatsMap } from "@/services/selectors";
import { PAYMENT_STATUS } from "@/utils/constants";
import { projectOptions, toOptions } from "@/utils/labels";
import { DEMO_TODAY, addDays } from "@/utils/date";
import { fmtDate, fmtNumber, fmtVnd } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { PaymentRecord } from "@/types";

const KIND = { tam_ung: { label: "Tạm ứng", tone: "purple" as const }, thanh_toan: { label: "Thanh toán", tone: "info" as const } };
const ty = (v: number) => `${fmtNumber(v / 1e9, 2)} tỷ`;
const stamp = () => `${DEMO_TODAY}T${new Date().toTimeString().slice(0, 8)}`;

/** Theo dõi theo hợp đồng: đã đề nghị / đã thu / còn phải thu */
function Summary({ projectId }: { projectId: string }) {
  const { db } = useDb();
  const ids = projectId ? [projectId] : db.projects.filter((p) => p.status === "dang_thi_cong").map((p) => p.id);
  const stats = getProjectStatsMap(db);
  const pays = db.paymentRecords.filter((p) => p.direction === "thu_cdt" && ids.includes(p.projectId));
  const contract = ids.reduce((s, id) => s + contractTotal(db, id), 0);
  const accepted = ids.reduce((s, id) => s + (stats.get(id)?.acceptedValue ?? 0), 0);
  const requested = pays.filter((p) => p.status !== "lap_ho_so").reduce((s, p) => s + p.amount, 0);
  const paid = pays.reduce((s, p) => s + p.paidAmount, 0);
  const advance = pays.filter((p) => p.kind === "tam_ung").reduce((s, p) => s + p.paidAmount, 0);
  const items: [string, number, string, number | null][] = [
    ["Giá trị hợp đồng (gồm phụ lục)", contract, ids.length > 1 ? `${ids.length} dự án đang thi công` : "", null],
    ["Đã nghiệm thu", accepted, `${fmtNumber(contract ? (accepted / contract) * 100 : 0, 1)}% giá trị HĐ`, contract ? accepted / contract : 0],
    ["Đã đề nghị thanh toán / tạm ứng", requested, "Hồ sơ đã trình chủ đầu tư", contract ? requested / contract : 0],
    ["Đã thu", paid, `trong đó tạm ứng ${ty(advance)}`, contract ? paid / contract : 0],
    ["Còn phải thu theo hợp đồng", contract - paid, `Còn phải thu theo hồ sơ đã trình: ${ty(Math.max(0, requested - paid))}`, null],
  ];
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map(([l, v, sub, pr], i) => (
        <Card key={l} className={cn("px-4 py-3", i === 4 && "border-amber-300 bg-amber-50/60")}>
          <div className="text-[12px] text-slate-500">{l}</div>
          <div className="mt-1 text-[19px] font-bold text-slate-900">{ty(v)}</div>
          {pr !== null && <Progress value={pr} className="my-1 h-1.5" tone={i === 3 ? "success" : "info"} />}
          <div className="text-[11.5px] text-slate-400">{sub}</div>
        </Card>
      ))}
    </div>
  );
}

function PayDetail({ p }: { p: PaymentRecord }) {
  const { run } = useDb();
  const { user, can } = useAuth();
  const [amt, setAmt] = useState("");
  const left = p.amount - p.retention - p.paidAmount;
  const record = () => {
    const v = Number(amt);
    if (!(v > 0)) return toast.error("Nhập số tiền đã thu");
    const paid = p.paidAmount + v;
    const full = paid >= p.amount - p.retention - 1;
    run(saveRow, "paymentRecords", { ...p, paidAmount: paid, paidAt: DEMO_TODAY, status: full ? "da_thanh_toan" : "thanh_toan_mot_phan", history: [...p.history, { at: stamp(), byId: user!.id, action: full ? "Ghi nhận đã thu đủ" : "Ghi nhận thu một phần", note: `${fmtVnd(v)} đ` }] });
    toast.success("Đã ghi nhận số tiền chủ đầu tư chuyển");
    setAmt("");
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-[13px]">
        <div><div className="text-[11.5px] text-slate-500">Giá trị đề nghị</div><b>{fmtVnd(p.amount)} đ</b></div>
        <div><div className="text-[11.5px] text-slate-500">Giữ lại / thu hồi tạm ứng</div><b>{fmtVnd(p.retention)} đ</b></div>
        <div><div className="text-[11.5px] text-slate-500">Đã thu</div><b className="text-emerald-700">{fmtVnd(p.paidAmount)} đ</b></div>
      </div>
      {can("payment.edit") && left > 0 && (
        <div className="flex items-end gap-2">
          <div className="flex-1"><div className="mb-1 text-[12px] text-slate-500">Ghi nhận số tiền chủ đầu tư đã chuyển (còn phải thu {fmtVnd(left)} đ)</div><Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder={String(left)} /></div>
          <Button onClick={record}><Banknote /> Ghi nhận đã thu</Button>
        </div>
      )}
      <div><div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Lịch sử hoạt động</div><Timeline events={p.history} /></div>
    </div>
  );
}

/** Hồ sơ thanh toán / tạm ứng với chủ đầu tư: nhập tay / import, theo dõi đã thu – còn phải thu theo hợp đồng */
export default function CdtPaymentsPage() {
  const { db } = useDb();
  const { user } = useAuth();
  const [pid, setPid] = useState("");
  const rows = db.paymentRecords.filter((p) => p.direction === "thu_cdt");
  const left = (p: PaymentRecord) => Math.max(0, p.amount - p.retention - p.paidAmount);
  return (
    <RegistryPage<PaymentRecord>
      title="Hồ sơ thanh toán với chủ đầu tư" entityLabel="hồ sơ" addLabel="Thêm thanh toán / tạm ứng" codePrefix="HSTT-" collection="paymentRecords" rows={rows}
      canEdit={!!user}
      above={<Summary projectId={pid} />}
      onFiltersChange={(v) => setPid(v[0] ?? "")}
      searchText={(p) => `${p.code} ${p.title}`}
      filters={[
        { label: "Tất cả dự án", options: projectOptions, test: (p, v) => p.projectId === v },
        { label: "Tạm ứng & thanh toán", options: toOptions(KIND), test: (p, v) => (p.kind ?? "thanh_toan") === v },
        { label: "Tất cả trạng thái", options: toOptions(PAYMENT_STATUS), test: (p, v) => p.status === v },
      ]}
      newRecord={() => ({ direction: "thu_cdt", kind: "thanh_toan", projectId: pid || "p01", acceptanceIds: [], supplierId: null, amount: 0, retention: 0, paidAmount: 0, createdAt: DEMO_TODAY, dueDate: addDays(DEMO_TODAY, 45), paidAt: null, status: "lap_ho_so", createdById: user!.id, history: [{ at: stamp(), byId: user!.id, action: "Lập hồ sơ" }] })}
      columns={[
        { key: "t", header: "Hồ sơ", sortValue: (p) => p.code, cell: (p) => <div className="min-w-[260px]"><div className="font-semibold text-slate-800">{p.title}</div><div className="text-[11.5px] text-slate-400">{p.code} · {db.projects.find((x) => x.id === p.projectId)?.shortName}</div></div> },
        { key: "k", header: "Loại", sortValue: (p) => p.kind ?? "", cell: (p) => <Badge tone={KIND[p.kind ?? "thanh_toan"].tone}>{KIND[p.kind ?? "thanh_toan"].label}</Badge> },
        { key: "d", header: "Ngày lập", sortValue: (p) => p.createdAt, cell: (p) => <span className="whitespace-nowrap">{fmtDate(p.createdAt)}</span> },
        { key: "a", header: "Giá trị đề nghị", align: "right", sortValue: (p) => p.amount, cell: (p) => <span className="whitespace-nowrap">{fmtVnd(p.amount)}</span> },
        { key: "pd", header: "Đã thu", align: "right", sortValue: (p) => p.paidAmount, cell: (p) => <span className="whitespace-nowrap text-emerald-700">{p.paidAmount ? fmtVnd(p.paidAmount) : "—"}</span> },
        { key: "l", header: "Còn phải thu", align: "right", sortValue: (p) => left(p), cell: (p) => (left(p) > 0 ? <span className={cn("whitespace-nowrap font-semibold", p.dueDate < DEMO_TODAY && p.status !== "lap_ho_so" ? "text-rose-600" : "text-slate-800")}>{fmtVnd(left(p))}</span> : <span className="text-slate-300">0</span>) },
        { key: "due", header: "Hạn thu", sortValue: (p) => p.dueDate, cell: (p) => <span className={cn("whitespace-nowrap", left(p) > 0 && p.dueDate < DEMO_TODAY && p.status !== "lap_ho_so" && "font-semibold text-rose-600")}>{fmtDate(p.dueDate)}</span> },
        { key: "s", header: "Trạng thái", sortValue: (p) => p.status, cell: (p) => <StatusBadge map={PAYMENT_STATUS} value={p.status} /> },
      ]}
      fields={[
        { key: "title", label: "Nội dung", required: true, wide: true },
        { key: "projectId", label: "Dự án", type: "select", options: projectOptions, required: true },
        { key: "kind", label: "Loại", type: "select", options: toOptions(KIND) },
        { key: "createdAt", label: "Ngày lập", type: "date" },
        { key: "dueDate", label: "Hạn thu", type: "date" },
        { key: "amount", label: "Giá trị đề nghị (đ)", type: "number", required: true },
        { key: "retention", label: "Giữ lại bảo hành / thu hồi tạm ứng (đ)", type: "number" },
        { key: "paidAmount", label: "Đã thu (đ)", type: "number" },
        { key: "status", label: "Trạng thái", type: "select", options: toOptions(PAYMENT_STATUS) },
      ]}
      detail={(p) => <PayDetail p={p} />}
    />
  );
}
