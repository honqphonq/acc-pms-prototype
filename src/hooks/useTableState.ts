import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";
export interface SortState {
  key: string;
  dir: SortDir;
}

/** Tìm kiếm + sắp xếp + phân trang phía client */
export function useTableState<T>(rows: T[], opts: { pageSize?: number; search?: (row: T) => string; sortValue?: (row: T, key: string) => unknown; initialSort?: SortState }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState | null>(opts.initialSort ?? null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(opts.pageSize ?? 10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q && opts.search ? rows.filter((r) => opts.search!(r).toLowerCase().includes(q)) : rows;
    if (sort && opts.sortValue) {
      const dir = sort.dir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        const va = opts.sortValue!(a, sort.key);
        const vb = opts.sortValue!(b, sort.key);
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
        return String(va).localeCompare(String(vb), "vi") * dir;
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));

  return {
    query,
    setQuery: (q: string) => { setQuery(q); setPage(1); },
    sort,
    toggleSort,
    page: safePage,
    setPage,
    pageSize,
    setPageSize: (n: number) => { setPageSize(n); setPage(1); },
    pageCount,
    filtered,
    pageRows,
    total: filtered.length,
  };
}
