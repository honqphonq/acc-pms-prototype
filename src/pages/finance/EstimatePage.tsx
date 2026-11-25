import { useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Download, FileSpreadsheet, FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterSelect } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { EmptyState } from "@/components/common/EmptyState";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { saveRow, deleteRow } from "@/services/actions";
import { estimateNodeTotal, estimateTotal, estLineAmount } from "@/services/selectors";
import { activeProjects } from "@/utils/labels";
import { fmtNumber, fmtVnd } from "@/utils/format";
import { DEMO_TODAY } from "@/utils/date";
import { genId } from "@/utils/id";
import { readXlsx, writeXlsx, num } from "@/utils/xlsx";
import { cn } from "@/utils/cn";
import type { Estimate, EstimateLine } from "@/types";

const UNITS = ["m³", "m²", "m", "km", "tấn", "kg", "100m³", "100m²", "100m", "1000m³", "cái", "bộ", "gói", "công", "ca", "cây", "cọc", "hố", "điểm", "lít", "md", "tạ", "chiếc"];
const normUnit = (u: string) => u.trim().replace(/m3$/i, "m³").replace(/m2$/i, "m²");
const HEAD = ["STT", "Mã số", "Tên công tác", "Đơn vị", "Khối lượng", "Đơn giá (đ)", "Thành tiền (đ)"];
const ty = (v: number) => `${fmtNumber(v / 1e9, 2)} tỷ`;
const LEVEL_LABEL = { 1: "Hạng mục", 2: "Phần", 3: "Công tác" } as const;

/** Đánh lại STT 1 / 1.1 / 1.1.1 theo thứ tự và cấp của các dòng */
function renumber(lines: EstimateLine[]): EstimateLine[] {
  const c = [0, 0, 0];
  return lines.map((l) => {
    const i = l.level - 1;
    c[i]++;
    for (let k = i + 1; k < 3; k++) c[k] = 0;
    return { ...l, stt: c.slice(0, l.level).map((x) => x || 1).join(".") };
  });
}

