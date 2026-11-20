import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { NumberInput } from "@/components/ui/number-input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/common/FormField";
import { FileUploader } from "@/components/common/Attachments";
import { getStockRows } from "@/services/selectors";
import { createVoucher, type VoucherLine } from "@/services/actions";
import { DEMO_TODAY } from "@/utils/date";
import { fmtNumber, fmtVnd } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Attachment } from "@/types";
import { activeProjects } from "@/utils/labels";

export const SUBTYPE: Record<string, string> = {
  ncc: "Nhập từ nhà cung cấp", dieu_chuyen: "Điều chuyển", tra_lai: "Hoàn trả từ công trường", kiem_ke: "Điều chỉnh kiểm kê",
  thi_cong: "Xuất thi công công trình", tra_ncc: "Xuất trả nhà cung cấp",
};
const OPTS = { nhap: [["ncc", "Nhà cung cấp"], ["dieu_chuyen", "Điều chuyển từ kho khác"], ["tra_lai", "Hoàn trả từ công trường"]], xuat: [["thi_cong", "Xuất thi công công trình"], ["dieu_chuyen", "Điều chuyển sang kho dự án khác"], ["tra_ncc", "Trả lại nhà cung cấp"]] } as const;

/** Phiếu nhập / xuất kho nhiều dòng vật tư (một dự án = một kho) */
export function VoucherDialog({ open, onOpenChange, projectId, type, transfer, materialId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string; type: "nhap" | "xuat"; transfer?: boolean; materialId?: string }) {
  const { db, run } = useDb();
  const { user } = useAuth();
  const [sub, setSub] = useState<string>(type === "nhap" ? "ncc" : "thi_cong");
  const [date, setDate] = useState(DEMO_TODAY);
  const [supplierId, setSupplierId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [toProjectId, setToProjectId] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [lines, setLines] = useState<VoucherLine[]>([]);
  useEffect(() => {
    if (!open) return;
    setSub(transfer ? "dieu_chuyen" : type === "nhap" ? "ncc" : "thi_cong"); setDate(DEMO_TODAY); setSupplierId(""); setTaskId(""); setToProjectId(""); setNote(""); setFiles([]);
    setLines([{ materialId: materialId ?? "", docQty: 0, qty: 0 }]);
  }, [open, type, transfer, materialId]);
  const project = db.projects.find((p) => p.id === projectId);
  const stock = getStockRows(db).filter((r) => r.inv.projectId === projectId);
  const onHand = (mid: string) => stock.find((r) => r.inv.materialId === mid)?.onHand ?? 0;
  const mat = (id: string) => db.materials.find((m) => m.id === id);
  const matOpts = (type === "xuat" ? stock.map((r) => r.material) : db.materials).map((m) => ({ value: m.id, label: `${m.code} – ${m.name} (${m.unit})` }));
  const total = lines.reduce((s, l) => s + l.qty * (mat(l.materialId)?.unitPrice ?? 0), 0);
  const setLine = (i: number, c: Partial<VoucherLine>) => setLines(lines.map((x, k) => (k === i ? { ...x, ...c } : x)));
  const save = (confirm: boolean) => {
    const valid = lines.filter((l) => l.materialId && l.qty > 0);
    if (!valid.length) return toast.error("Thêm ít nhất 1 dòng vật tư có số lượng > 0");
    if (sub === "ncc" && !supplierId) return toast.error("Chọn nhà cung cấp");
    if (type === "xuat" && sub === "dieu_chuyen" && !toProjectId) return toast.error("Chọn kho dự án nhận điều chuyển");
    run(createVoucher, { type, subType: sub, projectId, date, supplierId: supplierId || null, taskId: taskId || null, toProjectId: toProjectId || null, note, files }, valid, user!.id, confirm);
    toast.success(`Đã lập phiếu ${type === "nhap" ? "nhập" : "xuất"} ${valid.length} dòng vật tư${confirm ? " – đã cập nhật tồn kho" : " – chờ xác nhận"}`, { description: type === "xuat" && sub === "dieu_chuyen" ? `Đã sinh phiếu nhập chờ xác nhận tại kho ${db.projects.find((p) => p.id === toProjectId)?.shortName}` : undefined });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader><DialogTitle>{transfer ? "Điều chuyển kho" : type === "nhap" ? "Lập phiếu nhập kho" : "Lập phiếu xuất kho"}</DialogTitle><DialogDescription>Kho dự án: {project?.name}</DialogDescription></DialogHeader>
        <DialogBody className="max-h-[72vh] space-y-4 overflow-y-auto">
          <div className="grid gap-3 md:grid-cols-4">
            <FormField label={type === "nhap" ? "Nguồn nhập" : "Mục đích xuất"} required><Select value={sub} disabled={transfer} onChange={(e) => setSub(e.target.value)} options={OPTS[type].map(([value, label]) => ({ value, label }))} /></FormField>
            <FormField label="Ngày"><Input type="date" value={date} max={DEMO_TODAY} onChange={(e) => setDate(e.target.value)} /></FormField>
            {sub === "ncc" || sub === "tra_ncc" ? <FormField label="Nhà cung cấp" required={sub === "ncc"} className="md:col-span-2"><Select value={supplierId} placeholder="— Chọn nhà cung cấp —" onChange={(e) => setSupplierId(e.target.value)} options={db.suppliers.map((s) => ({ value: s.id, label: s.name }))} /></FormField>
              : type === "xuat" && sub === "thi_cong" ? <FormField label="Phục vụ công việc" className="md:col-span-2"><Select value={taskId} placeholder="— Chọn công việc —" onChange={(e) => setTaskId(e.target.value)} options={db.constructionPlans.filter((t) => t.projectId === projectId && !t.isGroup && t.status !== "hoan_thanh").map((t) => ({ value: t.id, label: `[${t.code}] ${t.name}` }))} /></FormField>
              : type === "xuat" && sub === "dieu_chuyen" ? <FormField label="Kho dự án nhận" required className="md:col-span-2"><Select value={toProjectId} placeholder="— Chọn dự án —" onChange={(e) => setToProjectId(e.target.value)} options={activeProjects(db).filter((p) => p.id !== projectId).map((p) => ({ value: p.id, label: p.shortName }))} /></FormField>
              : <div className="md:col-span-2" />}
            <FormField label="Chứng từ gốc / ghi chú" className="md:col-span-4"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Hóa đơn 0001234, biên bản giao nhận ngày…" /></FormField>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[820px] text-[13.5px]">
              <thead className="bg-slate-100/80 text-left text-[12px] font-bold uppercase tracking-wide text-slate-800">
                <tr><th className="w-10 px-3 py-2.5">#</th><th>Vật tư</th><th className="w-16">ĐVT</th>{type === "xuat" && <th className="w-24 text-right">Tồn kho</th>}<th className="w-36 text-right">SL theo chứng từ</th><th className="w-36 text-right">{type === "nhap" ? "SL thực nhận" : "SL thực xuất"}</th><th className="w-32 text-right">Thành tiền</th><th className="w-10" /></tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const m = mat(l.materialId);
                  const overStock = type === "xuat" && l.qty > onHand(l.materialId);
                  const diff = l.docQty > 0 && l.qty !== l.docQty;
                  return (
                    <tr key={i} className="border-t align-top">
                      <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                      <td className="py-1.5 pr-2"><Select value={l.materialId} placeholder="— Chọn vật tư —" onChange={(e) => setLine(i, { materialId: e.target.value })} options={matOpts} /></td>
                      <td className="py-2">{m?.unit}</td>
                      {type === "xuat" && <td className="tabular py-2 text-right">{l.materialId ? fmtNumber(onHand(l.materialId)) : ""}</td>}
                      <td className="py-1.5 pl-2"><NumberInput className="text-right" value={l.docQty} onChange={(v) => setLine(i, { docQty: v, qty: l.qty || v })} /></td>
                      <td className="py-1.5 pl-2"><NumberInput className={cn("text-right font-semibold", (overStock || diff) && "border-amber-400")} value={l.qty} onChange={(v) => setLine(i, { qty: v })} />
                        {overStock && <div className="mt-0.5 text-right text-[11px] text-rose-600">Vượt tồn kho</div>}
                        {!overStock && diff && <div className="mt-0.5 text-right text-[11px] text-amber-700">Lệch chứng từ {fmtNumber(l.qty - l.docQty)}</div>}
                      </td>
                      <td className="tabular py-2 text-right">{fmtVnd(l.qty * (m?.unitPrice ?? 0))}</td>
                      <td className="py-1.5 text-center"><Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => setLines(lines.filter((_, k) => k !== i))}><Trash2 /></Button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="border-t bg-slate-50 font-semibold"><td colSpan={type === "xuat" ? 6 : 5} className="px-3 py-2.5"><Button size="xs" variant="soft" onClick={() => setLines([...lines, { materialId: "", docQty: 0, qty: 0 }])}><Plus /> Thêm dòng vật tư</Button></td><td className="tabular py-2.5 text-right">{fmtVnd(total)} đ</td><td /></tr></tfoot>
            </table>
          </div>
          <FormField label="Đính kèm (biên bản giao nhận, hóa đơn…)"><FileUploader value={files} onChange={setFiles} /></FormField>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button variant="outline" onClick={() => save(false)}>Lưu phiếu (chờ xác nhận)</Button>
          <Button onClick={() => save(true)}>Lưu & xác nhận {type === "nhap" ? "nhập" : "xuất"} kho</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
