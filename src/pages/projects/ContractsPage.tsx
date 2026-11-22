import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Download, LayoutGrid, MoreHorizontal, Paperclip, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NumberInput } from "@/components/ui/number-input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { AttachmentList, FileUploader } from "@/components/common/Attachments";
import { deleteContract, saveContract } from "@/services/actions";
import { DEMO_TODAY, diffDays } from "@/utils/date";
import { fmtDate, fmtNumber, fmtVnd } from "@/utils/format";
import { genId } from "@/utils/id";
import { cn } from "@/utils/cn";
import type { Contract } from "@/types";
import { activeProjects } from "@/utils/labels";

type Validity = "con_han" | "sap_het" | "het_han";
const VALIDITY: Record<Validity, { label: string; color: string }> = {
  con_han: { label: "Còn hiệu lực", color: "bg-success" },
  sap_het: { label: "Sắp đến hạn", color: "bg-amber-500" },
  het_han: { label: "Hết hạn", color: "bg-rose-600" },
};
const validity = (c: Contract): Validity => { const d = diffDays(DEMO_TODAY, c.endDate); return d < 0 ? "het_han" : d <= 30 ? "sap_het" : "con_han"; };
const TABS = [{ k: "", l: "Tất cả" }, { k: "hop_dong", l: "Hợp đồng" }, { k: "phu_luc", l: "Phụ lục hợp đồng" }];

