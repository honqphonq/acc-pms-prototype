import { useEffect, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { getStockRows } from "@/services/selectors";
import { deleteRow, processStocktake, saveRow } from "@/services/actions";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate, fmtMoneyShort, fmtNumber } from "@/utils/format";
import { genId, nextCode } from "@/utils/id";
import { cn } from "@/utils/cn";
import type { Stocktake } from "@/types";

/** Kiểm kê kho: lập phiếu, ghi nhận chênh lệch, xử lý điều chỉnh tồn kho */
export function StocktakePanel({ projectId, autoCreate }: { projectId: string; autoCreate?: boolean }) {
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const confirm = useConfirm();
  const [edit, setEdit] = useState<Stocktake | null>(null);
  const [pid, setPid] = useState(projectId || "p01");
  const list = db.stocktakes.filter((s) => !projectId || s.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date));
  const mat = (id: string) => db.materials.find((m) => m.id === id);
  const value = (s: Stocktake) => s.lines.reduce((t, l) => t + (l.actualQty - l.bookQty) * (mat(l.materialId)?.unitPrice ?? 0), 0);
  const create = () => {
    const rows = getStockRows(db).filter((r) => r.inv.projectId === pid);
    setEdit({ id: genId("kk"), code: nextCode(`KK-${db.projects.find((p) => p.id === pid)?.code}-`, db.stocktakes.map((s) => s.code)), projectId: pid, date: DEMO_TODAY, byId: user!.id, status: "nhap", note: "", lines: rows.map((r) => ({ materialId: r.inv.materialId, bookQty: r.onHand, actualQty: r.onHand })) });
  };
  const editable = edit?.status === "nhap" && can("stock.move");
  useEffect(() => { if (autoCreate && can("stock.move")) create(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card className="rounded-t-none">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <ClipboardList className="h-4 w-4 text-primary" /><span className="text-[13px] font-semibold text-slate-700">Phiếu kiểm kê kho</span>
        <span className="text-xs text-slate-500">Ghi nhận số lượng thực tế, so sánh với sổ sách, xử lý chênh lệch để điều chỉnh tồn kho.</span>
        {can("stock.move") && <div className="ml-auto flex items-center gap-2">{!projectId && <Select className="w-56" value={pid} onChange={(e) => setPid(e.target.value)} options={db.projects.filter((p) => p.status === "dang_thi_cong").map((p) => ({ value: p.id, label: p.shortName }))} />}<Button size="sm" onClick={create}><Plus /> Lập phiếu kiểm kê</Button></div>}
      </div>
      <table className="w-full text-[13px]">
        <thead className="bg-slate-50 text-left text-[12px] text-slate-500"><tr><th className="px-4 py-2.5 font-medium">Số phiếu</th><th className="font-medium">Kho</th><th className="font-medium">Ngày kiểm kê</th><th className="font-medium">Người lập</th><th className="text-right font-medium">Số mã</th><th className="text-right font-medium">Mã lệch</th><th className="text-right font-medium">Giá trị chênh lệch</th><th className="px-4 font-medium">Trạng thái</th></tr></thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id} className="cursor-pointer border-t hover:bg-slate-50" onClick={() => setEdit(structuredClone(s))}>
              <td className="px-4 py-2.5 font-medium">{s.code}</td>
              <td>{db.projects.find((p) => p.id === s.projectId)?.shortName}</td>
              <td>{fmtDate(s.date)}</td>
              <td>{db.users.find((u) => u.id === s.byId)?.name}</td>
              <td className="text-right">{s.lines.length}</td>
              <td className="text-right">{s.lines.filter((l) => l.actualQty !== l.bookQty).length}</td>
              <td className={cn("text-right", value(s) < 0 ? "text-rose-600" : "text-slate-700")}>{fmtMoneyShort(value(s))}</td>
              <td className="px-4">{s.status === "nhap" ? <Badge tone="warning">Chưa xử lý chênh lệch</Badge> : <Badge tone="success">Đã điều chỉnh tồn kho</Badge>}</td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan={8} className="py-8 text-center text-xs text-slate-400">Chưa có phiếu kiểm kê</td></tr>}
        </tbody>
      </table>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Phiếu kiểm kê {edit?.code} – {db.projects.find((p) => p.id === edit?.projectId)?.shortName}</DialogTitle></DialogHeader>
          {edit && (
            <DialogBody className="max-h-[65vh] overflow-y-auto">
              <table className="w-full text-[13px]">
                <thead className="text-left text-[12px] text-slate-500"><tr className="border-b"><th className="py-2 font-medium">Vật tư</th><th className="font-medium">ĐVT</th><th className="text-right font-medium">Tồn sổ sách</th><th className="w-36 text-right font-medium">Thực tế</th><th className="text-right font-medium">Chênh lệch</th><th className="text-right font-medium">Giá trị</th></tr></thead>
                <tbody>
                  {edit.lines.map((l, i) => {
                    const m = mat(l.materialId);
                    const d = Math.round((l.actualQty - l.bookQty) * 100) / 100;
                    return (
                      <tr key={l.materialId} className={cn("border-b border-slate-100", d !== 0 && "bg-amber-50/50")}>
                        <td className="py-1.5">{m?.name}</td><td>{m?.unit}</td>
                        <td className="text-right">{fmtNumber(l.bookQty)}</td>
                        <td className="text-right">{editable ? <Input type="number" className="ml-auto h-8 w-32 text-right" value={l.actualQty} onChange={(e) => setEdit({ ...edit, lines: edit.lines.map((x, k) => (k === i ? { ...x, actualQty: Number(e.target.value) } : x)) })} /> : fmtNumber(l.actualQty)}</td>
                        <td className={cn("text-right font-medium", d < 0 ? "text-rose-600" : d > 0 ? "text-success-fg" : "text-slate-400")}>{d > 0 ? "+" : ""}{fmtNumber(d)}</td>
                        <td className="text-right">{fmtMoneyShort(d * (m?.unitPrice ?? 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-3"><Input placeholder="Ghi chú / nguyên nhân chênh lệch" value={edit.note} disabled={!editable} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></div>
            </DialogBody>
          )}
          <DialogFooter>
            {edit && db.stocktakes.some((s) => s.id === edit.id) && edit.status === "nhap" && can("stock.move") && <Button variant="outline" className="mr-auto text-rose-600" onClick={async () => { if (await confirm({ title: `Xóa phiếu ${edit.code}?`, destructive: true, confirmText: "Xóa" })) { run(deleteRow, "stocktakes", edit.id); setEdit(null); toast.success("Đã xóa phiếu kiểm kê"); } }}>Xóa phiếu</Button>}
            <Button variant="outline" onClick={() => setEdit(null)}>Đóng</Button>
            {editable && <Button variant="outline" onClick={() => { run(saveRow, "stocktakes", edit!); toast.success("Đã lưu phiếu kiểm kê"); setEdit(null); }}>Lưu phiếu</Button>}
            {editable && <Button onClick={() => { run(saveRow, "stocktakes", edit!); run(processStocktake, edit!.id, user!.id); toast.success("Đã xử lý chênh lệch – tồn kho được điều chỉnh"); setEdit(null); }}>Xử lý chênh lệch & điều chỉnh tồn kho</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
