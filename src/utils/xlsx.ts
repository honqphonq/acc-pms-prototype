/** Xuất / đọc Excel (nạp thư viện xlsx khi cần) */
export async function writeXlsx(filename: string, sheet: string, rows: (string | number | null | undefined)[][], widths?: number[]) {
  const X = await import("xlsx");
  const ws = X.utils.aoa_to_sheet(rows);
  if (widths) ws["!cols"] = widths.map((wch) => ({ wch }));
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
  X.writeFile(wb, filename);
}
export async function readXlsx(file: File): Promise<unknown[][]> {
  const X = await import("xlsx");
  const wb = X.read(await file.arrayBuffer(), { cellDates: true });
  return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" }) as unknown[][];
}
/** Chuỗi ngày dd/mm/yyyy hoặc ngày Excel → yyyy-mm-dd */
export function parseDateCell(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const m = String(v ?? "").trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : null;
}
export const num = (v: unknown) => { if (typeof v === "number") return v; const n = Number(String(v ?? "").replace(/\./g, "").replace(",", ".")); return isNaN(n) ? NaN : n; };
