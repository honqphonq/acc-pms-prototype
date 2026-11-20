import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/common/FormField";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { createAcceptance } from "@/services/actions";
import { reconcile } from "@/services/selectors";
import { fmtNumber, fmtVnd } from "@/utils/format";
import type { AcceptanceLine } from "@/types";
import { activeProjects } from "@/utils/labels";

const DOCS = ["Biên bản nghiệm thu khối lượng.pdf", "Bảng tính khối lượng chi tiết.xlsx", "Nhật ký thi công (trích).pdf", "Hình ảnh hiện trường.zip", "Kết quả thí nghiệm vật liệu.pdf", "Bản vẽ hoàn công.pdf"];

export function AcceptanceFormDialog({ open, onOpenChange, projectId: initProject, itemId: initItem }: { open: boolean; onOpenChange: (o: boolean) => void; projectId?: string; itemId?: string }) {
  const { db, run } = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pid, setPid] = useState("");
  const [itemId, setItemId] = useState("");
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<(AcceptanceLine & { selected: boolean })[]>([]);
  const [docs, setDocs] = useState<string[]>(DOCS.slice(0, 3));
  const rec = useMemo(() => (pid ? reconcile(db, pid) : []), [db, pid]);
  const phase = `Đợt ${db.acceptanceRecords.filter((a) => a.projectId === pid).length + 1}`;

  useEffect(() => {
    if (open) {
      setPid(initProject ?? "p01");
      setItemId(initItem ?? "");
      setDocs(DOCS.slice(0, 3));
    }
  }, [open, initProject, initItem]);
  useEffect(() => {
    const avail = rec.filter((r) => (!itemId || r.task.itemId === itemId) && r.executed - r.accepted - r.pending > 0.001);
    setLines(avail.map((r) => ({ taskId: r.task.id, executedQty: r.executed, acceptedQty: Math.round((r.executed - r.accepted - r.pending) * 10) / 10, selected: true })));
    const it = db.constructionItems.find((i) => i.id === itemId);
    setTitle(it ? `Nghiệm thu khối lượng ${it.name.toLowerCase()}` : "Nghiệm thu khối lượng hoàn thành giai đoạn");
  }, [rec, itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  const taskOf = (id: string) => db.constructionPlans.find((t) => t.id === id)!;
  const chosen = lines.filter((l) => l.selected && l.acceptedQty > 0);
  const total = chosen.reduce((s, l) => s + l.acceptedQty * taskOf(l.taskId).unitPrice, 0);

  const save = () => {
    if (!chosen.length) return toast.error("Chọn ít nhất một công việc có khối lượng nghiệm thu");
    const bad = chosen.find((l) => { const r = rec.find((x) => x.task.id === l.taskId)!; return l.acceptedQty > r.executed - r.accepted - r.pending + 0.001; });
    if (bad) return toast.error(`KL nghiệm thu của “${taskOf(bad.taskId).name}” vượt khối lượng thực hiện chưa nghiệm thu`);
    const next = run(createAcceptance, { projectId: pid, itemId: itemId || null, title, phase, type: "giai_doan", lines: chosen.map(({ taskId, executedQty, acceptedQty }) => ({ taskId, executedQty, acceptedQty })), documents: docs, note: "" }, user!.id);
    toast.success("Đã lập hồ sơ nghiệm thu");
    onOpenChange(false);
    navigate(`/acceptance/${next.acceptanceRecords[0].id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Lập hồ sơ nghiệm thu khối lượng</DialogTitle><DialogDescription>Khối lượng đề nghị nghiệm thu lấy từ khối lượng thi công thực tế (nhật ký) chưa được nghiệm thu</DialogDescription></DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label="Dự án"><Select value={pid} onChange={(e) => { setPid(e.target.value); setItemId(""); }} options={activeProjects(db).filter((p) => db.constructionPlans.some((t) => t.projectId === p.id && t.actualQty > 0)).map((p) => ({ value: p.id, label: p.shortName }))} /></FormField>
            <FormField label="Hạng mục"><Select value={itemId} onChange={(e) => setItemId(e.target.value)} placeholder="— Tất cả hạng mục —" options={db.constructionItems.filter((i) => i.projectId === pid).map((i) => ({ value: i.id, label: `${i.code} ${i.name}` }))} /></FormField>
            <FormField label="Đợt nghiệm thu"><Input value={phase} disabled /></FormField>
            <FormField label="Tên hồ sơ" className="md:col-span-3"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></FormField>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="w-8 px-2 py-2" /><th className="px-2 text-left">Công việc</th><th className="px-2 text-right">KL thực hiện</th><th className="px-2 text-right">Đã NT / chờ NT</th><th className="px-2 text-right">KL đề nghị NT</th><th className="px-2 text-right">Giá trị (đ)</th></tr></thead>
              <tbody>
                {lines.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-xs text-slate-400">Không còn khối lượng thực hiện chưa nghiệm thu trong phạm vi đã chọn</td></tr>}
                {lines.map((l, i) => {
                  const t = taskOf(l.taskId);
                  const r = rec.find((x) => x.task.id === l.taskId)!;
                  return (
                    <tr key={l.taskId} className="border-t">
                      <td className="px-2 py-1.5"><input type="checkbox" className="accent-[#E60028]" checked={l.selected} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, selected: e.target.checked } : x)))} /></td>
                      <td className="px-2"><div className="font-medium">{t.code} {t.name}</div><div className="text-[11px] text-slate-400">{t.unit} · đơn giá {fmtVnd(t.unitPrice)}</div></td>
                      <td className="tabular px-2 text-right">{fmtNumber(r.executed)}</td>
                      <td className="tabular px-2 text-right text-slate-500">{fmtNumber(r.accepted)} / {fmtNumber(r.pending)}</td>
                      <td className="px-2 text-right"><Input type="number" className="ml-auto h-8 w-28 text-right" value={l.acceptedQty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, acceptedQty: Number(e.target.value) } : x)))} /></td>
                      <td className="tabular px-2 text-right">{fmtVnd(l.acceptedQty * t.unitPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="border-t bg-slate-50 font-semibold"><td colSpan={5} className="px-2 py-2 text-right">Tổng giá trị đề nghị nghiệm thu</td><td className="tabular px-2 text-right">{fmtVnd(total)}</td></tr></tfoot>
            </table>
          </div>
          <div>
            <div className="mb-2 text-xs font-medium text-slate-600">Tài liệu đính kèm (mô phỏng)</div>
            <div className="flex flex-wrap gap-2">{DOCS.map((d) => <label key={d} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs"><input type="checkbox" className="accent-[#E60028]" checked={docs.includes(d)} onChange={(e) => setDocs(e.target.checked ? [...docs, d] : docs.filter((x) => x !== d))} />{d}</label>)}</div>
          </div>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={save} disabled={!chosen.length}>Lập hồ sơ</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
