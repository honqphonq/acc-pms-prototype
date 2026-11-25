import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Eye, Filter, MoreHorizontal, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { FormField } from "@/components/common/FormField";
import { KpiCard } from "@/components/common/KpiCard";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { deleteRow, saveRow } from "@/services/actions";
import { genId, nextCode } from "@/utils/id";
import { cn } from "@/utils/cn";
import { AttachmentList, FileUploader } from "@/components/common/Attachments";
import type { Attachment, CollectionKey, Database } from "@/types";

export type Opt = { value: string; label: string };
export interface FieldDef<T> {
  key: keyof T & string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "checkbox" | "files" | "custom";
  render?: (value: unknown, set: (v: unknown) => void, row: Record<string, unknown>, patch: (p: Record<string, unknown>) => void) => ReactNode;
  hideInDetail?: boolean;
  options?: Opt[] | ((db: Database) => Opt[]);
  required?: boolean;
  wide?: boolean;
  hint?: string;
}
export interface FilterDef<T> {
  label: string;
  options: Opt[] | ((db: Database) => Opt[]);
  test: (row: T, value: string) => boolean;
  initial?: string;
}
type Row = { id: string; code?: string };

interface Props<T extends Row> {
  title: string;
  description?: ReactNode;
  collection: CollectionKey;
  rows?: T[];
  columns: Column<T>[];
  fields: FieldDef<T>[];
  newRecord?: (db: Database) => Partial<T>;
  codePrefix?: string;
  filters?: FilterDef<T>[];
  kpis?: (rows: T[], db: Database) => { label: string; value: ReactNode; tone?: "primary" | "success" | "warning" | "danger" | "info" | "navy"; sub?: ReactNode }[];
  searchText: (row: T) => string;
  canEdit?: boolean;
  addLabel?: string;
  entityLabel?: string;
  detail?: (row: T, close: () => void) => ReactNode;
  /** Màn hình chi tiết riêng (popup lớn) thay cho khung chi tiết mặc định */
  detailView?: (row: T, ctx: { close: () => void; edit: () => void; remove: () => void }) => ReactNode;
  rowActions?: (row: T) => ReactNode;
  /** cho phép sửa / xóa từng dòng (mặc định theo canEdit) */
  canEditRow?: (row: T) => boolean;
  /** biến đổi bản ghi trước khi lưu (vd. ghi lịch sử hoạt động) */
  beforeSave?: (row: T, isNew: boolean, db: Database) => T;
  headerExtra?: ReactNode;
  above?: ReactNode;
  pageSize?: number;
  rowClassName?: (row: T) => string | undefined;
  /** số bộ lọc hiển thị trực tiếp trên thanh công cụ; các bộ lọc còn lại gom vào nút "Bộ lọc" */
  inlineFilters?: number;
  /** báo giá trị các bộ lọc ra ngoài (vd. để vẽ phần tổng hợp theo dự án đang lọc) */
  onFiltersChange?: (values: string[]) => void;
}

