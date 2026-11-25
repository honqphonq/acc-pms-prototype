import { useRef, useState } from "react";
import { AlertTriangle, Download, FileUp, Lock, LockOpen, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterSelect } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { deleteRow, saveRow } from "@/services/actions";
import { contractTotal, valueRows } from "@/services/selectors";
import { activeProjects } from "@/utils/labels";
import { DEMO_TODAY, monthsBetween } from "@/utils/date";
import { fmtDate, fmtNumber, fmtVnd } from "@/utils/format";
import { genId } from "@/utils/id";
import { num, readXlsx, writeXlsx } from "@/utils/xlsx";
import { cn } from "@/utils/cn";
import type { PlanTask } from "@/types";

const ty = (v: number) => `${fmtNumber(v / 1e9, 2)} tỷ`;
const mLabel = (m: string) => `Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}`;

/** Giá trị khối lượng thi công = KL thực tế (từ Quản lý thi công) × đơn giá hợp đồng; theo kỳ (tháng), lũy kế; chốt kỳ; đối chiếu thực hiện – nghiệm thu – thanh toán */
export default function ValuePage() {
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const confirm = useConfirm();
  const [projectId, setProjectId] = useQueryParam("project");
  const pid = projectId || "p01";
  const project = db.projects.find((p) => p.id === pid)!;
  const months = monthsBetween(project.startDate, DEMO_TODAY).reverse();
  const [month, setMonth] = useState(DEMO_TODAY.slice(0, 7));
  const [detail, setDetail] = useState<PlanTask | null>(null);
  const [price, setPrice] = useState<{ t: PlanTask; v: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = can("payment.edit");
  const period = db.valuePeriods.find((v) => v.projectId === pid && v.month === month);
  const rows = valueRows(db, pid, month);
  const items = db.constructionItems.filter((i) => i.projectId === pid).sort((a, b) => a.order - b.order);
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
  const vPeriod = sum((r) => r.valuePeriod), vCum = sum((r) => r.valueCum), vAcc = sum((r) => r.acceptedValue), vContract = sum((r) => r.contractValue);
  const gthd = contractTotal(db, pid);
  const paid = db.paymentRecords.filter((p) => p.projectId === pid && p.direction === "thu_cdt" && p.kind !== "tam_ung").reduce((s, p) => s + p.paidAmount, 0);
  const over = rows.filter((r) => r.over);

  const lock = () => { run(saveRow, "valuePeriods", { id: genId("vp"), projectId: pid, month, lockedAt: `${DEMO_TODAY}T${new Date().toTimeString().slice(0, 8)}`, lockedById: user!.id, value: vPeriod }); toast.success(`Đã chốt số liệu ${mLabel(month).toLowerCase()} – khóa chỉnh sửa`); };
  const exportXlsx = () => {
    const r: (string | number)[][] = [["BẢNG GIÁ TRỊ KHỐI LƯỢNG THI CÔNG"], [`Công trình: ${project.name}`], [`Kỳ: ${mLabel(month)}${period ? " (đã chốt)" : ""}`], [], ["Mã", "Công việc", "ĐVT", "KL hợp đồng", "Đơn giá HĐ", "KL kỳ này", "KL lũy kế", "Giá trị kỳ này", "Giá trị lũy kế", "% HĐ", "Giá trị đã nghiệm thu"]];
    items.forEach((it) => {
      const rs = rows.filter((x) => x.task.itemId === it.id);
      if (!rs.length) return;
      r.push([it.code, it.name.toUpperCase()]);
      rs.forEach((x) => r.push([x.task.code, x.task.name, x.task.unit, x.task.contractQty, x.task.unitPrice, Math.round(x.qtyPeriod * 100) / 100, Math.round(x.qtyCum * 100) / 100, Math.round(x.valuePeriod), Math.round(x.valueCum), x.contractValue ? Math.round((x.valueCum / x.contractValue) * 1000) / 10 : 0, Math.round(x.acceptedValue)]));
    });
    r.push([], ["", "TỔNG CỘNG", "", "", "", "", "", Math.round(vPeriod), Math.round(vCum), "", Math.round(vAcc)]);
    writeXlsx(`Gia-tri-KL_${project.shortName}_${month}.xlsx`, "Giá trị KL", r, [8, 48, 7, 12, 13, 11, 11, 16, 16, 8, 16]);
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    if (period) return toast.error("Kỳ đã chốt – mở khóa trước khi cập nhật");
    try {
      const data = await readXlsx(f);
      let n = 0; const err: string[] = [];
      data.slice(1).forEach((r, i) => {
        const t = db.constructionPlans.find((x) => x.projectId === pid && !x.isGroup && x.code === String(r[0]).trim());
        const p = num(r[2]);
        if (!t) { if (String(r[0]).trim()) err.push(`Dòng ${i + 2}: không tìm thấy công việc mã ${r[0]}`); return; }
        if (!(p > 0)) return err.push(`Dòng ${i + 2}: đơn giá không hợp lệ`);
        run(saveRow, "constructionPlans", { ...t, unitPrice: p }); n++;
      });
      toast.success(`Đã cập nhật đơn giá ${n} công việc`, { description: err.length ? `${err.length} dòng lỗi: ${err.slice(0, 2).join("; ")}` : undefined });
    } catch { toast.error("Không đọc được file Excel"); }
  };
  const th = "px-2 py-2 text-[11.5px] font-bold uppercase text-slate-700";
  const money = "tabular px-2 py-1.5 text-right";

  return (
    <div>
      <PageHeader title="Giá trị khối lượng thi công" actions={<>
        {editable && <Button variant="outline" onClick={() => writeXlsx("Mau-cap-nhat-don-gia.xlsx", "Đơn giá", [["Mã công việc", "Tên công việc", "Đơn giá hợp đồng"], ...rows.map((r) => [r.task.code, r.task.name, r.task.unitPrice])], [14, 50, 18])}><Download /> Tải mẫu đơn giá</Button>}
        {editable && <Button variant="outline" onClick={() => fileRef.current?.click()}><FileUp /> Import đơn giá</Button>}
        <Button variant="outline" onClick={exportXlsx}><Download /> Export</Button>
        {editable && (period
          ? <Button variant="outline" onClick={async () => { if (await confirm({ title: `Mở khóa ${mLabel(month).toLowerCase()}?`, description: "Số liệu kỳ này sẽ được phép chỉnh sửa lại." })) { run(deleteRow, "valuePeriods", period.id); toast.success("Đã mở khóa kỳ"); } }}><LockOpen /> Mở khóa kỳ</Button>
          : <Button onClick={lock}><Lock /> Chốt kỳ {mLabel(month).toLowerCase()}</Button>)}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </>} />

      <Card className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
        <FilterSelect label="Dự án" value={pid} onChange={(v) => setProjectId(v || "p01")} allLabel="— Chọn dự án —" options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />
        <FilterSelect label="Kỳ" value={month} onChange={(v) => setMonth(v || DEMO_TODAY.slice(0, 7))} allLabel={mLabel(DEMO_TODAY.slice(0, 7))} options={months.filter((m) => m !== DEMO_TODAY.slice(0, 7)).map((m) => ({ value: m, label: `${mLabel(m)}${db.valuePeriods.some((v) => v.projectId === pid && v.month === m) ? " · đã chốt" : ""}` }))} />
        {period ? <Badge tone="success"><Lock className="h-3 w-3" /> Đã chốt {fmtDate(period.lockedAt)} · {db.users.find((u) => u.id === period.lockedById)?.name}</Badge> : <Badge tone="warning">Chưa chốt kỳ</Badge>}
        <span className="ml-auto text-[12.5px] text-slate-500">Giá trị = KL thực tế (nhật ký thi công) × đơn giá hợp đồng</span>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[["Giá trị thực hiện kỳ này", vPeriod, mLabel(month)], ["Giá trị thực hiện lũy kế", vCum, `${fmtNumber(gthd ? (vCum / gthd) * 100 : 0, 1)}% giá trị HĐ (${ty(gthd)})`], ["Đã nghiệm thu lũy kế", vAcc, `Chưa nghiệm thu: ${ty(Math.max(0, vCum - vAcc))}`], ["Đã thanh toán (CĐT đã trả)", paid, `Đã NT chưa thanh toán: ${ty(Math.max(0, vAcc - paid))}`], ["Đối chiếu", 0, ""]].map(([l, v, sub], i) => i === 4 ? (
          <Card key="dc" className="px-4 py-3">
            <div className="text-[12px] text-slate-500">Thực hiện – nghiệm thu – thanh toán</div>
            <div className="mt-2 space-y-1.5">
              {[["Thực hiện", vCum, "#2563EB"], ["Nghiệm thu", vAcc, "#16A34A"], ["Thanh toán", paid, "#F59E0B"]].map(([n, x, c]) => (
                <div key={String(n)} className="flex items-center gap-2 text-[11.5px]"><span className="w-16 text-slate-500">{n}</span><div className="h-2 flex-1 rounded bg-slate-100"><div className="h-2 rounded" style={{ width: `${Math.min(100, vCum ? (Number(x) / vCum) * 100 : 0)}%`, background: String(c) }} /></div></div>
              ))}
            </div>
          </Card>
        ) : (
          <Card key={String(l)} className="px-4 py-3">
            <div className="text-[12px] text-slate-500">{l}</div>
            <div className="mt-1 text-[19px] font-bold text-slate-900">{ty(Number(v))}</div>
            <div className="text-[11.5px] text-slate-400">{sub}</div>
          </Card>
        ))}
      </div>

      {over.length > 0 && <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800"><AlertTriangle className="h-4 w-4" /> {over.length} công việc có khối lượng thực hiện vượt khối lượng hợp đồng: {over.slice(0, 3).map((r) => r.task.name).join("; ")}{over.length > 3 ? "…" : ""}</div>}

      <Card className="overflow-hidden">
        <div className="scrollbar-visible max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[1250px] text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-slate-100">
              <tr className="border-b">{["Mã", "Công việc", "ĐVT", "KL hợp đồng", "Đơn giá HĐ", "KL kỳ này", "KL lũy kế", "Giá trị kỳ này", "Giá trị lũy kế", "% HĐ", "Đã nghiệm thu", ""].map((h, i) => <th key={i} className={cn(th, i >= 3 && i <= 10 ? "text-right" : "text-left", i === 7 && "border-l")}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const rs = rows.filter((x) => x.task.itemId === it.id);
                if (!rs.length) return null;
                return [
                  <tr key={it.id} className="border-b bg-[#DCE6F2]/60 font-bold text-[#1F3A68]"><td className="px-2 py-1.5">{it.code}</td><td colSpan={6} className="px-2 py-1.5">{it.name}</td><td className={cn(money, "border-l")}>{fmtVnd(rs.reduce((s, x) => s + x.valuePeriod, 0))}</td><td className={money}>{fmtVnd(rs.reduce((s, x) => s + x.valueCum, 0))}</td><td /><td className={money}>{fmtVnd(rs.reduce((s, x) => s + x.acceptedValue, 0))}</td><td /></tr>,
                  ...rs.map((x) => (
                    <tr key={x.task.id} className="group cursor-pointer border-b border-slate-100 hover:bg-amber-50/50" onClick={() => setDetail(x.task)}>
                      <td className="px-2 py-1.5 text-slate-500">{x.task.code}</td>
                      <td className="max-w-[320px] px-2 py-1.5 text-slate-800">{x.task.name}{x.over && <Badge tone="warning" className="ml-1.5">Vượt KL HĐ</Badge>}</td>
                      <td className="px-2 py-1.5">{x.task.unit}</td>
                      <td className={money}>{fmtNumber(x.task.contractQty, 1)}</td>
                      <td className={money}>{fmtVnd(x.task.unitPrice)}</td>
                      <td className={money}>{x.qtyPeriod ? fmtNumber(x.qtyPeriod, 1) : ""}</td>
                      <td className={money}>{fmtNumber(x.qtyCum, 1)}</td>
                      <td className={cn(money, "border-l font-semibold")}>{x.valuePeriod ? fmtVnd(x.valuePeriod) : ""}</td>
                      <td className={money}>{fmtVnd(x.valueCum)}</td>
                      <td className={money}>{x.contractValue ? fmtNumber((x.valueCum / x.contractValue) * 100, 0) : 0}%</td>
                      <td className={money}>{x.acceptedValue ? fmtVnd(x.acceptedValue) : ""}</td>
                      <td className="px-1 text-right" onClick={(e) => e.stopPropagation()}>{editable && !period && <Button size="icon-sm" variant="ghost" className="opacity-0 group-hover:opacity-100" aria-label="Cập nhật đơn giá" onClick={() => setPrice({ t: x.task, v: String(x.task.unitPrice) })}><Pencil /></Button>}</td>
                    </tr>
                  )),
                ];
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-slate-50 font-semibold">
              <tr className="border-t"><td colSpan={7} className="px-2 py-2">Tổng cộng ({rows.length} công việc · giá trị HĐ theo đơn giá {ty(vContract)})</td><td className={cn(money, "border-l")}>{fmtVnd(vPeriod)}</td><td className={money}>{fmtVnd(vCum)}</td><td className={money}>{vContract ? fmtNumber((vCum / vContract) * 100, 0) : 0}%</td><td className={money}>{fmtVnd(vAcc)}</td><td /></tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{detail?.code} · {detail?.name}</DialogTitle><DialogDescription>Khối lượng thực hiện theo nhật ký thi công · đơn giá HĐ {fmtVnd(detail?.unitPrice ?? 0)} đ/{detail?.unit}</DialogDescription></DialogHeader>
          {detail && (
            <DialogBody>
              <table className="w-full text-[12.5px]">
                <thead className="bg-slate-100 text-left"><tr><th className="px-2 py-1.5">Ngày</th><th className="px-2 text-right">Khối lượng</th><th className="px-2 text-right">Giá trị</th><th className="px-2">Nội dung</th><th className="px-2">Trạng thái</th></tr></thead>
                <tbody>
                  {db.constructionLogs.filter((l) => l.taskId === detail.id && l.date.slice(0, 7) <= month).sort((a, b) => b.date.localeCompare(a.date)).map((l) => (
                    <tr key={l.id} className={cn("border-t", l.date.slice(0, 7) === month && "bg-sky-50/60")}><td className="px-2 py-1.5">{fmtDate(l.date)}</td><td className="tabular px-2 text-right">{fmtNumber(l.qty, 1)}</td><td className="tabular px-2 text-right">{fmtVnd(l.qty * detail.unitPrice)}</td><td className="max-w-[260px] truncate px-2 text-slate-600">{l.content}</td><td className="px-2">{l.status === "da_xac_nhan" ? <Badge tone="success">Đã xác nhận</Badge> : l.status === "nhap" ? <Badge>Nháp</Badge> : <Badge tone="warning">Chờ xác nhận</Badge>}</td></tr>
                  ))}
                </tbody>
              </table>
            </DialogBody>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!price} onOpenChange={(o) => !o && setPrice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cập nhật đơn giá</DialogTitle><DialogDescription>{price?.t.name}</DialogDescription></DialogHeader>
          {price && <DialogBody><FormField label={`Đơn giá áp dụng (đ/${price.t.unit})`} hint="Dùng khi có phụ lục điều chỉnh đơn giá hoặc đơn giá tạm cho khối lượng phát sinh"><Input type="number" value={price.v} onChange={(e) => setPrice({ ...price, v: e.target.value })} /></FormField></DialogBody>}
          <DialogFooter><Button variant="outline" onClick={() => setPrice(null)}>Hủy</Button><Button onClick={() => { if (!price || !(Number(price.v) > 0)) return toast.error("Đơn giá không hợp lệ"); run(saveRow, "constructionPlans", { ...price.t, unitPrice: Number(price.v) }); toast.success("Đã cập nhật đơn giá"); setPrice(null); }}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
