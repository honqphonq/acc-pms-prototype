/**
 * Nhập / xuất kế hoạch thi công theo template Excel (.xlsx).
 * Thư viện xlsx được nạp động (chỉ tải khi người dùng dùng chức năng này).
 */
import type { Database, ID } from "@/types";
import { buildTaskTree, taskActualPct } from "./selectors";
import { DEMO_TODAY, addDays } from "@/utils/date";

/** Cột của template – thứ tự cố định */
export const TEMPLATE_COLUMNS = [
  "Mã hạng mục",
  "Tên hạng mục",
  "Tên công việc (*)",
  "Người thực hiện",
  "Tổ thực hiện",
  "Đơn vị tính",
  "Khối lượng kế hoạch (*)",
  "Đơn giá (VNĐ)",
  "Bắt đầu KH (*) dd/mm/yyyy",
  "Kết thúc KH (*) dd/mm/yyyy",
] as const;

export interface ImportRow {
  line: number;
  itemCode: string;
  itemName: string;
  name: string;
  assigneeName: string;
  team: string;
  unit: string;
  qty: number;
  unitPrice: number;
  start: string;
  end: string;
}

const toDMY = (iso: string | null | undefined) => (iso ? iso.split("-").reverse().join("/") : "");

async function xlsx() {
  return await import("xlsx");
}

function save(XLSX: typeof import("xlsx"), rows: (string | number)[][], sheetName: string, filename: string, widths: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = widths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
const WIDTHS = [12, 30, 40, 22, 20, 10, 16, 16, 18, 18];

/** Tải template trống (kèm 2 dòng ví dụ) */
export async function downloadTemplate(db: Database, projectId: ID) {
  const XLSX = await xlsx();
  const p = db.projects.find((x) => x.id === projectId);
  const item = db.constructionItems.find((i) => i.projectId === projectId);
  const sample: (string | number)[][] = [
    [item?.code ?? "1.1.1", item?.name ?? "Kết cấu đường lăn", "Thi công móng CPĐD loại 1", "Phạm Văn Long", "Tổ móng CPĐD số 1", "m³", 2400, 165000, toDMY(addDays(DEMO_TODAY, 3)), toDMY(addDays(DEMO_TODAY, 17))],
    [item?.code ?? "1.1.1", item?.name ?? "Kết cấu đường cất hạ cánh", "Thi công BTXM M350/45 dày 40cm", "Hoàng Quang Huy", "Tổ BTXM mặt đường số 1", "m³", 1200, 680000, toDMY(addDays(DEMO_TODAY, 1)), toDMY(addDays(DEMO_TODAY, 10))],
  ];
  save(XLSX, [[...TEMPLATE_COLUMNS], ...sample], "Kế hoạch thi công", `Template_ke_hoach_thi_cong_${p?.code ?? ""}.xlsx`, WIDTHS);
}

/** Xuất kế hoạch hiện tại theo đúng cột template (+ các cột thực hiện để tham khảo) */
export async function exportPlan(db: Database, projectId: ID) {
  const XLSX = await xlsx();
  const p = db.projects.find((x) => x.id === projectId)!;
  const rows: (string | number)[][] = [[...TEMPLATE_COLUMNS, "Mã công việc", "KL thực hiện", "Tiến độ (%)", "Bắt đầu TT", "Kết thúc TT"]];
  buildTaskTree(db, projectId).forEach(({ itemId, rows: tree }) => {
    const it = db.constructionItems.find((i) => i.id === itemId)!;
    const walk = (list: typeof tree) =>
      list.forEach((r) => {
        if (r.children.length) return walk(r.children);
        const t = r.task;
        rows.push([
          it.code, it.name, t.name, db.users.find((u) => u.id === t.assigneeId)?.name ?? "", t.team, t.unit, t.contractQty, t.unitPrice, toDMY(t.plannedStart), toDMY(t.plannedEnd),
          t.code, t.actualQty, Math.round(taskActualPct(t) * 1000) / 10, toDMY(t.actualStart), toDMY(t.actualEnd),
        ]);
      });
    walk(tree);
  });
  save(XLSX, rows, "Kế hoạch thi công", `Ke_hoach_thi_cong_${p.code}_${DEMO_TODAY}.xlsx`, [...WIDTHS, 12, 12, 10, 12, 12]);
  return rows.length - 1;
}

function parseDate(v: unknown, XLSX: typeof import("xlsx")): string {
  if (v == null || v === "") return "";
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}` : "";
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const m = String(v).trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const iso = String(v).trim().match(/^\d{4}-\d{2}-\d{2}$/);
  return iso ? iso[0] : "";
}

/** Đọc file Excel theo template → danh sách dòng hợp lệ + lỗi */
export async function parsePlanFile(file: File): Promise<{ rows: ImportRow[]; errors: string[] }> {
  const XLSX = await xlsx();
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  if (!data.length) return { rows, errors: ["File không có dữ liệu"] };
  const header = (data[0] as unknown[]).map((h) => String(h ?? "").trim());
  if (header[2] !== TEMPLATE_COLUMNS[2]) errors.push("File không đúng template – hãy tải template mẫu và nhập dữ liệu theo đúng thứ tự cột");
  data.slice(1).forEach((r, i) => {
    const c = r as unknown[];
    const line = i + 2;
    const name = String(c[2] ?? "").trim();
    if (!name) return;
    const qty = Number(c[6]);
    const start = parseDate(c[8], XLSX);
    const end = parseDate(c[9], XLSX);
    const errs: string[] = [];
    if (!(qty > 0)) errs.push("khối lượng kế hoạch phải > 0");
    if (!start || !end) errs.push("ngày bắt đầu/kết thúc không hợp lệ (dd/mm/yyyy)");
    else if (end < start) errs.push("ngày kết thúc trước ngày bắt đầu");
    if (errs.length) return errors.push(`Dòng ${line} – “${name}”: ${errs.join("; ")}`);
    rows.push({
      line, itemCode: String(c[0] ?? "").trim(), itemName: String(c[1] ?? "").trim(), name,
      assigneeName: String(c[3] ?? "").trim(), team: String(c[4] ?? "").trim(), unit: String(c[5] ?? "").trim() || "m³",
      qty, unitPrice: Number(c[7]) || 0, start, end,
    });
  });
  return { rows, errors };
}