/** Màn hình danh mục dùng chung: danh sách, tìm kiếm, lọc, thêm / sửa / xem / xóa, import / export */
export function RegistryPage<T extends Row>(p: Props<T>) {
  const { db, run } = useDb();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [edit, setEdit] = useState<Partial<T> | null>(null);
  const [view, setView] = useState<string | null>(() => new URLSearchParams(window.location.search).get("id"));
  const [fv, setFv] = useState<string[]>(() => (p.filters ?? []).map((f) => f.initial ?? ""));
  const all = (p.rows ?? (db[p.collection] as unknown as T[])) as T[];
  const onFc = p.onFiltersChange;
  useEffect(() => { onFc?.(fv); }, [fv]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => all.filter((r) => (p.filters ?? []).every((f, i) => !fv[i] || f.test(r, fv[i]))), [all, fv, p.filters]);
  const viewing = all.find((r) => r.id === view);
  const opts = (o: FieldDef<T>["options"]) => (typeof o === "function" ? o(db) : o ?? []);
  const label = p.entityLabel ?? p.title.toLowerCase();

  const save = () => {
    if (!edit) return;
    const miss = p.fields.find((f) => f.required && (edit[f.key] === undefined || edit[f.key] === ""));
    if (miss) return toast.error(`Nhập “${miss.label}”`);
    const isNew = !edit.id;
    const row = { ...edit, id: edit.id ?? genId(p.collection.slice(0, 3)) } as T;
    if (isNew && p.codePrefix && !row.code) row.code = nextCode(p.codePrefix, all.map((r) => r.code ?? ""));
    run(saveRow, p.collection, (p.beforeSave ? p.beforeSave(row, isNew, db) : row) as never);
    toast.success(isNew ? `Đã thêm ${label}` : "Đã lưu thay đổi");
    setEdit(null);
  };
  const del = async (r: T) => {
    if (await confirm({ title: `Xóa ${label} ${r.code ?? ""}?`, destructive: true, confirmText: "Xóa" })) {
      run(deleteRow, p.collection, r.id);
      toast.success("Đã xóa");
      setView(null);
    }
  };
  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const data = rows.map((r) => Object.fromEntries(p.fields.filter((f) => f.type !== "files" && f.type !== "custom").map((f) => [f.label, f.type === "select" ? opts(f.options).find((o) => o.value === String(r[f.key as keyof T]))?.label ?? r[f.key as keyof T] : f.type === "checkbox" ? (r[f.key as keyof T] ? "Có" : "Không") : r[f.key as keyof T]])));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sach");
    XLSX.writeFile(wb, `${p.title}.xlsx`);
    toast.success(`Đã xuất ${rows.length} dòng ra Excel`);
  };

  const cols: Column<T>[] = [
    ...p.columns,
    {
      key: "__a", header: "", className: "w-px", cell: (r) => (
        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          {p.rowActions?.(r)}
          <Button size="icon-sm" variant="ghost" aria-label="Xem" onClick={() => setView(r.id)}><Eye /></Button>
          {p.canEdit !== false && (p.canEditRow?.(r) ?? true) && <Button size="icon-sm" variant="ghost" aria-label="Sửa" onClick={() => setEdit({ ...r })}><Pencil /></Button>}
          {p.canEdit !== false && (p.canEditRow?.(r) ?? true) && <Button size="icon-sm" variant="ghost" aria-label="Xóa" className="text-slate-400 hover:text-rose-600" onClick={() => del(r)}><Trash2 /></Button>}
        </div>
      ),
    },
  ];
  const kpis = p.kpis?.(all, db);

  const fieldValue = (r: T, f: FieldDef<T>): ReactNode => {
    const v = r[f.key as keyof T] as unknown;
    if (f.type === "select") return opts(f.options).find((o) => o.value === String(v))?.label ?? String(v ?? "—");
    if (f.type === "checkbox") return v ? "Có" : "Không";
    if (f.type === "files") return <AttachmentList files={(v as Attachment[]) ?? []} />;
    if (f.type === "number" && typeof v === "number") return v.toLocaleString("vi-VN");
    if (f.type === "date" && typeof v === "string" && v) return v.split("-").reverse().join("/");
    return v === undefined || v === null || v === "" ? "—" : String(v);
  };

  return (
    <div>
      <PageHeader title={p.title} description={p.description} actions={<>
        {p.headerExtra}
        {p.canEdit !== false && <Button size="lg" onClick={() => setEdit({ ...(p.newRecord?.(db) ?? {}) } as Partial<T>)}><Plus /> {p.addLabel ?? "Thêm mới"}</Button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Thao tác khác"><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toast.info("Chọn file Excel theo mẫu để nhập (mô phỏng)")}><Upload /> Import</DropdownMenuItem>
            <DropdownMenuItem onClick={exportXlsx}><Download /> Export</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>} />
      {kpis && <div className={cn("mb-4 grid grid-cols-2 gap-4", kpis.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>{kpis.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} tone={k.tone} sub={k.sub} />)}</div>}
      {p.above}
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(r) => r.id} loading={loading} searchText={p.searchText} pageSize={p.pageSize ?? 12} onRowClick={(r) => setView(r.id)} rowClassName={p.rowClassName} resetKey={fv.join("|")}
          toolbar={<>
            {p.filters?.slice(0, p.inlineFilters ?? p.filters.length).map((f, i) => <FilterSelect key={f.label} value={fv[i]} onChange={(v) => setFv((x) => x.map((y, k) => (k === i ? v : y)))} allLabel={f.label} options={opts(f.options)} />)}
            {p.inlineFilters !== undefined && (p.filters?.length ?? 0) > p.inlineFilters && (() => {
              const n = fv.slice(p.inlineFilters).filter(Boolean).length;
              return (
                <Popover>
                  <PopoverTrigger asChild><Button variant="outline" className={cn("h-10", n > 0 && "border-primary/40 bg-primary-soft text-primary")}><Filter /> Bộ lọc{n > 0 && ` (${n})`}</Button></PopoverTrigger>
                  <PopoverContent align="start" className="w-[340px] p-3">
                    <div className="max-h-[60vh] space-y-2.5 overflow-y-auto pr-1">
                      {p.filters!.slice(p.inlineFilters).map((f, j) => { const i = j + p.inlineFilters!; return (
                        <label key={f.label} className="flex items-center justify-between gap-3 text-[13px] text-slate-600"><span className="truncate">{f.label}</span>
                          <select value={fv[i]} onChange={(e) => { const v = e.target.value; setFv((x) => x.map((y, k) => (k === i ? v : y))); }} className="h-8 w-40 shrink-0 rounded-md border border-slate-300 bg-white px-2 text-[13px] text-slate-800"><option value="">Tất cả</option>{opts(f.options).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                        </label>
                      ); })}
                    </div>
                    <div className="mt-3 flex justify-end border-t pt-2"><Button size="xs" variant="ghost" disabled={!n} onClick={() => setFv((x) => x.map((y, k) => (k >= p.inlineFilters! ? "" : y)))}>Xóa bộ lọc</Button></div>
                  </PopoverContent>
                </Popover>
              );
            })()}
          </>} />
      </Card>

      {p.detailView && (
        <Dialog open={!!viewing} onOpenChange={(o) => !o && setView(null)}>
          <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
            <DialogTitle className="sr-only">Chi tiết {label}</DialogTitle>
            {viewing && p.detailView(viewing, { close: () => setView(null), edit: () => { setEdit({ ...viewing }); setView(null); }, remove: () => del(viewing) })}
          </DialogContent>
        </Dialog>
      )}
      <Sheet open={!!viewing && !p.detailView} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="sm:max-w-2xl">
          {viewing && <>
            <SheetHeader><SheetTitle>{viewing.code ? `${viewing.code} · ` : ""}Chi tiết {label}</SheetTitle></SheetHeader>
            <SheetBody>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {p.fields.filter((f) => !f.hideInDetail && f.type !== "custom").map((f) => (
                  <div key={f.key} className={cn(f.wide || f.type === "textarea" || f.type === "files" ? "sm:col-span-2" : "")}>
                    <dt className="text-[11.5px] text-slate-500">{f.label}</dt>
                    <dd className="mt-0.5 whitespace-pre-line text-[14px] font-medium text-slate-900">{fieldValue(viewing, f)}</dd>
                  </div>
                ))}
              </dl>
              {p.detail && <div className="mt-5">{p.detail(viewing, () => setView(null))}</div>}
            </SheetBody>
            {p.canEdit !== false && <SheetFooter><Button variant="outline" className="text-rose-600" onClick={() => del(viewing)}><Trash2 /> Xóa</Button><Button onClick={() => { setEdit({ ...viewing }); setView(null); }}><Pencil /> Cập nhật</Button></SheetFooter>}
          </>}
        </SheetContent>
      </Sheet>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? `Cập nhật ${label}` : p.addLabel ?? `Thêm ${label}`}</DialogTitle></DialogHeader>
          {edit && (
            <DialogBody className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2">
              {p.fields.map((f) => {
                const v = edit[f.key as keyof T] as unknown;
                const set = (x: unknown) => setEdit({ ...edit, [f.key]: x });
                return (
                  <FormField key={f.key} label={f.label} required={f.required} hint={f.hint} className={cn(f.wide || f.type === "textarea" || f.type === "files" || f.type === "custom" ? "sm:col-span-2" : "")}>
                    {f.type === "custom" && f.render ? f.render(v, set, edit as Record<string, unknown>, (x) => setEdit({ ...edit, ...x } as Partial<T>))
                      : f.type === "files" ? <FileUploader value={(v as Attachment[]) ?? []} onChange={(x) => set(x)} />
                      : f.type === "select" ? <Select value={String(v ?? "")} onChange={(e) => set(e.target.value)} placeholder="— Chọn —" options={opts(f.options)} />
                      : f.type === "textarea" ? <Textarea rows={3} value={String(v ?? "")} onChange={(e) => set(e.target.value)} />
                      : f.type === "checkbox" ? <label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} /> Có</label>
                      : <Input type={f.type ?? "text"} value={v === undefined || v === null ? "" : String(v)} onChange={(e) => set(f.type === "number" ? Number(e.target.value) : e.target.value)} />}
                  </FormField>
                );
              })}
            </DialogBody>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Hủy</Button><Button onClick={save}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
