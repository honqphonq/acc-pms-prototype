import { useRef, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet, FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterSelect } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { deleteRow, saveRow } from "@/services/actions";
import { COST_KEYS, COST_LABEL, contractTotal, estimateByCostKey } from "@/services/selectors";
import { activeProjects } from "@/utils/labels";
import { fmtDate, fmtNumber, fmtVnd } from "@/utils/format";
import { DEMO_TODAY, endOfMonth } from "@/utils/date";
import { genId } from "@/utils/id";
import { num, parseDateCell, readXlsx, writeXlsx } from "@/utils/xlsx";
import { cn } from "@/utils/cn";
import type { CostDoc } from "@/types";

const HEAD = ["Số chứng từ", "Ngày (dd/mm/yyyy)", "Diễn giải", "NVLTT", "NCTT", "CPMTC", "CPSXC", "Thuế GTGT đầu vào"];
const ty = (v: number) => `${fmtNumber(v / 1e9, 2)} tỷ`;
const cong = (d: Pick<CostDoc, "nvl" | "nc" | "mtc" | "sxc">) => d.nvl + d.nc + d.mtc + d.sxc;

/** Chi phí tập hợp: chứng từ chi phí theo dự án / tháng (nhập tay hoặc import từ phần mềm kế toán), cộng tháng & lũy kế */
export default function CostsPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const confirm = useConfirm();
  const [projectId, setProjectId] = useQueryParam("project");
  const pid = projectId || "p01";
  const months = [...new Set(db.costDocs.filter((d) => d.projectId === pid).map((d) => d.date.slice(0, 7)))].sort().reverse();
  const [month, setMonth] = useState(DEMO_TODAY.slice(0, 7));
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Partial<CostDoc> | null>(null);
  const [imp, setImp] = useState<{ file: string; docs: CostDoc[]; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = can("payment.edit");
  const project = db.projects.find((p) => p.id === pid);
  const all = db.costDocs.filter((d) => d.projectId === pid).sort((a, b) => a.date.localeCompare(b.date) || a.docNo.localeCompare(b.docNo));
  const kw = q.trim().toLowerCase();
  const rows = all.filter((d) => (!month || d.date.slice(0, 7) === month) && (!kw || `${d.docNo} ${d.description}`.toLowerCase().includes(kw)));
  const cum = month ? all.filter((d) => d.date <= endOfMonth(month)) : all;
  const tot = (list: CostDoc[]) => ({ nvl: list.reduce((s, d) => s + d.nvl, 0), nc: list.reduce((s, d) => s + d.nc, 0), mtc: list.reduce((s, d) => s + d.mtc, 0), sxc: list.reduce((s, d) => s + d.sxc, 0), vat: list.reduce((s, d) => s + d.vat, 0) });
  const tMonth = tot(rows), tCum = tot(cum);
  const est = db.estimates.find((e) => e.projectId === pid);
  const plan = est ? estimateByCostKey(est) : null;
  const gthd = contractTotal(db, pid);
  const mLabel = (m: string) => `Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}`;

  const exportXlsx = () => {
    const r: (string | number)[][] = [["BẢNG TỔNG HỢP CHI PHÍ SẢN XUẤT KINH DOANH"], [`Công trình: ${project?.name}`], [month ? mLabel(month) : "Tất cả các tháng"], [`GTHĐ: ${Math.round(gthd)}`], [], ["TT", "Số", "Ngày", "Diễn giải", "NVLTT", "NCTT", "CPMTC", "CPSXC", "Cộng", "Thuế GTGT đầu vào", "Tổng cộng"]];
    rows.forEach((d, i) => r.push([i + 1, d.docNo, fmtDate(d.date), d.description, d.nvl, d.nc, d.mtc, d.sxc, cong(d), d.vat, cong(d) + d.vat]));
    r.push(["", "", "", "*Cộng tháng này", tMonth.nvl, tMonth.nc, tMonth.mtc, tMonth.sxc, cong(tMonth), tMonth.vat, cong(tMonth) + tMonth.vat]);
    r.push(["", "", "", "*Lũy kế đến cuối tháng", tCum.nvl, tCum.nc, tCum.mtc, tCum.sxc, cong(tCum), tCum.vat, cong(tCum) + tCum.vat]);
    r.push([], ["", "NGƯỜI LẬP", "", "CHT CÔNG TRÌNH", "", "PHÒNG TÀI CHÍNH - KẾ TOÁN", "", "", "PHÓ TỔNG GIÁM ĐỐC"]);
    writeXlsx(`Chi-phi-SXKD_${project?.shortName ?? pid}_${month || "tat-ca"}.xlsx`, "Chi phí SXKD", r, [5, 12, 11, 46, 15, 15, 15, 15, 16, 15, 16]);
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const data = await readXlsx(f);
      const errors: string[] = [];
      const docs: CostDoc[] = [];
      const seen = new Set(all.map((d) => d.docNo));
      data.slice(1).forEach((r, i) => {
        const [no, date, desc, nvl, nc, mtc, sxc, vat] = r;
        if (!no && !desc) return;
        const iso = parseDateCell(date);
        const e: string[] = [];
        if (!no) e.push("thiếu số chứng từ");
        else if (seen.has(String(no).trim())) e.push("trùng số chứng từ đã có");
        if (!iso) e.push("ngày không hợp lệ");
        const v = [nvl, nc, mtc, sxc].map((x) => (x === "" ? 0 : num(x)));
        if (v.some((x) => isNaN(x))) e.push("số tiền không hợp lệ");
        else if (!v.some((x) => x > 0)) e.push("chưa có số tiền ở 4 khoản mục");
        if (e.length) return errors.push(`Dòng ${i + 2} – ${no || desc}: ${e.join("; ")}`);
        seen.add(String(no).trim());
        docs.push({ id: genId("cd"), projectId: pid, docNo: String(no).trim(), date: iso!, description: String(desc ?? ""), nvl: v[0], nc: v[1], mtc: v[2], sxc: v[3], vat: vat === "" ? 0 : num(vat) || 0 });
      });
      setImp({ file: f.name, docs, errors });
    } catch {
      toast.error("Không đọc được file Excel");
    }
  };
  const saveDoc = () => {
    if (!edit) return;
    if (!edit.docNo?.trim() || !edit.date) return toast.error("Nhập số và ngày chứng từ");
    if (all.some((d) => d.docNo === edit.docNo!.trim() && d.id !== edit.id)) return toast.error("Số chứng từ đã tồn tại");
    const d: CostDoc = { id: edit.id ?? genId("cd"), projectId: pid, docNo: edit.docNo.trim(), date: edit.date, description: edit.description ?? "", nvl: Number(edit.nvl) || 0, nc: Number(edit.nc) || 0, mtc: Number(edit.mtc) || 0, sxc: Number(edit.sxc) || 0, vat: Number(edit.vat) || 0 };
    if (!cong(d)) return toast.error("Nhập số tiền ít nhất 1 khoản mục");
    run(saveRow, "costDocs", d);
    toast.success(edit.id ? "Đã cập nhật chứng từ" : "Đã thêm chứng từ");
    setEdit(null);
  };
  const th = "px-2 py-2 text-[11.5px] font-bold uppercase text-slate-700";
  const money = "tabular px-2 py-1.5 text-right";

  return (
    <div>
      <PageHeader title="Chi phí tập hợp" actions={<>
        <Button variant="outline" onClick={() => writeXlsx("Mau-import-chi-phi.xlsx", "Chứng từ", [HEAD, ["PX11/001", "05/11/2026", "Xuất kho đá dăm cho thi công móng CPĐD", 1250000000, 0, 0, 0, 100000000], ["BL11/001", "10/11/2026", "Tiền lương công nhân trực tiếp tháng 11", 0, 420000000, 0, 0, 0]], [14, 16, 46, 15, 15, 15, 15, 18])}><FileSpreadsheet /> Tải file mẫu</Button>
        {editable && <Button variant="outline" onClick={() => fileRef.current?.click()}><FileUp /> Import Excel</Button>}
        <Button variant="outline" onClick={exportXlsx}><Download /> Export</Button>
        {editable && <Button onClick={() => setEdit({ date: DEMO_TODAY })}><Plus /> Thêm chứng từ</Button>}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </>} />

      <Card className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
        <FilterSelect label="Dự án" value={pid} onChange={(v) => setProjectId(v || "p01")} allLabel="— Chọn dự án —" options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />
        <FilterSelect label="Tháng" value={month} onChange={setMonth} allLabel="Tất cả các tháng" options={months.map((m) => ({ value: m, label: mLabel(m) }))} />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm số chứng từ, diễn giải…" className="h-10 w-64" />
        <span className="ml-auto text-[12.5px] text-slate-500">GTHĐ <b className="text-slate-800">{ty(gthd)}</b> · nguồn số liệu: phần mềm kế toán (nhập tay / import)</span>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {COST_KEYS.map((k) => {
          const pct = plan && plan[k] ? tCum[k] / plan[k] : null;
          return (
            <Card key={k} className="px-4 py-3">
              <div className="flex items-center gap-1.5 text-[12px] text-slate-500"><span className="h-2 w-2 rounded-sm" style={{ background: COST_LABEL[k].color }} />{COST_LABEL[k].label}</div>
              <div className="mt-1 text-[19px] font-bold text-slate-900">{ty(tCum[k])}</div>
              <div className={cn("text-[11.5px]", pct !== null && pct > 1 ? "font-semibold text-rose-600" : "text-slate-400")}>{pct === null ? "Chưa có dự toán" : `${fmtNumber(pct * 100, 0)}% dự toán (${ty(plan![k])})`}{pct !== null && pct > 1 && " – vượt dự toán"}</div>
            </Card>
          );
        })}
        <Card className="border-primary/30 bg-primary-soft/40 px-4 py-3">
          <div className="text-[12px] text-slate-500">Tổng chi phí lũy kế{month ? ` đến ${mLabel(month).toLowerCase()}` : ""}</div>
          <div className="mt-1 text-[19px] font-bold text-slate-900">{ty(cong(tCum))}</div>
          <div className="text-[11.5px] text-slate-400">{fmtNumber(gthd ? (cong(tCum) / gthd) * 100 : 0, 1)}% giá trị hợp đồng</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-4 py-2.5 text-center">
          <div className="text-[14px] font-bold uppercase text-slate-800">Bảng tổng hợp chi phí sản xuất kinh doanh</div>
          <div className="text-[12.5px] text-slate-500">{project?.name} · {month ? mLabel(month) : "Tất cả các tháng"} · đơn vị tính: đồng</div>
        </div>
        <div className="scrollbar-visible max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[1200px] text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-slate-100">
              <tr className="border-b"><th colSpan={3} className={cn(th, "text-center")}>Chứng từ</th><th rowSpan={2} className={cn(th, "text-left")}>Diễn giải</th><th colSpan={5} className={cn(th, "border-l text-center")}>Chi phí thực tế phát sinh</th><th rowSpan={2} className={cn(th, "border-l text-right")}>Thuế GTGT đầu vào</th><th rowSpan={2} className={cn(th, "text-right")}>Tổng cộng</th><th rowSpan={2} className="w-16" /></tr>
              <tr className="border-b"><th className={cn(th, "w-10")}>TT</th><th className={cn(th, "text-left")}>Số</th><th className={cn(th, "text-left")}>Ngày</th>{["NVLTT", "NCTT", "CPMTC", "CPSXC", "Cộng"].map((h, i) => <th key={h} className={cn(th, "text-right", i === 0 && "border-l")}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((d, i) => (
                <tr key={d.id} className="group border-b border-slate-100 hover:bg-amber-50/50">
                  <td className="px-2 py-1.5 text-center text-slate-500">{i + 1}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-medium">{d.docNo}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{fmtDate(d.date)}</td>
                  <td className="max-w-[360px] px-2 py-1.5 text-slate-700">{d.description}</td>
                  <td className={cn(money, "border-l")}>{d.nvl ? fmtVnd(d.nvl) : ""}</td><td className={money}>{d.nc ? fmtVnd(d.nc) : ""}</td><td className={money}>{d.mtc ? fmtVnd(d.mtc) : ""}</td><td className={money}>{d.sxc ? fmtVnd(d.sxc) : ""}</td>
                  <td className={cn(money, "font-semibold")}>{fmtVnd(cong(d))}</td>
                  <td className={cn(money, "border-l")}>{d.vat ? fmtVnd(d.vat) : ""}</td>
                  <td className={cn(money, "font-semibold")}>{fmtVnd(cong(d) + d.vat)}</td>
                  <td className="whitespace-nowrap px-1 text-right">{editable && <span className="opacity-0 group-hover:opacity-100"><Button size="icon-sm" variant="ghost" onClick={() => setEdit({ ...d })}><Pencil /></Button><Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (await confirm({ title: `Xóa chứng từ ${d.docNo}?`, destructive: true, confirmText: "Xóa" })) { run(deleteRow, "costDocs", d.id); toast.success("Đã xóa chứng từ"); } }}><Trash2 /></Button></span>}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={12} className="py-8 text-center text-slate-400">Không có chứng từ</td></tr>}
            </tbody>
            <tfoot className="sticky bottom-0 bg-slate-50 font-semibold">
              {[[month ? "*Cộng tháng này" : "*Cộng", tMonth], ["*Lũy kế đến cuối tháng", tCum]].map(([l, t]) => { const x = t as ReturnType<typeof tot>; return (
                <tr key={String(l)} className="border-t"><td colSpan={4} className="px-2 py-2 italic">{String(l)}</td><td className={cn(money, "border-l")}>{fmtVnd(x.nvl)}</td><td className={money}>{fmtVnd(x.nc)}</td><td className={money}>{fmtVnd(x.mtc)}</td><td className={money}>{fmtVnd(x.sxc)}</td><td className={money}>{fmtVnd(cong(x))}</td><td className={cn(money, "border-l")}>{fmtVnd(x.vat)}</td><td className={money}>{fmtVnd(cong(x) + x.vat)}</td><td /></tr>
              ); })}
            </tfoot>
          </table>
        </div>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? `Cập nhật chứng từ ${edit.docNo}` : "Thêm chứng từ chi phí"}</DialogTitle><DialogDescription>{project?.name}</DialogDescription></DialogHeader>
          {edit && (
            <DialogBody className="grid gap-3 sm:grid-cols-4">
              <FormField label="Số chứng từ" required><Input value={edit.docNo ?? ""} onChange={(e) => setEdit({ ...edit, docNo: e.target.value })} placeholder="PX11/001" /></FormField>
              <FormField label="Ngày" required><Input type="date" value={edit.date ?? ""} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></FormField>
              <FormField label="Diễn giải" className="sm:col-span-2"><Input value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></FormField>
              {COST_KEYS.map((k) => <FormField key={k} label={COST_LABEL[k].short}><Input type="number" value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: Number(e.target.value) })} /></FormField>)}
              <FormField label="Thuế GTGT đầu vào"><Input type="number" value={edit.vat ?? ""} onChange={(e) => setEdit({ ...edit, vat: Number(e.target.value) })} /></FormField>
              <div className="flex items-end pb-2 text-[13px] text-slate-600 sm:col-span-3">Cộng: <b className="ml-1 text-slate-900">{fmtVnd((Number(edit.nvl) || 0) + (Number(edit.nc) || 0) + (Number(edit.mtc) || 0) + (Number(edit.sxc) || 0))} đ</b></div>
            </DialogBody>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={saveDoc}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!imp} onOpenChange={(o) => !o && setImp(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Kiểm tra dữ liệu import</DialogTitle><DialogDescription>{imp?.file}</DialogDescription></DialogHeader>
          {imp && (
            <DialogBody className="space-y-3">
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">{imp.docs.length} chứng từ hợp lệ · tổng {fmtVnd(imp.docs.reduce((s, d) => s + cong(d), 0))} đ sẽ được thêm vào {project?.shortName}.</div>
              {imp.errors.length > 0 && <div className="rounded-md bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700"><div className="mb-1 flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4" /> {imp.errors.length} dòng lỗi, sẽ bỏ qua:</div><ul className="list-disc space-y-0.5 pl-5">{imp.errors.slice(0, 12).map((e) => <li key={e}>{e}</li>)}</ul></div>}
            </DialogBody>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setImp(null)}>Hủy</Button><Button disabled={!imp?.docs.length} onClick={() => { imp!.docs.forEach((d) => run(saveRow, "costDocs", d)); toast.success(`Đã nhập ${imp!.docs.length} chứng từ`); setImp(null); }}>Nhập {imp?.docs.length ?? 0} chứng từ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
