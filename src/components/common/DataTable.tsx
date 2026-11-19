import { isValidElement, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Filter, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { filterActive, useTableState, type ColFilter, type ColFilterType, type SortState } from "@/hooks/useTableState";
import { cn } from "@/utils/cn";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "./LoadingState";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  sortValue?: (row: T) => unknown;
  /** giá trị dùng để lọc theo cột (mặc định: sortValue hoặc chữ hiển thị của ô) */
  filterValue?: (row: T) => string;
  /** kiểu lọc theo cột; mặc định tự nhận dạng; false = không lọc */
  filter?: ColFilterType | false;
  className?: string;
  headClassName?: string;
  align?: "left" | "right" | "center";
  footer?: ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: ReactNode; // filters
  toolbarRight?: ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  initialSort?: SortState;
  rowClassName?: (row: T) => string | undefined;
  dense?: boolean;
  showFooter?: boolean;
  resetKey?: unknown;
  selectable?: boolean;
}

/** Lấy chữ hiển thị từ nội dung ô (phục vụ lọc theo cột) */
function nodeText(n: ReactNode): string {
  if (n === null || n === undefined || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(nodeText).filter(Boolean).join(" ");
  if (isValidElement(n)) {
    const p = n.props as { children?: ReactNode; map?: Record<string, { label: string }>; value?: string; name?: string };
    if (p.map && p.value !== undefined) return p.map[p.value]?.label ?? "";
    if (p.children !== undefined) return nodeText(p.children);
    return typeof p.name === "string" ? p.name : "";
  }
  return "";
}
const ISO = /^\d{4}-\d{2}-\d{2}/;
const fmtDmy = (d: string) => d.slice(0, 10).split("-").reverse().join("/");

/** Bảng dữ liệu: tìm kiếm, lọc theo cột, sắp xếp, chọn dòng, phân trang */
export function DataTable<T>({
  columns, rows, rowKey, searchText, searchPlaceholder = "Tìm kiếm...", toolbar, toolbarRight, onRowClick, pageSize = 10, loading,
  emptyTitle = "Không có dữ liệu", emptyDescription, emptyAction, initialSort, rowClassName, dense, showFooter, resetKey, selectable = true,
}: DataTableProps<T>) {
  const fval = (row: T, key: string) => {
    const c = columns.find((x) => x.key === key);
    if (!c) return "";
    if (c.filterValue) return c.filterValue(row);
    const sv = c.sortValue?.(row);
    if (typeof sv === "string" && sv) return sv;
    return nodeText(c.cell(row, 0)).replace(/\s+/g, " ").trim();
  };
  const st = useTableState(rows, {
    pageSize,
    search: searchText,
    initialSort,
    sortValue: (row, key) => columns.find((c) => c.key === key)?.sortValue?.(row),
    filterValue: fval,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { st.setPage(1); setSelected(new Set()); }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // kiểu lọc của từng cột
  const filterTypes = useMemo(() => {
    const out: Record<string, ColFilterType | null> = {};
    columns.forEach((c) => {
      if (c.filter === false || (typeof c.header !== "string" && !c.filter) || !c.header) { out[c.key] = c.filter || null; return; }
      if (c.filter) { out[c.key] = c.filter; return; }
      const vals = rows.slice(0, 200).map((r) => fval(r, c.key)).filter(Boolean);
      if (!vals.length) { out[c.key] = null; return; }
      if (vals.every((v) => ISO.test(v))) out[c.key] = "date";
      else if (new Set(vals).size <= 15 && vals.every((v) => v.length <= 60)) out[c.key] = "select";
      else out[c.key] = "text";
    });
    return out;
  }, [columns, rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const optionsOf = (key: string) => [...new Set(rows.map((r) => fval(r, key)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  const activeCount = Object.values(st.colFilters).filter(filterActive).length;
  const from = st.total ? (st.page - 1) * st.pageSize + 1 : 0;
  const to = Math.min(st.total, st.page * st.pageSize);
  const pages = pageWindow(st.page, st.pageCount);
  const keys = st.pageRows.map(rowKey);
  const allOn = keys.length > 0 && keys.every((k) => selected.has(k));

  return (
    <div className="flex flex-col">
      {(searchText || toolbar || toolbarRight || activeCount > 0) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
          {searchText && (
            <div className="relative w-full sm:w-72">
              <Input value={st.query} onChange={(e) => st.setQuery(e.target.value)} placeholder={searchPlaceholder} className="h-10 pr-9 text-[13.5px]" />
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          )}
          {toolbar}
          {activeCount > 0 && <Button size="sm" variant="outline" className="border-primary/40 text-primary" onClick={st.clearColFilters}><X /> Xóa {activeCount} bộ lọc cột</Button>}
          {selected.size > 0 && <span className="rounded-md bg-primary-soft px-2.5 py-1.5 text-xs font-medium text-primary">Đã chọn {selected.size} dòng · <button className="underline" onClick={() => setSelected(new Set())}>Bỏ chọn</button></span>}
          {toolbarRight && <div className="ml-auto flex flex-wrap items-center gap-2">{toolbarRight}</div>}
        </div>
      )}
      {loading ? (
        <TableSkeleton cols={Math.min(columns.length, 7)} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selectable && <TableHead className="w-10 pl-4 pr-0"><input type="checkbox" aria-label="Chọn tất cả" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={allOn} onChange={() => setSelected((s) => { const n = new Set(s); keys.forEach((k) => (allOn ? n.delete(k) : n.add(k))); return n; })} /></TableHead>}
              {columns.map((c) => {
                const sorted = st.sort?.key === c.key ? st.sort.dir : null;
                const ft = filterTypes[c.key];
                const f = st.colFilters[c.key];
                return (
                  <TableHead key={c.key} className={cn(c.align === "right" && "text-right", c.align === "center" && "text-center", c.headClassName)}>
                    <span className={cn("inline-flex items-center gap-1", c.align === "right" && "flex-row-reverse")}>
                      {c.sortValue ? (
                        <button onClick={() => st.toggleSort(c.key)} className={cn("inline-flex items-center gap-1 uppercase hover:text-primary", sorted && "text-primary")}>
                          {c.header}
                          {sorted === "asc" ? <ArrowUp className="h-3 w-3" /> : sorted === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                        </button>
                      ) : (
                        c.header
                      )}
                      {ft && <ColumnFilter type={ft} value={f} options={ft === "select" ? optionsOf(c.key) : []} onChange={(v) => st.setColFilter(c.key, v)} />}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {st.total === 0 && (
              <TableRow className="hover:bg-transparent"><TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="p-0">
                <EmptyState title={st.query || activeCount ? "Không tìm thấy kết quả phù hợp" : emptyTitle} description={st.query || activeCount ? "Thử từ khóa khác hoặc xóa bộ lọc." : emptyDescription} action={!st.query && !activeCount ? emptyAction : undefined} />
              </TableCell></TableRow>
            )}
            {st.pageRows.map((row, i) => {
              const k = rowKey(row);
              return (
                <TableRow key={k} data-state={selected.has(k) ? "selected" : undefined} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn(onRowClick && "cursor-pointer", rowClassName?.(row))}>
                  {selectable && <TableCell className="w-10 pl-4 pr-0" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label="Chọn dòng" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={selected.has(k)} onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })} /></TableCell>}
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn(dense && "py-2", c.align === "right" && "text-right tabular", c.align === "center" && "text-center", c.className)}>
                      {c.cell(row, (st.page - 1) * st.pageSize + i)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
          {showFooter && st.total > 0 && (
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                {selectable && <TableCell />}
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn(c.align === "right" && "text-right tabular", c.className)}>
                    {c.footer}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      )}
      {!loading && st.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-[13px] text-slate-600">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" disabled={st.page === 1} onClick={() => st.setPage(st.page - 1)}><ChevronLeft /></Button>
            {pages.map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1">…</span>
              ) : (
                <button key={p} onClick={() => st.setPage(p)} className={cn("h-8 min-w-8 rounded-md px-2 text-[13px] font-semibold", p === st.page ? "bg-primary text-white" : "text-slate-700 hover:bg-slate-100")}>
                  {p}
                </button>
              ),
            )}
            <Button variant="ghost" size="icon-sm" disabled={st.page === st.pageCount} onClick={() => st.setPage(st.page + 1)}><ChevronRight /></Button>
          </div>
          <div className="flex items-center gap-4">
            <span>Hiển thị kết quả <b className="text-slate-900">{from} - {to}</b> của <b className="text-slate-900">{st.total}</b></span>
            <span className="flex items-center gap-2">Số bản ghi mỗi trang
              <select value={st.pageSize} onChange={(e) => st.setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[13px] font-medium text-slate-800">
                {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Ô lọc theo cột (icon phễu trên tiêu đề cột) */
function ColumnFilter({ type, value, options, onChange }: { type: ColFilterType; value?: ColFilter; options: string[]; onChange: (v: ColFilter | null) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const on = filterActive(value);
  const vals = value?.values ?? [];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button aria-label="Lọc cột" onClick={(e) => e.stopPropagation()} className={cn("rounded p-0.5 normal-case", on ? "bg-primary text-white" : "text-slate-400 hover:bg-slate-200 hover:text-slate-700")}>
          <Filter className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 text-[13px] font-normal normal-case tracking-normal text-slate-800" onClick={(e) => e.stopPropagation()}>
        {type === "text" && <Input autoFocus placeholder="Chứa nội dung..." value={value?.text ?? ""} onChange={(e) => onChange(e.target.value ? { type, text: e.target.value } : null)} />}
        {type === "date" && (
          <div className="space-y-2">
            <label className="block text-xs text-slate-500">Từ ngày<Input type="date" className="mt-1" value={value?.from ?? ""} onChange={(e) => onChange({ type, from: e.target.value, to: value?.to })} /></label>
            <label className="block text-xs text-slate-500">Đến ngày<Input type="date" className="mt-1" value={value?.to ?? ""} onChange={(e) => onChange({ type, from: value?.from, to: e.target.value })} /></label>
          </div>
        )}
        {type === "select" && (
          <div>
            {options.length > 8 && <Input placeholder="Tìm..." className="mb-2 h-8" value={q} onChange={(e) => setQ(e.target.value)} />}
            <div className="max-h-60 space-y-0.5 overflow-y-auto">
              {options.filter((o) => o.toLowerCase().includes(q.toLowerCase())).map((o) => (
                <label key={o} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-slate-50">
                  <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={vals.includes(o)} onChange={() => { const n = vals.includes(o) ? vals.filter((x) => x !== o) : [...vals, o]; onChange(n.length ? { type, values: n } : null); }} />
                  <span className="truncate">{ISO.test(o) ? fmtDmy(o) : o}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 flex justify-between border-t pt-2">
          <Button size="xs" variant="ghost" disabled={!on} onClick={() => onChange(null)}>Xóa lọc</Button>
          <Button size="xs" onClick={() => setOpen(false)}>Xong</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function pageWindow(page: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const set = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

/** Bộ lọc dạng select nhỏ gọn dùng trong toolbar */
export function FilterSelect({ label, value, onChange, options, allLabel = "Tất cả" }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; allLabel?: string }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-500">
      {label && <span className="hidden whitespace-nowrap md:inline">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 max-w-[240px] truncate rounded-md border border-slate-300 bg-white px-3 text-[13.5px] font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/15">
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
