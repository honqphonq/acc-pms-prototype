import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet, FileUp, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterSelect } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { EmptyState } from "@/components/common/EmptyState";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { saveRow, deleteRow } from "@/services/actions";
import { estimateSummary, lineDirect } from "@/services/selectors";
import { activeProjects } from "@/utils/labels";
import { fmtNumber, fmtVnd } from "@/utils/format";
import { DEMO_TODAY } from "@/utils/date";
import { genId } from "@/utils/id";
import { readXlsx, writeXlsx, num } from "@/utils/xlsx";
import { cn } from "@/utils/cn";
import type { Estimate, EstimateLine } from "@/types";

const UNITS = ["m³", "m²", "m", "tấn", "kg", "100m³", "100m²", "100m", "cái", "bộ", "gói", "công", "ca"];
const HEAD = ["Hạng mục", "Mã hiệu định mức", "Tên công tác", "Đơn vị", "Khối lượng", "Đơn giá vật liệu", "Đơn giá nhân công", "Đơn giá máy TC"];
const ty = (v: number) => `${fmtNumber(v / 1e9, 2)} tỷ`;

/** Dự toán thi công: danh sách công tác theo hạng mục (mã định mức, KL, đơn giá VL/NC/MTC) – import từ Excel / phần mềm dự toán, ghép với công việc tiến độ */
export default function EstimatePage() {
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const confirm = useConfirm();
  const [projectId, setProjectId] = useQueryParam("project");
  const pid = projectId || "p01";
  const [q, setQ] = useState("");
  const [onlyUnmatched, setOnlyUnmatched] = useState(false);
  const [edit, setEdit] = useState<Partial<EstimateLine> | null>(null);
  const [imp, setImp] = useState<{ file: string; lines: EstimateLine[]; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = can("payment.edit") || can("project.edit");
  const project = db.projects.find((p) => p.id === pid);
  const est = db.estimates.find((e) => e.projectId === pid);
  const sum = est ? estimateSummary(est) : null;
  const tasks = db.constructionPlans.filter((t) => t.projectId === pid && !t.isGroup).sort((a, b) => a.order - b.order);
  const taskName = (id?: string | null) => tasks.find((t) => t.id === id);
  const kw = q.trim().toLowerCase();
  const lines = (est?.lines ?? []).filter((l) => (!kw || `${l.code} ${l.name} ${l.group}`.toLowerCase().includes(kw)) && (!onlyUnmatched || !l.taskId));
  const groups = useMemo(() => [...new Set(lines.map((l) => l.group))], [lines]);
  const save = (e: Estimate) => run(saveRow, "estimates", e);

  const exportXlsx = () => {
    if (!est || !sum) return;
    const rows: (string | number)[][] = [["BẢNG DỰ TOÁN HẠNG MỤC CÔNG TRÌNH"], [`Công trình: ${project?.name}`], [], ["STT", "Mã hiệu", "Tên công tác", "Đơn vị", "Khối lượng", "ĐG Vật liệu", "ĐG Nhân công", "ĐG Máy TC", "TT Vật liệu", "TT Nhân công", "TT Máy TC", "Tổng cộng", "Công việc tiến độ"]];
    let i = 0;
    [...new Set(est.lines.map((l) => l.group))].forEach((g) => {
      rows.push(["HM", "", g]);
      est.lines.filter((l) => l.group === g).forEach((l) => rows.push([++i, l.code, l.name, l.unit, l.qty, l.vl, l.nc, l.mtc, Math.round(l.qty * l.vl), Math.round(l.qty * l.nc), Math.round(l.qty * l.mtc), Math.round(lineDirect(l)), taskName(l.taskId)?.name ?? ""]));
    });
    rows.push([], ["", "", "Chi phí trực tiếp (T)", "", "", "", "", "", Math.round(sum.vl), Math.round(sum.nc), Math.round(sum.mtc), Math.round(sum.t)], ["", "", `Chi phí chung (C = ${est.rateC}% × T)`, "", "", "", "", "", "", "", "", Math.round(sum.c)], ["", "", `Thu nhập chịu thuế tính trước (TL = ${est.rateTL}% × (T+C))`, "", "", "", "", "", "", "", "", Math.round(sum.tl)], ["", "", "Giá trị dự toán trước thuế (G)", "", "", "", "", "", "", "", "", Math.round(sum.gxd)], ["", "", `Thuế GTGT (${est.vat}%)`, "", "", "", "", "", "", "", "", Math.round(sum.vat)], ["", "", "Giá trị dự toán sau thuế", "", "", "", "", "", "", "", "", Math.round(sum.total)]);
    writeXlsx(`Du-toan_${project?.shortName ?? pid}.xlsx`, "Dự toán", rows, [5, 12, 52, 8, 11, 13, 13, 13, 15, 15, 15, 16, 36]);
  };
  const template = () => writeXlsx("Mau-import-du-toan.xlsx", "Dự toán", [HEAD, ["Kết cấu đường CHC", "AD.11222", "Làm móng cấp phối đá dăm lớp dưới", "m³", 1200, 285000, 32000, 61000], ["Kết cấu đường CHC", "AF.15430", "Bê tông mặt đường mác 350, máy rải ván khuôn trượt", "m³", 800, 1650000, 210000, 395000]], [26, 14, 50, 8, 12, 15, 15, 15]);
  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const data = await readXlsx(f);
      const errors: string[] = [];
      const out: EstimateLine[] = [];
      const seen = new Set((est?.lines ?? []).map((l) => `${l.group}|${l.code}|${l.name}`));
      data.slice(1).forEach((r, i) => {
        const row = i + 2;
        const [group, code, name, unit, qty, vl, nc, mtc] = r.map((c) => (typeof c === "string" ? c.trim() : c));
        if (!name && !code) return;
        const e: string[] = [];
        if (!code) e.push("thiếu mã hiệu định mức");
        if (!UNITS.includes(String(unit))) e.push(`đơn vị tính “${unit}” không hợp lệ`);
        if (!(num(qty) > 0)) e.push("khối lượng phải > 0");
        const key = `${group}|${code}|${name}`;
        if (seen.has(key)) e.push("trùng hạng mục đã có trong dự toán");
        if (e.length) return errors.push(`Dòng ${row} – ${code || name}: ${e.join("; ")}`);
        seen.add(key);
        out.push({ id: genId("el"), group: String(group || "Hạng mục chung"), code: String(code), name: String(name), unit: String(unit), qty: num(qty), vl: num(vl) || 0, nc: num(nc) || 0, mtc: num(mtc) || 0, taskId: null });
      });
      setImp({ file: f.name, lines: out, errors });
    } catch {
      toast.error("Không đọc được file Excel");
    }
  };
  const doImport = () => {
    if (!imp) return;
    const base: Estimate = est ?? { id: genId("dt"), code: `DT-${pid}`, projectId: pid, name: `Dự toán thi công – ${project?.shortName}`, createdAt: DEMO_TODAY, createdById: user!.id, source: "Excel", rateC: 6.5, rateTL: 5.5, vat: 8, lines: [] };
    save({ ...base, lines: [...base.lines, ...imp.lines] });
    toast.success(`Đã nhập ${imp.lines.length} dòng công tác vào dự toán`);
    setImp(null);
  };
  const saveLine = () => {
    if (!edit) return;
    if (!edit.code?.trim() || !edit.name?.trim()) return toast.error("Nhập mã hiệu và tên công tác");
    if (!(Number(edit.qty) > 0)) return toast.error("Khối lượng phải > 0");
    const line = { id: edit.id ?? genId("el"), group: edit.group || "Hạng mục chung", code: edit.code.trim(), name: edit.name.trim(), unit: edit.unit || "m³", qty: Number(edit.qty), vl: Number(edit.vl) || 0, nc: Number(edit.nc) || 0, mtc: Number(edit.mtc) || 0, taskId: edit.taskId || null } as EstimateLine;
    const base: Estimate = est ?? { id: genId("dt"), code: `DT-${pid}`, projectId: pid, name: `Dự toán thi công – ${project?.shortName}`, createdAt: DEMO_TODAY, createdById: user!.id, source: "Nhập tay", rateC: 6.5, rateTL: 5.5, vat: 8, lines: [] };
    save({ ...base, lines: edit.id ? base.lines.map((l) => (l.id === edit.id ? line : l)) : [...base.lines, line] });
    toast.success(edit.id ? "Đã cập nhật công tác" : "Đã thêm công tác");
    setEdit(null);
  };
  const th = "px-2 py-2 text-[11.5px] font-bold uppercase text-slate-700";
  let stt = 0;

  return (
    <div>
      <PageHeader title="Dự toán thi công" actions={<>
        <Button variant="outline" onClick={template}><FileSpreadsheet /> Tải file mẫu</Button>
        {editable && <Button variant="outline" onClick={() => fileRef.current?.click()}><FileUp /> Import Excel</Button>}
        <Button variant="outline" disabled={!est} onClick={exportXlsx}><Download /> Export</Button>
        {editable && <Button onClick={() => setEdit({ unit: "m³", group: est?.lines[est.lines.length - 1]?.group })}><Plus /> Thêm công tác</Button>}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </>} />

      <Card className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
        <FilterSelect label="Dự án" value={pid} onChange={(v) => setProjectId(v || "p01")} allLabel="— Chọn dự án —" options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã hiệu, tên công tác…" className="h-10 w-64" />
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600"><input type="checkbox" checked={onlyUnmatched} onChange={(e) => setOnlyUnmatched(e.target.checked)} className="h-4 w-4" />Chỉ dòng chưa ghép công việc</label>
        {est && <span className="ml-auto text-[12px] text-slate-500">{est.code} · nguồn: {est.source} · {est.lines.length} công tác</span>}
        {est && editable && <Button size="sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (await confirm({ title: "Xóa toàn bộ dự toán của dự án?", destructive: true, confirmText: "Xóa" })) { run(deleteRow, "estimates", est.id); toast.success("Đã xóa dự toán"); } }}><Trash2 /> Xóa dự toán</Button>}
      </Card>

      {!est || !sum ? (
        <Card><EmptyState title="Dự án chưa có dự toán" description="Tải file mẫu, điền dự toán (hoặc xuất từ phần mềm dự toán) rồi Import Excel; hoặc thêm từng công tác." action={editable && <Button onClick={() => fileRef.current?.click()}><FileUp /> Import Excel</Button>} /></Card>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[["Vật liệu (VL)", sum.vl, "NVLTT"], ["Nhân công (NC)", sum.nc, "NCTT"], ["Máy thi công (MTC)", sum.mtc, "CPMTC"], [`Chi phí chung (${est.rateC}%)`, sum.c, "CPSXC"], ["Dự toán trước thuế", sum.gxd, `T + C + TL ${est.rateTL}%`], ["Dự toán sau thuế", sum.total, `VAT ${est.vat}%`]].map(([l, v, sub], i) => (
              <Card key={String(l)} className={cn("px-4 py-3", i === 5 && "border-primary/30 bg-primary-soft/40")}>
                <div className="text-[12px] text-slate-500">{l}</div>
                <div className="mt-1 text-[20px] font-bold text-slate-900">{ty(Number(v))}</div>
                <div className="text-[11.5px] text-slate-400">{sub}</div>
              </Card>
            ))}
          </div>
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5 text-[12.5px] text-slate-600">
              <Link2 className="h-4 w-4 text-slate-400" /> Đã ghép <b className="text-slate-800">{sum.matched}/{est.lines.length}</b> công tác với công việc trong kế hoạch tiến độ
              {sum.matched < est.lines.length && <button className="text-primary hover:underline" onClick={() => setOnlyUnmatched(true)}>· xem {est.lines.length - sum.matched} dòng chưa ghép</button>}
            </div>
            <div className="scrollbar-visible max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[1280px] text-[12.5px]">
                <thead className="sticky top-0 z-10 bg-slate-100">
                  <tr className="border-b">
                    <th rowSpan={2} className={cn(th, "w-10")}>STT</th><th rowSpan={2} className={cn(th, "text-left")}>Mã hiệu</th><th rowSpan={2} className={cn(th, "min-w-[300px] text-left")}>Tên công tác</th><th rowSpan={2} className={th}>ĐVT</th><th rowSpan={2} className={cn(th, "text-right")}>Khối lượng</th>
                    <th colSpan={3} className={cn(th, "border-l text-center")}>Đơn giá (đ)</th><th colSpan={3} className={cn(th, "border-l text-center")}>Thành tiền (đ)</th><th rowSpan={2} className={cn(th, "border-l text-right")}>Tổng cộng</th><th rowSpan={2} className={cn(th, "text-left")}>Công việc tiến độ</th><th rowSpan={2} className="w-16" />
                  </tr>
                  <tr className="border-b">{["Vật liệu", "Nhân công", "Máy TC", "Vật liệu", "Nhân công", "Máy TC"].map((h, i) => <th key={i} className={cn(th, "text-right", i % 3 === 0 && "border-l")}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {groups.map((g) => {
                    const gl = lines.filter((l) => l.group === g);
                    return [
                      <tr key={g} className="border-b bg-[#DCE6F2]/60 font-bold text-[#1F3A68]"><td className="px-2 py-1.5 text-center">HM</td><td colSpan={9} className="px-2 py-1.5">{g}</td><td colSpan={2} /><td className="px-2 py-1.5 text-right">{fmtVnd(gl.reduce((s, l) => s + lineDirect(l), 0))}</td><td colSpan={2} /></tr>,
                      ...gl.map((l) => {
                        const t = taskName(l.taskId);
                        return (
                          <tr key={l.id} className="group border-b border-slate-100 hover:bg-amber-50/50">
                            <td className="px-2 py-1.5 text-center text-slate-500">{++stt}</td>
                            <td className="whitespace-nowrap px-2 py-1.5 font-medium text-slate-700">{l.code}</td>
                            <td className="min-w-[300px] max-w-[420px] px-2 py-1.5 text-slate-800">{l.name}</td>
                            <td className="px-2 py-1.5 text-center">{l.unit}</td>
                            <td className="tabular px-2 py-1.5 text-right">{fmtNumber(l.qty, 2)}</td>
                            <td className="tabular border-l px-2 py-1.5 text-right">{fmtVnd(l.vl)}</td><td className="tabular px-2 py-1.5 text-right">{fmtVnd(l.nc)}</td><td className="tabular px-2 py-1.5 text-right">{fmtVnd(l.mtc)}</td>
                            <td className="tabular border-l px-2 py-1.5 text-right">{fmtVnd(l.qty * l.vl)}</td><td className="tabular px-2 py-1.5 text-right">{fmtVnd(l.qty * l.nc)}</td><td className="tabular px-2 py-1.5 text-right">{fmtVnd(l.qty * l.mtc)}</td>
                            <td className="tabular border-l px-2 py-1.5 text-right font-semibold">{fmtVnd(lineDirect(l))}</td>
                            <td className="max-w-[220px] px-2 py-1.5">{t ? <span className="line-clamp-1 text-slate-600" title={t.name}>[{t.code}] {t.name}</span> : <Badge tone="warning">Chưa ghép</Badge>}</td>
                            <td className="whitespace-nowrap px-1 text-right">{editable && <span className="opacity-0 group-hover:opacity-100"><Button size="icon-sm" variant="ghost" onClick={() => setEdit({ ...l })}><Pencil /></Button><Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (await confirm({ title: `Xóa công tác ${l.code}?`, destructive: true, confirmText: "Xóa" })) { save({ ...est, lines: est.lines.filter((x) => x.id !== l.id) }); toast.success("Đã xóa"); } }}><Trash2 /></Button></span>}</td>
                          </tr>
                        );
                      }),
                    ];
                  })}
                  {!lines.length && <tr><td colSpan={15} className="py-8 text-center text-slate-400">Không có công tác phù hợp</td></tr>}
                </tbody>
                <tfoot className="bg-slate-50 text-[12.5px]">
                  <tr className="border-t font-semibold"><td colSpan={8} className="px-2 py-2 text-right">Chi phí trực tiếp (T)</td><td className="tabular border-l px-2 text-right">{fmtVnd(sum.vl)}</td><td className="tabular px-2 text-right">{fmtVnd(sum.nc)}</td><td className="tabular px-2 text-right">{fmtVnd(sum.mtc)}</td><td className="tabular border-l px-2 text-right">{fmtVnd(sum.t)}</td><td colSpan={2} /></tr>
                  <tr><td colSpan={11} className="px-2 py-1.5 text-right text-slate-600">Chi phí chung (C = {est.rateC}% × T)</td><td className="tabular border-l px-2 text-right">{fmtVnd(sum.c)}</td><td colSpan={2} /></tr>
                  <tr><td colSpan={11} className="px-2 py-1.5 text-right text-slate-600">Thu nhập chịu thuế tính trước (TL = {est.rateTL}% × (T + C))</td><td className="tabular border-l px-2 text-right">{fmtVnd(sum.tl)}</td><td colSpan={2} /></tr>
                  <tr className="font-semibold"><td colSpan={11} className="px-2 py-1.5 text-right">Giá trị dự toán trước thuế</td><td className="tabular border-l px-2 text-right">{fmtVnd(sum.gxd)}</td><td colSpan={2} /></tr>
                  <tr><td colSpan={11} className="px-2 py-1.5 text-right text-slate-600">Thuế GTGT ({est.vat}%)</td><td className="tabular border-l px-2 text-right">{fmtVnd(sum.vat)}</td><td colSpan={2} /></tr>
                  <tr className="border-t text-[13.5px] font-bold text-slate-900"><td colSpan={11} className="px-2 py-2 text-right">Giá trị dự toán sau thuế</td><td className="tabular border-l px-2 text-right">{fmtVnd(sum.total)}</td><td colSpan={2} /></tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Cập nhật công tác" : "Thêm công tác dự toán"}</DialogTitle></DialogHeader>
          {edit && (
            <DialogBody className="grid gap-3 sm:grid-cols-3">
              <FormField label="Hạng mục" className="sm:col-span-3"><Input value={edit.group ?? ""} onChange={(e) => setEdit({ ...edit, group: e.target.value })} list="est-groups" /><datalist id="est-groups">{[...new Set((est?.lines ?? []).map((l) => l.group))].map((g) => <option key={g} value={g} />)}</datalist></FormField>
              <FormField label="Mã hiệu định mức" required><Input value={edit.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} placeholder="AB.25113" /></FormField>
              <FormField label="Tên công tác" required className="sm:col-span-2"><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></FormField>
              <FormField label="Đơn vị"><Select value={edit.unit ?? "m³"} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} options={UNITS.map((u) => ({ value: u, label: u }))} /></FormField>
              <FormField label="Khối lượng" required><Input type="number" value={edit.qty ?? ""} onChange={(e) => setEdit({ ...edit, qty: Number(e.target.value) })} /></FormField>
              <div />
              <FormField label="Đơn giá vật liệu"><Input type="number" value={edit.vl ?? ""} onChange={(e) => setEdit({ ...edit, vl: Number(e.target.value) })} /></FormField>
              <FormField label="Đơn giá nhân công"><Input type="number" value={edit.nc ?? ""} onChange={(e) => setEdit({ ...edit, nc: Number(e.target.value) })} /></FormField>
              <FormField label="Đơn giá máy thi công"><Input type="number" value={edit.mtc ?? ""} onChange={(e) => setEdit({ ...edit, mtc: Number(e.target.value) })} /></FormField>
              <FormField label="Ghép với công việc trong kế hoạch tiến độ" className="sm:col-span-3" hint="Tiến độ chỉ theo dõi các đầu việc chính; nhiều công tác dự toán có thể ghép vào 1 công việc"><Select value={edit.taskId ?? ""} onChange={(e) => setEdit({ ...edit, taskId: e.target.value || null })} placeholder="— Chưa ghép —" options={tasks.map((t) => ({ value: t.id, label: `[${t.code}] ${t.name}` }))} /></FormField>
              <div className="rounded-md bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600 sm:col-span-3">Thành tiền: <b className="text-slate-900">{fmtVnd((Number(edit.qty) || 0) * ((Number(edit.vl) || 0) + (Number(edit.nc) || 0) + (Number(edit.mtc) || 0)))} đ</b></div>
            </DialogBody>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={saveLine}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!imp} onOpenChange={(o) => !o && setImp(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Kiểm tra dữ liệu import</DialogTitle><DialogDescription>{imp?.file}</DialogDescription></DialogHeader>
          {imp && (
            <DialogBody className="space-y-3">
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">{imp.lines.length} dòng hợp lệ sẽ được thêm vào dự toán của {project?.shortName}.</div>
              {imp.errors.length > 0 && <div className="rounded-md bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700"><div className="mb-1 flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4" /> {imp.errors.length} dòng bị lỗi, sẽ bỏ qua:</div><ul className="list-disc space-y-0.5 pl-5">{imp.errors.slice(0, 12).map((e) => <li key={e}>{e}</li>)}</ul></div>}
              <p className="text-[12px] text-slate-500">Kiểm tra: thiếu mã hiệu, sai đơn vị tính, khối lượng ≤ 0, trùng hạng mục đã có.</p>
            </DialogBody>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setImp(null)}>Hủy</Button><Button disabled={!imp?.lines.length} onClick={doImport}>Nhập {imp?.lines.length ?? 0} dòng</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
