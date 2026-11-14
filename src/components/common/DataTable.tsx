import { useEffect, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useTableState, type SortState } from "@/hooks/useTableState";
import { cn } from "@/utils/cn";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "./LoadingState";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  sortValue?: (row: T) => unknown;
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
}

/** Bảng dữ liệu: tìm kiếm, lọc (qua toolbar), sắp xếp, phân trang */
export function DataTable<T>({
  columns, rows, rowKey, searchText, searchPlaceholder = "Tìm kiếm...", toolbar, toolbarRight, onRowClick, pageSize = 10, loading,
  emptyTitle = "Không có dữ liệu", emptyDescription, emptyAction, initialSort, rowClassName, dense, showFooter, resetKey,
}: DataTableProps<T>) {
  const st = useTableState(rows, {
    pageSize,
    search: searchText,
    initialSort,
    sortValue: (row, key) => columns.find((c) => c.key === key)?.sortValue?.(row),
  });
  useEffect(() => st.setPage(1), [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const from = st.total ? (st.page - 1) * st.pageSize + 1 : 0;
  const to = Math.min(st.total, st.page * st.pageSize);
  const pages = pageWindow(st.page, st.pageCount);

  return (
    <div className="flex flex-col">
      {(searchText || toolbar || toolbarRight) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          {searchText && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={st.query} onChange={(e) => st.setQuery(e.target.value)} placeholder={searchPlaceholder} className="pl-8" />
            </div>
          )}
          {toolbar}
          {toolbarRight && <div className="ml-auto flex flex-wrap items-center gap-2">{toolbarRight}</div>}
        </div>
      )}
      {loading ? (
        <TableSkeleton cols={Math.min(columns.length, 7)} />
      ) : st.total === 0 ? (
        <EmptyState title={st.query ? `Không tìm thấy kết quả cho “${st.query}”` : emptyTitle} description={st.query ? "Thử từ khóa khác hoặc xóa bộ lọc." : emptyDescription} action={!st.query ? emptyAction : undefined} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => {
                const sorted = st.sort?.key === c.key ? st.sort.dir : null;
                return (
                  <TableHead key={c.key} className={cn(c.align === "right" && "text-right", c.align === "center" && "text-center", c.headClassName)}>
                    {c.sortValue ? (
                      <button onClick={() => st.toggleSort(c.key)} className={cn("inline-flex items-center gap-1 uppercase hover:text-slate-800", sorted && "text-slate-800")}>
                        {c.header}
                        {sorted === "asc" ? <ArrowUp className="h-3 w-3" /> : sorted === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {st.pageRows.map((row, i) => (
              <TableRow key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn(onRowClick && "cursor-pointer", rowClassName?.(row))}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn(dense && "py-2", c.align === "right" && "text-right tabular", c.align === "center" && "text-center", c.className)}>
                    {c.cell(row, (st.page - 1) * st.pageSize + i)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {showFooter && (
            <TableFooter>
              <TableRow className="hover:bg-transparent">
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            Hiển thị {from}–{to} trên tổng số {st.total} bản ghi
            <select value={st.pageSize} onChange={(e) => st.setPageSize(Number(e.target.value))} className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs">
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / trang
                </option>
              ))}
            </select>
          </div>
          {st.pageCount > 1 && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" disabled={st.page === 1} onClick={() => st.setPage(st.page - 1)}>
                <ChevronLeft />
              </Button>
              {pages.map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-1">…</span>
                ) : (
                  <button key={p} onClick={() => st.setPage(p)} className={cn("h-7 min-w-7 rounded-md px-2 text-xs font-medium", p === st.page ? "bg-primary text-white" : "hover:bg-slate-100")}>
                    {p}
                  </button>
                ),
              )}
              <Button variant="ghost" size="icon-sm" disabled={st.page === st.pageCount} onClick={() => st.setPage(st.page + 1)}>
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
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
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 max-w-[220px] truncate rounded-md border border-input bg-white px-2.5 text-[13px] text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/15">
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