/** Quản lý hợp đồng: hợp đồng và phụ lục hợp đồng của các dự án */
export default function ContractsPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [tab, setTab] = useState("");
  const [projectId, setProjectId] = useState(() => new URLSearchParams(window.location.search).get("project") ?? "");
  const [quick, setQuick] = useState<"" | "sap_het">("");
  const [view, setView] = useState<string | null>(null);
  const [edit, setEdit] = useState<Contract | null>(null);
  const [overview, setOverview] = useState(false);
  const editable = can("project.edit");
  const pName = (id: string) => db.projects.find((p) => p.id === id)?.shortName ?? "";
  const children = (id: string) => db.contracts.filter((c) => c.parentId === id);
  const totalValue = (c: Contract) => (c.kind === "hop_dong" ? c.value + children(c.id).reduce((s, x) => s + x.value, 0) : c.value);
  const rows = useMemo(() => db.contracts
    .filter((c) => (!tab || c.kind === tab) && (!projectId || c.projectId === projectId) && (!quick || (c.kind === "hop_dong" && validity(c) === "sap_het")))
    .sort((a, b) => a.projectId.localeCompare(b.projectId) || (a.parentId ?? a.id).localeCompare(b.parentId ?? b.id) || Number(a.kind === "phu_luc") - Number(b.kind === "phu_luc") || a.signDate.localeCompare(b.signDate)), [db.contracts, tab, projectId, quick]);
  const mains = db.contracts.filter((c) => c.kind === "hop_dong");
  const stats = { count: mains.length, pl: db.contracts.length - mains.length, value: db.contracts.reduce((s, c) => s + c.value, 0), soon: mains.filter((c) => validity(c) === "sap_het").length };
  const cur = db.contracts.find((c) => c.id === view);

  const blank = (): Contract => ({ id: "", code: "", kind: "hop_dong", projectId: projectId || db.projects[0].id, parentId: null, title: "", signDate: DEMO_TODAY, value: 0, startDate: DEMO_TODAY, endDate: DEMO_TODAY, files: [], note: "" });
  const save = () => {
    if (!edit) return;
    if (!edit.code.trim() || !edit.title.trim()) return toast.error("Nhập số và nội dung hợp đồng / phụ lục");
    if (edit.kind === "phu_luc" && !edit.parentId) return toast.error("Chọn hợp đồng mà phụ lục thuộc về");
    if (edit.endDate < edit.startDate) return toast.error("Thời gian kết thúc phải sau thời gian bắt đầu");
    const isNew = !edit.id;
    run(saveContract, { ...edit, id: edit.id || genId("hd") });
    toast.success(isNew ? (edit.kind === "phu_luc" ? "Đã thêm phụ lục – giá trị hợp đồng của dự án được cộng dồn" : "Đã thêm hợp đồng") : "Đã cập nhật");
    setEdit(null);
  };
  const del = async (c: Contract) => {
    if (await confirm({ title: `Xóa ${c.kind === "hop_dong" ? "hợp đồng" : "phụ lục"} ${c.code}?`, description: c.kind === "hop_dong" && children(c.id).length ? `Các phụ lục (${children(c.id).length}) của hợp đồng cũng bị xóa.` : undefined, destructive: true, confirmText: "Xóa" })) {
      run(deleteContract, c.id);
      setView(null);
      toast.success("Đã xóa");
    }
  };
  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows.map((c) => ({ "Số": c.code, "Loại": c.kind === "hop_dong" ? "Hợp đồng" : "Phụ lục", "Dự án": pName(c.projectId), "Nội dung": c.title, "Ngày ký": c.signDate, "Giá trị (đ)": totalValue(c), "Từ ngày": c.startDate, "Đến ngày": c.endDate })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Hop dong"); XLSX.writeFile(wb, "Quan-ly-hop-dong.xlsx");
    toast.success(`Đã xuất ${rows.length} dòng`);
  };

  const cols: Column<Contract>[] = [
    { key: "code", header: "Số hợp đồng / phụ lục", sortValue: (c) => c.code, cell: (c) => <div><div className="whitespace-nowrap font-semibold">{c.code}</div><div className="text-[12px] text-slate-500">Ký {fmtDate(c.signDate)}</div></div> },
    { key: "kind", header: "Loại", filterValue: (c) => (c.kind === "hop_dong" ? "Hợp đồng" : "Phụ lục"), cell: (c) => <span className={cn("whitespace-nowrap rounded px-2 py-0.5 text-[12px] font-medium", c.kind === "hop_dong" ? "bg-primary-soft text-primary" : "bg-slate-100 text-slate-700")}>{c.kind === "hop_dong" ? "Hợp đồng" : "Phụ lục"}</span> },
    { key: "proj", header: "Dự án", sortValue: (c) => pName(c.projectId), cell: (c) => <span className="whitespace-nowrap">{pName(c.projectId)}</span> },
    { key: "title", header: "Nội dung", cell: (c) => <div className="max-w-[340px] truncate" title={c.title}>{c.title}</div>, filter: "text", filterValue: (c) => c.title },
    { key: "val", header: "Giá trị (tỷ)", align: "right", sortValue: totalValue, filter: false, cell: (c) => <span className={cn("font-semibold", c.kind === "phu_luc" && c.value > 0 && "text-success-fg")}>{c.kind === "phu_luc" && c.value > 0 ? "+" : ""}{fmtNumber(totalValue(c) / 1e9, 2)}</span> },
    { key: "time", header: "Thời gian thực hiện", sortValue: (c) => c.endDate, filterValue: (c) => c.endDate, cell: (c) => <span className="whitespace-nowrap">{fmtDate(c.startDate)} – {fmtDate(c.endDate)}</span> },
    { key: "st", header: "Hiệu lực", sortValue: (c) => validity(c), filterValue: (c) => VALIDITY[validity(c)].label, cell: (c) => <span className="flex items-center gap-2 whitespace-nowrap"><span className={cn("h-3 w-1.5 rounded-sm", VALIDITY[validity(c)].color)} />{VALIDITY[validity(c)].label}</span> },
    { key: "f", header: "File", align: "center", filter: false, cell: (c) => (c.files.length ? <span className="inline-flex items-center gap-0.5 text-slate-600"><Paperclip className="h-3.5 w-3.5" />{c.files.length}</span> : <span className="text-slate-300">—</span>) },
  ];

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Quản lý hợp đồng</h1>
        <div className="flex items-center gap-2">
          {editable && <Button size="lg" onClick={() => setEdit(blank())}><Plus /> Thêm hợp đồng</Button>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Thao tác khác"><MoreHorizontal /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.info("Chọn file Excel hợp đồng theo mẫu để nhập (mô phỏng)")}><Upload /> Import</DropdownMenuItem>
              <DropdownMenuItem onClick={exportXlsx}><Download /> Export</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mb-4 flex gap-6 border-b">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={cn("-mb-px border-b-2 px-1 py-2.5 text-[13.5px] font-semibold uppercase tracking-wide", tab === t.k ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800")}>{t.l}</button>
        ))}
      </div>
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(c) => c.id} loading={loading} pageSize={30} onRowClick={(c) => setView(c.id)} resetKey={tab + projectId + quick}
          searchText={(c) => `${c.code} ${c.title} ${pName(c.projectId)}`} searchPlaceholder="Tìm số hợp đồng, nội dung, dự án..."
          toolbar={<>
            <FilterSelect value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />
            {quick && <Button size="sm" variant="outline" className="border-amber-300 bg-amber-50 text-amber-800" onClick={() => setQuick("")}>Đang lọc: sắp đến hạn ✕</Button>}
            <Button variant="outline" className="h-10 border-primary/40 bg-primary-soft text-primary hover:bg-primary-soft/70" onClick={() => setOverview(true)}><LayoutGrid /> Tổng quan <span className="rounded-full bg-rose-100 px-2 text-[12px] font-semibold text-rose-600">{stats.count}</span></Button>
          </>} />
      </Card>

      {/* Tổng quan */}
      <Sheet open={overview} onOpenChange={setOverview}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader><SheetTitle className="text-lg">Tổng quan</SheetTitle></SheetHeader>
          <SheetBody className="space-y-3 bg-slate-50">
            {[
              { l: "Tổng số hợp đồng", v: `${stats.count} hợp đồng`, s: `${stats.pl} phụ lục`, on: () => { setTab("hop_dong"); setQuick(""); } },
              { l: "Tổng giá trị hợp đồng", v: `${fmtNumber(stats.value / 1e9, 1)} tỷ đồng`, s: "Đã cộng dồn giá trị các phụ lục", on: () => { setTab(""); setQuick(""); } },
              { l: "Hợp đồng sắp đến hạn", v: `${stats.soon} hợp đồng`, s: "Còn ≤ 30 ngày thực hiện", red: stats.soon > 0, on: () => { setTab(""); setQuick("sap_het"); } },
            ].map((x) => (
              <button key={x.l} onClick={() => { x.on(); setOverview(false); }} className="flex w-full items-center justify-between rounded-xl border border-primary/30 bg-white px-5 py-4 text-left hover:border-primary hover:shadow-sm">
                <div><div className="text-[14px] text-slate-600">{x.l}</div><div className={cn("mt-1 text-[22px] font-bold", x.red ? "text-rose-600" : "text-slate-900")}>{x.v}</div><div className="text-xs text-slate-500">{x.s}</div></div>
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </button>
            ))}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Chi tiết */}
      <Sheet open={!!cur} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="sm:max-w-2xl">
          {cur && <>
            <SheetHeader><SheetTitle>{cur.kind === "hop_dong" ? "Hợp đồng" : "Phụ lục"} {cur.code}</SheetTitle><p className="text-xs text-slate-500">{db.projects.find((p) => p.id === cur.projectId)?.name}</p></SheetHeader>
            <SheetBody className="space-y-5">
              <dl className="grid gap-3 text-[13.5px] sm:grid-cols-2">
                {[["Nội dung", cur.title], ["Ngày ký", fmtDate(cur.signDate)], [cur.kind === "hop_dong" ? "Giá trị hợp đồng" : "Giá trị điều chỉnh", `${cur.value > 0 && cur.kind === "phu_luc" ? "+" : ""}${fmtVnd(cur.value)} đ`], ...(cur.kind === "hop_dong" && children(cur.id).length ? [["Giá trị sau phụ lục", `${fmtVnd(totalValue(cur))} đ`]] : []), ["Thời gian thực hiện", `${fmtDate(cur.startDate)} – ${fmtDate(cur.endDate)}`], ["Hiệu lực", VALIDITY[validity(cur)].label], ...(cur.note ? [["Ghi chú", cur.note]] : [])].map(([k, v]) => <div key={k} className={k === "Nội dung" ? "sm:col-span-2" : ""}><dt className="text-[12px] text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}
              </dl>
              {(() => {
                const root = cur.kind === "hop_dong" ? cur : db.contracts.find((c) => c.id === cur.parentId);
                if (!root) return null;
                const family = [root, ...children(root.id).sort((x, y) => x.signDate.localeCompare(y.signDate))];
                return (
                  <section>
                    <div className="mb-2 flex items-center justify-between"><h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">Hợp đồng & phụ lục liên quan ({family.length})</h4>{editable && <Button size="xs" variant="soft" onClick={() => { setEdit({ ...blank(), kind: "phu_luc", projectId: root.projectId, parentId: root.id, endDate: root.endDate }); setView(null); }}><Plus /> Thêm phụ lục</Button>}</div>
                    <div className="divide-y rounded-lg border">
                      {family.map((a) => (
                        <button key={a.id} onClick={() => setView(a.id)} className={cn("flex w-full items-start gap-3 px-3 py-2.5 text-left text-[13px] hover:bg-slate-50", a.id === cur.id && "bg-primary-soft/60")}>
                          <span className={cn("mt-0.5 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium", a.kind === "hop_dong" ? "bg-primary-soft text-primary" : "bg-slate-100 text-slate-700")}>{a.kind === "hop_dong" ? "Hợp đồng" : "Phụ lục"}</span>
                          <div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{a.code}{a.id === cur.id && <span className="ml-2 text-[11px] font-normal text-primary">(đang xem)</span>}</div><div className="text-slate-700">{a.title}</div><div className="text-[11.5px] text-slate-500">Ký {fmtDate(a.signDate)}</div></div>
                          <div className="whitespace-nowrap font-semibold">{a.kind === "phu_luc" && a.value > 0 ? "+" : ""}{fmtVnd(a.value)} đ</div>
                          <ChevronRight className="mt-0.5 h-4 w-4 text-slate-400" />
                        </button>
                      ))}
                      <div className="flex justify-between bg-slate-50 px-3 py-2 text-[13px] font-semibold"><span>Giá trị sau các phụ lục</span><span>{fmtVnd(totalValue(root))} đ</span></div>
                    </div>
                  </section>
                );
              })()}
              <section>
                <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">File đính kèm ({cur.files.length})</h4>
                <AttachmentList files={cur.files} />
              </section>
            </SheetBody>
            <SheetFooter>
              <Button variant="outline" className="mr-auto" onClick={() => navigate(`/projects/${cur.projectId}`)}>Mở dự án</Button>
              {editable && <><Button variant="outline" className="text-rose-600" onClick={() => del(cur)}><Trash2 /> Xóa</Button><Button onClick={() => { setEdit({ ...cur }); setView(null); }}><Pencil /> Cập nhật</Button></>}
            </SheetFooter>
          </>}
        </SheetContent>
      </Sheet>

      {/* Thêm / sửa */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Cập nhật" : "Thêm"} {edit?.kind === "phu_luc" ? "phụ lục hợp đồng" : "hợp đồng"}</DialogTitle></DialogHeader>
          {edit && (
            <DialogBody className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2">
              <FormField label="Dự án" required className="sm:col-span-2"><Select value={edit.projectId} onChange={(e) => setEdit({ ...edit, projectId: e.target.value, parentId: null })} options={activeProjects(db).map((p) => ({ value: p.id, label: `${p.code} – ${p.name}` }))} /></FormField>
              <FormField label="Hợp đồng / Phụ lục" required>
                <div className="flex rounded-md border p-0.5">
                  {(["hop_dong", "phu_luc"] as const).map((k) => <button key={k} type="button" onClick={() => setEdit({ ...edit, kind: k, parentId: k === "hop_dong" ? null : edit.parentId })} className={cn("flex-1 rounded px-3 py-1.5 text-[13px] font-medium", edit.kind === k ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50")}>{k === "hop_dong" ? "Hợp đồng" : "Phụ lục hợp đồng"}</button>)}
                </div>
              </FormField>
              {edit.kind === "phu_luc" ? (
                <FormField label="Thuộc hợp đồng" required><Select value={edit.parentId ?? ""} placeholder="— Chọn hợp đồng —" onChange={(e) => setEdit({ ...edit, parentId: e.target.value || null })} options={db.contracts.filter((c) => c.projectId === edit.projectId && c.kind === "hop_dong").map((c) => ({ value: c.id, label: `${c.code} – ${c.title}` }))} /></FormField>
              ) : <div />}
              <FormField label={edit.kind === "phu_luc" ? "Số phụ lục" : "Số hợp đồng"} required><Input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></FormField>
              <FormField label="Ngày ký"><Input type="date" value={edit.signDate} onChange={(e) => setEdit({ ...edit, signDate: e.target.value })} /></FormField>
              <FormField label="Nội dung" required className="sm:col-span-2"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder={edit.kind === "phu_luc" ? "VD: Bổ sung khối lượng BTXM M350 sân đỗ zone A2" : "VD: Hợp đồng thi công kết cấu khu bay"} /></FormField>
              <FormField label={edit.kind === "phu_luc" ? "Giá trị điều chỉnh (VNĐ, có thể âm)" : "Giá trị hợp đồng (VNĐ)"} hint={edit.kind === "phu_luc" ? "Cộng dồn vào giá trị hợp đồng của dự án" : undefined}><NumberInput value={edit.value} allowNegative={edit.kind === "phu_luc"} onChange={(v) => setEdit({ ...edit, value: v })} /></FormField>
              <div />
              <FormField label="Thời gian thực hiện – từ ngày"><Input type="date" value={edit.startDate} onChange={(e) => setEdit({ ...edit, startDate: e.target.value })} /></FormField>
              <FormField label="Đến ngày"><Input type="date" value={edit.endDate} onChange={(e) => setEdit({ ...edit, endDate: e.target.value })} /></FormField>
              <FormField label="Ghi chú" className="sm:col-span-2"><Textarea rows={2} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></FormField>
              <FormField label="File đính kèm" className="sm:col-span-2"><FileUploader value={edit.files} onChange={(files) => setEdit({ ...edit, files })} hint="Bản ký, phụ lục scan, PDF…" /></FormField>
            </DialogBody>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={save}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