/** Dự toán thi công theo mẫu bảng dự toán: STT phân cấp hạng mục → phần → công tác; KL × đơn giá tổng hợp = thành tiền */
export default function EstimatePage() {
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const confirm = useConfirm();
  const [projectId, setProjectId] = useQueryParam("project");
  const pid = projectId || "p01";
  const [q, setQ] = useState("");
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<(Partial<EstimateLine> & { parentId?: string }) | null>(null);
  const [imp, setImp] = useState<{ file: string; lines: EstimateLine[]; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = can("payment.edit") || can("project.edit");
  const project = db.projects.find((p) => p.id === pid);
  const est = db.estimates.find((e) => e.projectId === pid);
  const total = est ? estimateTotal(est) : 0;
  const all = est?.lines ?? [];
  const kw = q.trim().toLowerCase();
  const isHidden = (l: EstimateLine) => [...closed].some((s) => l.stt.startsWith(s + "."));
  const matchKw = (l: EstimateLine) => !kw || `${l.code} ${l.name}`.toLowerCase().includes(kw);
  const rows = kw ? all.filter((l) => l.level === 3 ? matchKw(l) : all.some((x) => x.level === 3 && x.stt.startsWith(l.stt + ".") && matchKw(x))) : all.filter((l) => !isHidden(l));
  const base = (): Estimate => est ?? { id: genId("dt"), code: `DT-${project?.code ?? pid}`, projectId: pid, name: `Dự toán thi công – ${project?.shortName}`, createdAt: DEMO_TODAY, createdById: user!.id, source: "Nhập tay", lines: [] };
  const save = (e: Estimate) => run(saveRow, "estimates", { ...e, lines: renumber(e.lines) });
  const toggle = (stt: string) => setClosed((s) => { const n = new Set(s); if (n.has(stt)) n.delete(stt); else n.add(stt); return n; });
  const parents = (lv: 2 | 3) => all.filter((l) => l.level === lv - 1);

  const exportXlsx = () => {
    if (!est) return;
    const r: (string | number)[][] = [["BẢNG DỰ TOÁN CHI TIẾT"], [`Công trình: ${project?.name}`], [], HEAD];
    est.lines.forEach((l) => r.push(l.level === 3 ? [l.stt, l.code, l.name, l.unit, l.qty, l.price, Math.round(estLineAmount(l))] : [l.stt, l.level === 1 ? "*" : "", l.name, "", "", "", Math.round(estimateNodeTotal(est, l.stt))]));
    r.push(["", "", "TỔNG CỘNG", "", "", "", Math.round(total)]);
    writeXlsx(`Du-toan_${project?.shortName ?? pid}.xlsx`, "Dự toán", r, [8, 12, 56, 9, 12, 15, 17]);
  };
  const template = () => writeXlsx("Mau-import-du-toan.xlsx", "Dự toán", [HEAD,
    ["1", "*", "Xây dựng mới khán đài", "", "", "", ""],
    ["1.1", "", "Phần kết cấu", "", "", "", ""],
    ["1.1.1", "AB.25113", "Đào móng công trình, chiều rộng móng <= 6m, bằng máy đào 0,8m3, đất cấp III (90% KL)", "100m3", 2.182, 2953556, 6444659],
    ["1.1.2", "AB.11443", "Đào móng cột, trụ, hố kiểm tra bằng thủ công, rộng > 1m, sâu > 1m, đất cấp III (10% KL)", "m3", 21.814, 447553, 9762915],
    ["1.1.3", "AB.65130", "Đắp đất công trình bằng đầm đất cầm tay 70kg, độ chặt yêu cầu K=0,95", "100m3", 0.808, 4259042, 3441306],
  ], [8, 12, 60, 9, 12, 14, 16]);

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const data = await readXlsx(f);
      const errors: string[] = [];
      const out: EstimateLine[] = [];
      const seen = new Set<string>();
      const start = data.findIndex((r) => String(r[0]).trim().toUpperCase() === "STT");
      data.slice(start + 1).forEach((r, i) => {
        const row = start + i + 2;
        const [sttRaw, code, name, unit, qty, price, amount] = r.map((c) => (typeof c === "string" ? c.trim() : c));
        const stt = String(sttRaw ?? "").trim().replace(/\.$/, "");
        if (!stt && !name) return;
        if (!/^\d+(\.\d+)*$/.test(stt)) return errors.push(`Dòng ${row}: STT “${sttRaw}” không đúng dạng 1 / 1.1 / 1.1.1`);
        if (seen.has(stt)) return errors.push(`Dòng ${row}: trùng STT ${stt}`);
        seen.add(stt);
        const level = Math.min(3, stt.split(".").length) as 1 | 2 | 3;
        if (level < 3) return out.push({ id: genId("el"), stt, level, code: level === 1 ? "*" : "", name: String(name || "(chưa đặt tên)"), unit: "", qty: 0, price: 0 });
        const e: string[] = [];
        const u = normUnit(String(unit ?? ""));
        if (!code) e.push("thiếu mã số");
        if (!UNITS.includes(u)) e.push(`đơn vị “${unit}” không hợp lệ`);
        if (!(num(qty) > 0)) e.push("khối lượng phải > 0");
        if (!(num(price) > 0)) e.push("đơn giá phải > 0");
        if (num(qty) > 0 && num(price) > 0 && amount !== "" && Math.abs(num(amount) - num(qty) * num(price)) > Math.max(2, num(qty) * num(price) * 0.001)) e.push(`thành tiền ${fmtVnd(num(amount))} ≠ KL × đơn giá (${fmtVnd(num(qty) * num(price))})`);
        if (e.length) return errors.push(`Dòng ${row} – ${stt} ${code || name}: ${e.join("; ")}`);
        out.push({ id: genId("el"), stt, level, code: String(code), name: String(name), unit: u, qty: num(qty), price: num(price) });
      });
      setImp({ file: f.name, lines: out, errors });
    } catch {
      toast.error("Không đọc được file Excel");
    }
  };
  const doImport = () => {
    if (!imp) return;
    run(saveRow, "estimates", { ...base(), source: `Excel (${imp.file})`, lines: imp.lines });
    toast.success(`Đã nhập ${imp.lines.length} dòng dự toán`);
    setImp(null);
  };
  const saveLine = () => {
    if (!edit) return;
    const level = (edit.level ?? 3) as 1 | 2 | 3;
    if (!edit.name?.trim()) return toast.error("Nhập tên");
    if (level === 3 && !edit.code?.trim()) return toast.error("Nhập mã số");
    if (level === 3 && !(Number(edit.qty) > 0)) return toast.error("Khối lượng phải > 0");
    if (level === 3 && !(Number(edit.price) > 0)) return toast.error("Đơn giá phải > 0");
    if (level > 1 && !edit.id && !edit.parentId) return toast.error(`Chọn ${level === 2 ? "hạng mục" : "phần"} chứa dòng này`);
    const b = base();
    const line: EstimateLine = { id: edit.id ?? genId("el"), stt: edit.stt ?? "", level, code: level === 1 ? "*" : level === 2 ? "" : edit.code!.trim(), name: edit.name.trim(), unit: level === 3 ? edit.unit || "m³" : "", qty: level === 3 ? Number(edit.qty) : 0, price: level === 3 ? Number(edit.price) : 0 };
    let lines: EstimateLine[];
    if (edit.id) lines = b.lines.map((l) => (l.id === edit.id ? line : l));
    else if (level === 1) lines = [...b.lines, line];
    else {
      const p = b.lines.find((l) => l.id === edit.parentId)!;
      const lastIdx = b.lines.reduce((k, l, i) => (l.id === p.id || l.stt.startsWith(p.stt + ".") ? i : k), -1);
      lines = [...b.lines.slice(0, lastIdx + 1), line, ...b.lines.slice(lastIdx + 1)];
    }
    save({ ...b, lines });
    toast.success(edit.id ? "Đã cập nhật" : `Đã thêm ${LEVEL_LABEL[level].toLowerCase()}`);
    setEdit(null);
  };
  const removeLine = async (l: EstimateLine) => {
    if (!est) return;
    const kids = est.lines.filter((x) => x.stt.startsWith(l.stt + ".")).length;
    if (await confirm({ title: `Xóa ${LEVEL_LABEL[l.level].toLowerCase()} ${l.stt}${kids ? ` và ${kids} dòng con` : ""}?`, destructive: true, confirmText: "Xóa" })) {
      save({ ...est, lines: est.lines.filter((x) => x.id !== l.id && !x.stt.startsWith(l.stt + ".")) });
      toast.success("Đã xóa");
    }
  };
  const th = "border-b border-r border-slate-300 px-2 py-2 text-[12px] font-bold text-slate-800";
  const td = "border-b border-r border-slate-200 px-2 py-1.5";
  const nItems = all.filter((l) => l.level === 3).length;

  return (
    <div>
      <PageHeader title="Dự toán thi công" actions={<>
        <Button variant="outline" onClick={template}><FileSpreadsheet /> Tải file mẫu</Button>
        {editable && <Button variant="outline" onClick={() => fileRef.current?.click()}><FileUp /> Import Excel</Button>}
        <Button variant="outline" disabled={!est} onClick={exportXlsx}><Download /> Export</Button>
        {editable && <Button onClick={() => setEdit({ level: 3, unit: "m³", parentId: parents(3).pop()?.id })}><Plus /> Thêm dòng</Button>}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </>} />

      <Card className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
        <FilterSelect label="Dự án" value={pid} onChange={(v) => setProjectId(v || "p01")} allLabel="— Chọn dự án —" options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã số, tên công tác…" className="h-10 w-64" />
        {est && <span className="ml-auto text-[12px] text-slate-500">{est.code} · nguồn: {est.source}</span>}
        {est && editable && <Button size="sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (await confirm({ title: "Xóa toàn bộ dự toán của dự án?", destructive: true, confirmText: "Xóa" })) { run(deleteRow, "estimates", est.id); toast.success("Đã xóa dự toán"); } }}><Trash2 /> Xóa dự toán</Button>}
      </Card>

      {!est ? (
        <Card><EmptyState title="Dự án chưa có dự toán" description="Tải file mẫu, điền dự toán (hoặc xuất từ phần mềm dự toán) rồi Import Excel; hoặc thêm từng dòng." action={editable && <Button onClick={() => fileRef.current?.click()}><FileUp /> Import Excel</Button>} /></Card>
      ) : (
        <>
          <Card className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-2 border-primary/30 bg-primary-soft/40 px-5 py-4">
            <div><div className="text-[12.5px] text-slate-600">Tổng dự toán</div><div className="text-[26px] font-bold leading-tight text-slate-900">{ty(total)}</div><div className="text-[12px] text-slate-500">{fmtVnd(total)} đ · đơn giá tổng hợp đã gồm chi phí chung, thu nhập chịu thuế tính trước và VAT</div></div>
            <div className="text-[13px] text-slate-600"><b className="text-slate-900">{all.filter((l) => l.level === 1).length}</b> hạng mục · <b className="text-slate-900">{all.filter((l) => l.level === 2).length}</b> phần · <b className="text-slate-900">{nItems}</b> công tác</div>
          </Card>
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b px-4 py-2 text-[12.5px] text-slate-600">
              <span className="font-semibold uppercase tracking-wide text-slate-700">{project?.name}</span>
              <span className="ml-auto" />
              <Button size="xs" variant="ghost" onClick={() => setClosed(new Set())}><ChevronsUpDown /> Mở rộng tất cả</Button>
              <Button size="xs" variant="ghost" onClick={() => setClosed(new Set(all.filter((l) => l.level === 1).map((l) => l.stt)))}><ChevronsDownUp /> Thu gọn</Button>
            </div>
            <div className="scrollbar-visible max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[1000px] border-collapse text-[13px]">
                <thead className="sticky top-0 z-10 bg-slate-100">
                  <tr>
                    <th className={cn(th, "w-20")}>STT</th><th className={cn(th, "w-28")}>Mã số</th><th className={cn(th, "min-w-[380px]")}>Tên công tác</th><th className={cn(th, "w-20")}>Đơn vị</th>
                    <th className={cn(th, "w-28 bg-slate-200")}>Khối lượng</th><th className={cn(th, "w-32 bg-slate-200")}>Đơn giá (đ)</th><th className={cn(th, "w-36")}>Thành tiền (đ)</th>{editable && <th className="w-16 border-b border-slate-300" />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => {
                    const head = l.level < 3;
                    const open = !closed.has(l.stt);
                    return (
                      <tr key={l.id} className={cn("group", l.level === 1 && "bg-rose-50/40", l.level === 2 && "bg-slate-50", !head && "hover:bg-amber-50/50")}>
                        <td className={cn(td, "whitespace-nowrap text-center", l.level === 1 && "font-bold text-[#8B1A1A]", l.level === 2 && "font-semibold")}>{l.stt}</td>
                        <td className={cn(td, "whitespace-nowrap text-center", l.level === 1 && "font-bold text-[#8B1A1A]")}>{l.code}</td>
                        <td className={cn(td, l.level === 1 && "font-bold text-[#8B1A1A]", l.level === 2 && "font-semibold text-slate-800")}>
                          {head ? <button onClick={() => !kw && toggle(l.stt)} className="flex items-center gap-1 text-left">{!kw && (open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />)}{l.name}</button> : l.name}
                        </td>
                        <td className={cn(td, "text-center")}>{l.unit}</td>
                        <td className={cn(td, "tabular bg-slate-50/80 text-right")}>{head ? "" : fmtNumber(l.qty, 3)}</td>
                        <td className={cn(td, "tabular bg-slate-50/80 text-right")}>{head ? "" : fmtVnd(l.price)}</td>
                        <td className={cn(td, "tabular text-right", head ? "font-bold" : "font-medium", l.level === 1 && "text-[#8B1A1A]")}>{fmtVnd(head ? estimateNodeTotal(est, l.stt) : estLineAmount(l))}</td>
                        {editable && <td className="whitespace-nowrap border-b border-slate-200 px-1 text-right"><span className="opacity-0 group-hover:opacity-100">
                          {head && <Button size="icon-sm" variant="ghost" title={`Thêm ${l.level === 1 ? "phần" : "công tác"}`} onClick={() => setEdit({ level: (l.level + 1) as 2 | 3, unit: "m³", parentId: l.id })}><Plus /></Button>}
                          <Button size="icon-sm" variant="ghost" onClick={() => setEdit({ ...l })}><Pencil /></Button>
                          <Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => removeLine(l)}><Trash2 /></Button>
                        </span></td>}
                      </tr>
                    );
                  })}
                  {!rows.length && <tr><td colSpan={8} className="py-8 text-center text-slate-400">Không có dòng phù hợp</td></tr>}
                </tbody>
                <tfoot className="sticky bottom-0 bg-slate-100">
                  <tr className="text-[14px] font-bold text-slate-900"><td colSpan={6} className="border-t border-slate-300 px-2 py-2.5 text-right">TỔNG DỰ TOÁN</td><td className="tabular border-t border-slate-300 px-2 text-right">{fmtVnd(total)}</td>{editable && <td className="border-t border-slate-300" />}</tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? `Cập nhật ${LEVEL_LABEL[(edit.level ?? 3) as 1 | 2 | 3].toLowerCase()} ${edit.stt}` : "Thêm dòng dự toán"}</DialogTitle></DialogHeader>
          {edit && (
            <DialogBody className="grid gap-3 sm:grid-cols-3">
              {!edit.id && <FormField label="Loại dòng"><Select value={String(edit.level ?? 3)} onChange={(e) => { const lv = Number(e.target.value) as 1 | 2 | 3; setEdit({ ...edit, level: lv, parentId: lv === 1 ? undefined : parents(lv as 2 | 3).pop()?.id }); }} options={[{ value: "1", label: "Hạng mục (1)" }, { value: "2", label: "Phần (1.1)" }, { value: "3", label: "Công tác (1.1.1)" }]} /></FormField>}
              {!edit.id && (edit.level ?? 3) > 1 && <FormField label={(edit.level ?? 3) === 2 ? "Thuộc hạng mục" : "Thuộc phần"} required className="sm:col-span-2"><Select value={edit.parentId ?? ""} onChange={(e) => setEdit({ ...edit, parentId: e.target.value })} placeholder="— Chọn —" options={parents((edit.level ?? 3) as 2 | 3).map((p) => ({ value: p.id, label: `${p.stt}. ${p.name}` }))} /></FormField>}
              {(edit.level ?? 3) === 3 && <FormField label="Mã số" required><Input value={edit.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} placeholder="AB.25113" /></FormField>}
              <FormField label={(edit.level ?? 3) === 3 ? "Tên công tác" : "Tên"} required className={(edit.level ?? 3) === 3 ? "sm:col-span-2" : "sm:col-span-3"}><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></FormField>
              {(edit.level ?? 3) === 3 && <>
                <FormField label="Đơn vị"><Select value={edit.unit ?? "m³"} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} options={UNITS.map((u) => ({ value: u, label: u }))} /></FormField>
                <FormField label="Khối lượng" required><Input type="number" value={edit.qty ?? ""} onChange={(e) => setEdit({ ...edit, qty: Number(e.target.value) })} /></FormField>
                <FormField label="Đơn giá (đ)" required><Input type="number" value={edit.price ?? ""} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></FormField>
                <div className="rounded-md bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600 sm:col-span-3">Thành tiền: <b className="text-slate-900">{fmtVnd((Number(edit.qty) || 0) * (Number(edit.price) || 0))} đ</b></div>
              </>}
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
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">{imp.lines.length} dòng hợp lệ ({imp.lines.filter((l) => l.level === 3).length} công tác, tổng {fmtVnd(imp.lines.reduce((s, l) => s + estLineAmount(l), 0))} đ).{est && <b> Dự toán hiện có của {project?.shortName} sẽ được thay thế.</b>}</div>
              {imp.errors.length > 0 && <div className="rounded-md bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700"><div className="mb-1 flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4" /> {imp.errors.length} dòng bị lỗi, sẽ bỏ qua:</div><ul className="list-disc space-y-0.5 pl-5">{imp.errors.slice(0, 12).map((e) => <li key={e}>{e}</li>)}</ul></div>}
              <p className="text-[12px] text-slate-500">STT dạng 1 / 1.1 / 1.1.1 để nhận biết hạng mục, phần, công tác. Kiểm tra: thiếu mã số, sai đơn vị tính, khối lượng hoặc đơn giá ≤ 0, thành tiền lệch KL × đơn giá, trùng STT.</p>
            </DialogBody>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setImp(null)}>Hủy</Button><Button disabled={!imp?.lines.length} onClick={doImport}>Nhập {imp?.lines.length ?? 0} dòng</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
