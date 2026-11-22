/**
 * Business logic dạng hàm thuần – mọi chỉ số tổng hợp đều được TÍNH từ dữ liệu gốc,
 * nên Dashboard, trang dự án, báo cáo luôn nhất quán với nhau.
 */
import type {
  AcceptanceRecord,
  Database,
  Equipment,
  ID,
  InventoryItem,
  Material,
  PlanTask,
  Project,
} from "@/types";
import { DEMO_TODAY, addDays, diffDays, endOfMonth, monthsBetween } from "@/utils/date";
import { type ScheduleHealth } from "@/utils/constants";

// ---------- memo helper (cache theo identity của DB) ----------
function memo<R>(fn: (db: Database) => R) {
  const cache = new WeakMap<Database, R>();
  return (db: Database) => {
    let v = cache.get(db);
    if (v === undefined) {
      v = fn(db);
      cache.set(db, v);
    }
    return v;
  };
}

// ---------- tasks ----------
export const taskValue = (t: PlanTask) => t.contractQty * t.unitPrice;
export const taskDoneValue = (t: PlanTask) => Math.min(t.actualQty, t.contractQty) * t.unitPrice;
export const taskActualPct = (t: PlanTask) =>
  t.contractQty > 0 ? Math.min(1, t.actualQty / t.contractQty) : t.status === "hoan_thanh" ? 1 : 0;
export function taskPlannedPct(t: Pick<PlanTask, "plannedStart" | "plannedEnd">, today = DEMO_TODAY) {
  if (today < t.plannedStart) return 0;
  if (today >= t.plannedEnd) return 1;
  return (diffDays(t.plannedStart, today) + 1) / (diffDays(t.plannedStart, t.plannedEnd) + 1);
}
export const taskDuration = (t: Pick<PlanTask, "plannedStart" | "plannedEnd">) => diffDays(t.plannedStart, t.plannedEnd) + 1;

/**
 * Trạng thái công việc (Gantt, danh sách):
 * - Chưa bắt đầu: chưa có khối lượng, kế hoạch chưa yêu cầu khối lượng nào
 * - Đang thực hiện: % thực tế ≥ % kế hoạch đến hôm nay
 * - Chậm tiến độ: % thực tế < % kế hoạch đến hôm nay (gồm cả đã đến ngày bắt đầu mà chưa làm, đã quá hạn mà chưa xong)
 * - Hoàn thành / Hoàn thành muộn: xong 100% – đúng hạn hoặc sau hạn kế hoạch
 */
export type TaskHealth = "hoan_thanh" | "hoan_thanh_muon" | "cham" | "dung" | "chua_bat_dau";
export function taskHealth(t: { actual: number; planned: number; plannedEnd: string; plannedStart: string; actualEnd?: string | null }): TaskHealth {
  if (t.actual >= 1) return t.actualEnd && t.actualEnd > t.plannedEnd ? "hoan_thanh_muon" : "hoan_thanh";
  if (t.actual + 1e-9 < t.planned) return "cham";
  if (t.actual > 0) return "dung";
  return "chua_bat_dau";
}
export const TASK_HEALTH_LABEL: Record<TaskHealth, { label: string; tone: "success" | "danger" | "warning" | "info" | "neutral" }> = {
  hoan_thanh: { label: "Hoàn thành", tone: "success" },
  hoan_thanh_muon: { label: "Hoàn thành muộn", tone: "warning" },
  cham: { label: "Chậm tiến độ", tone: "danger" },
  dung: { label: "Đang thực hiện", tone: "info" },
  chua_bat_dau: { label: "Chưa bắt đầu", tone: "neutral" },
};

/** Số liệu tổng hợp của một đầu việc (gồm cả nhóm công việc có con) */
export interface TaskRow {
  task: PlanTask;
  depth: number;
  value: number;
  doneValue: number;
  planned: number;
  actual: number;
  health: TaskHealth;
  children: TaskRow[];
}

export function buildTaskTree(db: Database, projectId: ID): { itemId: ID; rows: TaskRow[] }[] {
  const items = db.constructionItems.filter((i) => i.projectId === projectId).sort((a, b) => a.order - b.order);
  const tasks = db.constructionPlans.filter((t) => t.projectId === projectId);
  const build = (parentId: ID | null, itemId: ID, depth: number): TaskRow[] =>
    tasks
      .filter((t) => t.itemId === itemId && t.parentId === parentId)
      .sort((a, b) => a.order - b.order)
      .map((t) => {
        const children = build(t.id, itemId, depth + 1);
        if (t.isGroup || children.length) {
          const value = children.reduce((s, c) => s + c.value, 0);
          const doneValue = children.reduce((s, c) => s + c.doneValue, 0);
          const plannedV = children.reduce((s, c) => s + c.planned * c.value, 0);
          const planned = value ? plannedV / value : taskPlannedPct(t);
          const actual = value ? doneValue / value : 0;
          return { task: t, depth, value, doneValue, planned, actual, health: taskHealth({ actual, planned, plannedEnd: t.plannedEnd, plannedStart: t.plannedStart, actualEnd: t.actualEnd }), children };
        }
        const planned = taskPlannedPct(t);
        const actual = taskActualPct(t);
        return { task: t, depth, value: taskValue(t), doneValue: taskDoneValue(t), planned, actual, health: taskHealth({ actual, planned, plannedEnd: t.plannedEnd, plannedStart: t.plannedStart, actualEnd: t.actualEnd }), children };
      });
  return items.map((it) => ({ itemId: it.id, rows: build(null, it.id, 1) }));
}

export const leafTasks = (db: Database, projectId?: ID) =>
  db.constructionPlans.filter((t) => !t.isGroup && (!projectId || t.projectId === projectId));

// ---------- items ----------
export interface ItemStats {
  value: number;
  doneValue: number;
  planned: number;
  actual: number;
  start: string;
  end: string;
  overdue: number;
}
export function itemStats(db: Database, itemId: ID): ItemStats {
  const ts = db.constructionPlans.filter((t) => t.itemId === itemId && !t.isGroup);
  const value = ts.reduce((s, t) => s + taskValue(t), 0);
  const doneValue = ts.reduce((s, t) => s + taskDoneValue(t), 0);
  const plannedV = ts.reduce((s, t) => s + taskPlannedPct(t) * taskValue(t), 0);
  const all = db.constructionPlans.filter((t) => t.itemId === itemId);
  return {
    value,
    doneValue,
    planned: value ? plannedV / value : 0,
    actual: value ? doneValue / value : 0,
    start: all.map((t) => t.plannedStart).sort()[0] ?? "",
    end: all.map((t) => t.plannedEnd).sort().pop() ?? "",
    overdue: ts.filter((t) => t.plannedEnd < DEMO_TODAY && taskActualPct(t) < 1).length,
  };
}

// ---------- projects ----------
export interface ProjectStats {
  project: Project;
  planValue: number; // tổng giá trị theo kế hoạch (dự toán các đầu việc)
  execValue: number; // giá trị thực hiện = KL thực hiện × đơn giá
  planned: number; // tiến độ kế hoạch tại ngày dữ liệu
  actual: number; // tiến độ thực tế
  delta: number; // điểm % (actual - planned)
  spi: number | null; // KL thực tế / KL kế hoạch đến ngày dữ liệu (quy ra tiền); null khi kế hoạch chưa yêu cầu khối lượng nào
  health: ScheduleHealth;
  tasksTotal: number;
  tasksDone: number;
  tasksDoneLate: number;
  tasksInProgress: number;
  tasksOverdue: number;
  tasksNotStarted: number;
  acceptedValue: number;
  pendingAcceptanceValue: number;
  paymentRequested: number;
  paidValue: number;
  cost: number;
  daysLeft: number;
  elapsedPct: number;
  tasksBehind: number; // công việc đang làm nhưng chậm so với thời gian kế hoạch
  maxDaysLate: number; // số ngày trễ hạn lớn nhất của công việc quá hạn
  healthReason: string; // diễn giải trạng thái tiến độ
}

/** Ngưỡng tỷ lệ KL thực tế / KL kế hoạch đến ngày dữ liệu (quy ra tiền) */
export const SPI_ON_TRACK = 0.95;
export const SPI_DELAYED = 0.85;

/**
 * Trạng thái tiến độ dự án = Giá trị KL thực tế ÷ Giá trị KL kế hoạch phải đạt đến ngày dữ liệu
 * (cộng dồn mọi đầu việc, mỗi đầu việc quy ra tiền = khối lượng × đơn giá):
 * - Đúng tiến độ: ≥ 95% · Có nguy cơ chậm: 85% – dưới 95% · Chậm tiến độ: < 85%
 */
export function healthOf(o: { status: Project["status"]; actual: number; started: boolean; spi: number | null }): { health: ScheduleHealth; reason: string } {
  if (o.status === "hoan_thanh" || o.actual >= 1) return { health: "hoan_thanh", reason: "Đã hoàn thành toàn bộ công việc" };
  if (o.status === "chuan_bi" && !o.started) return { health: "chua_bat_dau", reason: "Chưa đến thời gian thi công" };
  if (o.spi === null) return { health: "dung_tien_do", reason: "Chưa đến thời điểm phải thực hiện khối lượng theo kế hoạch" };
  const r = `Thực tế đạt ${(o.spi * 100).toFixed(0)}% khối lượng kế hoạch đến hôm nay (quy ra tiền)`;
  if (o.spi < SPI_DELAYED) return { health: "cham_tien_do", reason: `${r} · dưới ${SPI_DELAYED * 100}%` };
  if (o.spi < SPI_ON_TRACK) return { health: "nguy_co_cham", reason: `${r} · dưới ${SPI_ON_TRACK * 100}%` };
  return { health: "dung_tien_do", reason: r };
}

export function acceptanceValue(db: Database, ac: AcceptanceRecord) {
  return ac.lines.reduce((s, l) => {
    const t = db.constructionPlans.find((x) => x.id === l.taskId);
    return s + (t ? l.acceptedQty * t.unitPrice : 0);
  }, 0);
}

export const getProjectStatsMap = memo((db: Database) => {
  const map = new Map<ID, ProjectStats>();
  const acValues = new Map(db.acceptanceRecords.map((a) => [a.id, acceptanceValue(db, a)]));
  const costByProject = new Map<ID, number>();
  db.costEntries.forEach((c) => costByProject.set(c.projectId, (costByProject.get(c.projectId) ?? 0) + c.nvl + c.nc + c.mtc + c.sxc));
  db.projects.forEach((p) => {
    const ts = db.constructionPlans.filter((t) => t.projectId === p.id && !t.isGroup);
    const planValue = ts.reduce((s, t) => s + taskValue(t), 0);
    const execValue = ts.reduce((s, t) => s + taskDoneValue(t), 0);
    const plannedV = ts.reduce((s, t) => s + taskPlannedPct(t) * taskValue(t), 0);
    const planned = planValue ? plannedV / planValue : 0;
    const actual = planValue ? execValue / planValue : 0;
    const delta = actual - planned;
    const acs = db.acceptanceRecords.filter((a) => a.projectId === p.id);
    const pays = db.paymentRecords.filter((x) => x.projectId === p.id && x.direction === "thu_cdt");
    const total = diffDays(p.startDate, p.endDate) || 1;
    const overdue = ts.filter((t) => taskActualPct(t) < 1 && t.plannedEnd < DEMO_TODAY);
    const maxDaysLate = overdue.reduce((m, t) => Math.max(m, diffDays(t.plannedEnd, DEMO_TODAY)), 0);
    const tasksBehind = ts.filter((t) => t.plannedEnd >= DEMO_TODAY && taskPlannedPct(t) - taskActualPct(t) > 0.15).length;
    const spi = plannedV > 0 ? execValue / plannedV : null;
    const h = healthOf({ status: p.status, actual, started: ts.some((t) => t.actualQty > 0), spi });
    map.set(p.id, {
      project: p,
      planValue,
      execValue,
      planned,
      actual,
      delta,
      spi,
      health: h.health,
      healthReason: h.reason,
      maxDaysLate,
      tasksBehind,
      tasksTotal: ts.length,
      tasksDone: ts.filter((t) => taskActualPct(t) >= 1).length,
      tasksDoneLate: ts.filter((t) => taskActualPct(t) >= 1 && t.actualEnd && t.actualEnd > t.plannedEnd).length,
      tasksInProgress: ts.filter((t) => taskActualPct(t) > 0 && taskActualPct(t) < 1).length,
      tasksOverdue: overdue.length,
      tasksNotStarted: ts.filter((t) => taskActualPct(t) === 0 && t.plannedEnd >= DEMO_TODAY).length,
      acceptedValue: acs.filter((a) => a.status === "da_nghiem_thu").reduce((s, a) => s + (acValues.get(a.id) ?? 0), 0),
      pendingAcceptanceValue: acs.filter((a) => ["cho_tvgs", "cho_cdt"].includes(a.status)).reduce((s, a) => s + (acValues.get(a.id) ?? 0), 0),
      paymentRequested: pays.filter((x) => x.status !== "lap_ho_so").reduce((s, x) => s + x.amount, 0),
      paidValue: pays.reduce((s, x) => s + x.paidAmount, 0),
      cost: costByProject.get(p.id) ?? 0,
      daysLeft: Math.max(0, diffDays(DEMO_TODAY, p.endDate)),
      elapsedPct: Math.min(1, Math.max(0, diffDays(p.startDate, DEMO_TODAY) / total)),
    });
  });
  return map;
});
export const projectStats = (db: Database, id: ID) => getProjectStatsMap(db).get(id)!;

export const getPortfolio = memo((db: Database) => {
  const stats = [...getProjectStatsMap(db).values()];
  const active = stats.filter((s) => s.project.status !== "hoan_thanh");
  const running = stats.filter((s) => s.project.status === "dang_thi_cong");
  const sum = (arr: ProjectStats[], f: (s: ProjectStats) => number) => arr.reduce((x, s) => x + f(s), 0);
  const healthCount = (h: ScheduleHealth) => running.filter((s) => s.health === h).length;
  const contract = sum(stats, (s) => s.project.contractValue);
  const planValue = sum(stats, (s) => s.planValue);
  const execValue = sum(stats, (s) => s.execValue);
  const plannedV = sum(stats, (s) => s.planned * s.planValue);
  return {
    stats,
    totalProjects: stats.length,
    activeProjects: active.length,
    runningProjects: running.length,
    contract,
    budget: sum(stats, (s) => s.project.budget),
    execValue,
    accepted: sum(stats, (s) => s.acceptedValue),
    paid: sum(stats, (s) => s.paidValue),
    cost: sum(stats, (s) => s.cost),
    overallActual: planValue ? execValue / planValue : 0,
    overallPlanned: planValue ? plannedV / planValue : 0,
    onTrack: healthCount("dung_tien_do"),
    atRisk: healthCount("nguy_co_cham"),
    delayed: healthCount("cham_tien_do"),
    tasksOverdue: sum(running, (s) => s.tasksOverdue),
  };
});

// ---------- S-curve theo tháng ----------
export function monthlyProgress(db: Database, projectId?: ID) {
  const projects = db.projects.filter((p) => (!projectId || p.id === projectId) && p.status !== "chuan_bi");
  if (!projects.length) return [];
  const start = projects.map((p) => p.startDate).sort()[0];
  const end = projects.map((p) => p.endDate).sort().pop()!;
  const ids = new Set(projects.map((p) => p.id));
  const tasks = db.constructionPlans.filter((t) => ids.has(t.projectId) && !t.isGroup);
  const total = tasks.reduce((s, t) => s + taskValue(t), 0) || 1;
  const priceOf = new Map(tasks.map((t) => [t.id, t.unitPrice]));
  const logs = db.constructionLogs.filter((l) => ids.has(l.projectId));
  return monthsBetween(start, end).map((m) => {
    const eom = endOfMonth(m);
    const plan = tasks.reduce((s, t) => s + taskPlannedPct(t, eom) * taskValue(t), 0);
    const isFuture = m > DEMO_TODAY.slice(0, 7);
    const actual = isFuture ? null : logs.filter((l) => l.date <= eom).reduce((s, l) => s + l.qty * (priceOf.get(l.taskId) ?? 0), 0);
    const monthActual = isFuture ? null : logs.filter((l) => l.date.slice(0, 7) === m).reduce((s, l) => s + l.qty * (priceOf.get(l.taskId) ?? 0), 0);
    return { month: m, planValue: plan, actualValue: actual, planPct: plan / total, actualPct: actual == null ? null : actual / total, monthActual };
  });
}

// ---------- vật tư & tồn kho ----------
export type StockStatus = "thieu_hang" | "vuot_dinh_muc" | "sap_vuot" | "binh_thuong";
export interface StockRow {
  inv: InventoryItem;
  material: Material;
  received: number;
  issued: number;
  onHand: number;
  pending: number; // khối lượng đang đề xuất / đặt hàng
  usage: number; // issued / norm
  status: StockStatus;
  value: number;
  lastIssue: string | null; // ngày xuất gần nhất – cảnh báo tồn lâu, chậm luân chuyển
}
export const getStockRows = memo((db: Database) => {
  const recv = new Map<string, number>();
  const iss = new Map<string, number>();
  const lastOut = new Map<string, string>();
  db.stockTransactions.forEach((t) => {
    if (t.confirmed === false) return; // phiếu chưa xác nhận chưa cập nhật tồn kho
    const k = `${t.projectId}|${t.materialId}`;
    if (t.type === "xuat" && (lastOut.get(k) ?? "") < t.date) lastOut.set(k, t.date);
    const m = t.type === "nhap" ? recv : iss;
    m.set(k, (m.get(k) ?? 0) + t.qty);
  });
  const pend = new Map<string, number>();
  db.materialRequests
    .filter((r) => ["cho_duyet", "da_duyet", "dat_hang"].includes(r.status))
    .forEach((r) => r.lines.forEach((l) => {
      const k = `${r.projectId}|${l.materialId}`;
      pend.set(k, (pend.get(k) ?? 0) + l.qty);
    }));
  const matMap = new Map(db.materials.map((m) => [m.id, m]));
  return db.inventory.map<StockRow>((inv) => {
    const k = `${inv.projectId}|${inv.materialId}`;
    const received = recv.get(k) ?? 0;
    const issued = iss.get(k) ?? 0;
    const onHand = Math.round((received - issued) * 100) / 100;
    const usage = inv.normQty ? issued / inv.normQty : 0;
    const material = matMap.get(inv.materialId)!;
    let status: StockStatus = "binh_thuong";
    if (usage > 1) status = "vuot_dinh_muc";
    else if (inv.minStock > 0 && onHand < inv.minStock) status = "thieu_hang";
    else if (usage >= 0.9) status = "sap_vuot";
    return { inv, material, received, issued, onHand, pending: pend.get(k) ?? 0, usage, status, value: onHand * material.unitPrice, lastIssue: lastOut.get(k) ?? null };
  });
});
export const STOCK_STATUS: Record<StockStatus, { label: string; tone: "danger" | "warning" | "success" | "purple" }> = {
  thieu_hang: { label: "Dưới mức tồn tối thiểu", tone: "danger" },
  vuot_dinh_muc: { label: "Vượt định mức", tone: "purple" },
  sap_vuot: { label: "Sắp vượt định mức (≥90%)", tone: "warning" },
  binh_thuong: { label: "Bình thường", tone: "success" },
};

export function stockOf(db: Database, projectId: ID, materialId: ID) {
  return getStockRows(db).find((r) => r.inv.projectId === projectId && r.inv.materialId === materialId);
}

/** Thành tiền dòng vật tư = KL × đơn giá × (1 − chiết khấu%) × (1 + VAT%) */
export const lineAmount = (l: { qty: number; unitPrice: number; discount?: number; vat?: number }) => l.qty * l.unitPrice * (1 - (l.discount ?? 0) / 100) * (1 + (l.vat ?? 0) / 100);
export const requestValue = (r: { lines: { qty: number; unitPrice: number; discount?: number; vat?: number }[] }) => r.lines.reduce((s, l) => s + lineAmount(l), 0);
export const isRequestOverdue = (r: { status: string; neededDate: string }) =>
  ["cho_duyet", "da_duyet", "dat_hang"].includes(r.status) && r.neededDate < DEMO_TODAY;

// ---------- thiết bị ----------
/** Xe (ô tô, xe biển đỏ) tính theo km; máy thiết bị tính theo giờ máy */
export const isVehicle = (e: Pick<Equipment, "kind">) => e.kind !== "may_thiet_bi";
export const meterUnit = (e: Pick<Equipment, "kind">) => (isVehicle(e) ? "km" : "giờ");
export const fuelUnit = (e: Pick<Equipment, "kind">) => (isVehicle(e) ? "lít/100 km" : "lít/giờ");
/** Chỉ số đồng hồ tăng thêm trong một ca: km (xe) hoặc giờ máy (máy) */
export const shiftMeter = (e: Pick<Equipment, "kind"> | undefined, s: { hours: number; km?: number }) => (e && isVehicle(e) ? s.km ?? 0 : s.hours);
/** Định mức nhiên liệu của một ca */
export const shiftFuelNorm = (e: Pick<Equipment, "kind" | "fuelNorm"> | undefined, s: { hours: number; km?: number }) => (!e ? 0 : isVehicle(e) ? ((s.km ?? 0) * e.fuelNorm) / 100 : s.hours * e.fuelNorm);
export const sinceMaintenance = (e: Equipment) => e.totalHours - e.lastMaintenanceHours;
export const monthsSinceMaintenance = (e: Equipment) => (e.lastMaintenanceDate ? diffDays(e.lastMaintenanceDate, DEMO_TODAY) / 30.4 : 0);
/** Đến hạn bảo dưỡng: còn ≤ 10% chu kỳ (giờ / km) hoặc còn ≤ 15 ngày theo mốc tháng – mốc nào đến trước */
export const maintenanceDue = (e: Equipment) =>
  sinceMaintenance(e) >= e.maintenanceInterval * 0.9 || (!!e.maintenanceMonths && !!e.lastMaintenanceDate && monthsSinceMaintenance(e) >= e.maintenanceMonths - 0.5);
/** Mô tả còn bao lâu đến kỳ bảo dưỡng */
export function maintenanceLeft(e: Equipment) {
  const left = e.maintenanceInterval - sinceMaintenance(e);
  const byMeter = left <= 0 ? `Quá ${Math.round(-left).toLocaleString("vi-VN")} ${meterUnit(e)}` : `Còn ${Math.round(left).toLocaleString("vi-VN")} ${meterUnit(e)}`;
  if (!e.maintenanceMonths || !e.lastMaintenanceDate) return byMeter;
  const due = addDays(e.lastMaintenanceDate, Math.round(e.maintenanceMonths * 30.4));
  const d = diffDays(DEMO_TODAY, due);
  return `${byMeter} · ${d < 0 ? `quá ${-d} ngày` : `hoặc ${d} ngày`}`;
}
export const getEquipmentUsage = memo((db: Database) => {
  const from = addDays(DEMO_TODAY, -21);
  const map = new Map<ID, { hours: number; fuel: number; shifts: number; fuelNormTotal: number }>();
  db.equipmentShifts.filter((s) => s.date >= from).forEach((s) => {
    const e = db.equipment.find((x) => x.id === s.equipmentId);
    const cur = map.get(s.equipmentId) ?? { hours: 0, fuel: 0, shifts: 0, fuelNormTotal: 0 };
    cur.hours += s.hours;
    cur.fuel += s.fuelLiters;
    cur.shifts += 1;
    cur.fuelNormTotal += shiftFuelNorm(e, s);
    map.set(s.equipmentId, cur);
  });
  return map;
});
/** Hiệu suất sử dụng = giờ máy thực tế / (18 ngày làm việc × 8 giờ) trong 3 tuần gần nhất */
export const AVAILABLE_HOURS_3W = 18 * 8;

/**
 * Giờ máy LŨY KẾ của từng thiết bị tại từng công trình, kể từ khi máy được điều động về công trình:
 * = giờ máy tổng hợp theo tháng (equipmentUsage) + ca máy chi tiết (equipmentShifts).
 * Số ngày làm việc khả dụng dùng để tính hiệu suất = ngày làm việc (trừ Chủ nhật) kể từ khi máy về công trình.
 */
export interface EquipmentWork { hours: number; availableDays: number; fuel: number }
const ewKey = (eqId: ID, projectId: ID) => `${eqId}|${projectId}`;
export const SHIFT_WINDOW_START = addDays(DEMO_TODAY, -21);
function workingDaysBetween(a: string, b: string) {
  let n = 0;
  for (let x = a; x <= b; x = addDays(x, 1)) if (new Date(x + "T00:00:00Z").getUTCDay() !== 0) n++;
  return n;
}
export const getEquipmentWork = memo((db: Database) => {
  const map = new Map<string, EquipmentWork>();
  const get = (k: string) => map.get(k) ?? (map.set(k, { hours: 0, availableDays: 0, fuel: 0 }), map.get(k)!);
  db.equipmentUsage.forEach((u) => { const w = get(ewKey(u.equipmentId, u.projectId)); w.hours += u.hours; w.availableDays += u.workingDays; w.fuel += u.fuelLiters; });
  db.equipmentShifts.forEach((s) => { const w = get(ewKey(s.equipmentId, s.projectId)); w.hours += s.hours; w.fuel += s.fuelLiters; });
  db.equipmentAssignments.filter((a) => a.status === "dang_dieu_dong").forEach((a) => {
    const from = a.startDate > SHIFT_WINDOW_START ? a.startDate : SHIFT_WINDOW_START;
    const to = addDays(DEMO_TODAY, -1);
    if (from <= to) get(ewKey(a.equipmentId, a.toProjectId)).availableDays += workingDaysBetween(from, to);
  });
  return map;
});
/** Giờ máy lũy kế của thiết bị: tại một công trình, hoặc cộng dồn mọi công trình */
export function equipmentWork(db: Database, eqId: ID, projectId?: ID | null): EquipmentWork {
  const map = getEquipmentWork(db);
  if (projectId) return map.get(ewKey(eqId, projectId)) ?? { hours: 0, availableDays: 0, fuel: 0 };
  const res = { hours: 0, availableDays: 0, fuel: 0 };
  map.forEach((w, k) => { if (k.startsWith(eqId + "|")) { res.hours += w.hours; res.availableDays += w.availableDays; res.fuel += w.fuel; } });
  return res;
}
export const utilizationOf = (w: { hours: number; availableDays: number }) => (w.availableDays ? w.hours / (w.availableDays * 8) : 0);

/** Tổng hợp theo nhóm máy – giờ máy lũy kế từ khi máy về công trình */
export function equipmentByGroup(db: Database, projectId?: ID) {
  const list = db.equipment.filter((e) => !projectId || e.currentProjectId === projectId);
  const groups = new Map<string, { group: string; count: number; hours: number; availableDays: number; active: number; projects: Set<ID> }>();
  list.forEach((e) => {
    const g = groups.get(e.group) ?? { group: e.group, count: 0, hours: 0, availableDays: 0, active: 0, projects: new Set<ID>() };
    const w = equipmentWork(db, e.id, projectId);
    g.count++;
    g.hours += w.hours;
    g.availableDays += w.availableDays;
    if (e.status === "hoat_dong") g.active++;
    if (e.currentProjectId) g.projects.add(e.currentProjectId);
    groups.set(e.group, g);
  });
  return [...groups.values()].map((g) => ({ ...g, projects: [...g.projects], utilization: utilizationOf(g) }));
}

// ---------- nghiệm thu: đối chiếu ----------
export interface ReconcileRow {
  task: PlanTask;
  executed: number;
  accepted: number;
  pending: number;
  diff: number;
  executedValue: number;
  acceptedValue: number;
}
export function reconcile(db: Database, projectId: ID): ReconcileRow[] {
  const acs = db.acceptanceRecords.filter((a) => a.projectId === projectId);
  return leafTasks(db, projectId)
    .filter((t) => t.contractQty > 0 && t.unitPrice > 0)
    .map((t) => {
      let accepted = 0;
      let pending = 0;
      acs.forEach((a) => a.lines.filter((l) => l.taskId === t.id).forEach((l) => {
        if (a.status === "da_nghiem_thu") accepted += l.acceptedQty;
        else if (a.status === "cho_tvgs" || a.status === "cho_cdt") pending += l.acceptedQty;
      }));
      const executed = t.actualQty;
      return { task: t, executed, accepted, pending, diff: executed - accepted, executedValue: executed * t.unitPrice, acceptedValue: accepted * t.unitPrice };
    })
    .sort((a, b) => a.task.order - b.task.order);
}

// ---------- cảnh báo tổng hợp ----------
export type AlertKind = "tien_do" | "vat_tu" | "thiet_bi" | "thanh_toan" | "nghiem_thu";
export interface Alert {
  id: string;
  kind: AlertKind;
  severity: "danger" | "warning" | "info";
  title: string;
  detail: string;
  projectId: ID | null;
  link: string;
}
export const ALERT_KIND_LABEL: Record<AlertKind, string> = {
  tien_do: "Tiến độ",
  vat_tu: "Vật tư",
  thiet_bi: "Thiết bị",
  thanh_toan: "Thanh toán",
  nghiem_thu: "Nghiệm thu",
};

export const getAlerts = memo((db: Database): Alert[] => {
  const out: Alert[] = [];
  const pName = (id: ID | null) => db.projects.find((p) => p.id === id)?.shortName ?? "";
  getProjectStatsMap(db).forEach((s) => {
    if (s.project.status !== "dang_thi_cong") return;
    if (s.health === "cham_tien_do" || s.health === "nguy_co_cham")
      out.push({
        id: `prj-${s.project.id}`,
        kind: "tien_do",
        severity: s.health === "cham_tien_do" ? "danger" : "warning",
        title: `${s.project.shortName}: ${s.health === "cham_tien_do" ? "chậm tiến độ" : "có nguy cơ chậm tiến độ"}`,
        detail: `${s.healthReason} · hoàn thành ${(s.actual * 100).toFixed(1)}% khối lượng · hạn hoàn thành dự án ${s.project.endDate.split("-").reverse().join("/")}`,
        projectId: s.project.id,
        link: `/projects/${s.project.id}`,
      });
  });
  leafTasks(db).forEach((t) => {
    const a = taskActualPct(t);
    if (a < 1 && t.plannedEnd < DEMO_TODAY) {
      const late = diffDays(t.plannedEnd, DEMO_TODAY);
      out.push({
        id: `task-${t.id}`,
        kind: "tien_do",
        severity: late > 14 ? "danger" : "warning",
        title: `Quá hạn ${late} ngày: ${t.code} ${t.name}`,
        detail: `${pName(t.projectId)} · hoàn thành ${(a * 100).toFixed(1)}% · hạn ${t.plannedEnd.split("-").reverse().join("/")}`,
        projectId: t.projectId,
        link: `/construction/plan/${t.projectId}/task/${t.id}`,
      });
    }
  });
  getStockRows(db).forEach((r) => {
    if (r.status === "binh_thuong") return;
    out.push({
      id: `stock-${r.inv.id}`,
      kind: "vat_tu",
      severity: r.status === "thieu_hang" || r.status === "vuot_dinh_muc" ? "danger" : "warning",
      title:
        r.status === "thieu_hang"
          ? `Thiếu hụt vật tư: ${r.material.name}`
          : r.status === "vuot_dinh_muc"
            ? `Vượt định mức: ${r.material.name}`
            : `Sắp vượt định mức: ${r.material.name}`,
      detail:
        r.status === "thieu_hang"
          ? `${pName(r.inv.projectId)} · tồn ${r.onHand.toLocaleString("vi-VN")} ${r.material.unit} < tối thiểu ${r.inv.minStock.toLocaleString("vi-VN")} ${r.material.unit}`
          : `${pName(r.inv.projectId)} · đã xuất ${(r.usage * 100).toFixed(0)}% định mức dự toán`,
      projectId: r.inv.projectId,
      link: `/materials/stock/${r.inv.projectId}`,
    });
  });
  db.materialRequests.filter(isRequestOverdue).forEach((r) =>
    out.push({ id: `mr-${r.id}`, kind: "vat_tu", severity: "warning", title: `Đề xuất quá hạn cung ứng: ${r.title}`, detail: `${r.code} · cần trước ${r.neededDate.split("-").reverse().join("/")}`, projectId: r.projectId, link: `/materials/requests/${r.id}` }),
  );
  db.equipment.forEach((e) => {
    if (e.status === "bao_tri" && e.currentProjectId)
      out.push({ id: `eq-bt-${e.id}`, kind: "thiet_bi", severity: "warning", title: `Thiết bị không sẵn sàng: ${e.code} ${e.name}`, detail: `Đang bảo trì tại ${pName(e.currentProjectId)}`, projectId: e.currentProjectId, link: `/equipment/${e.id}` });
    else if (e.status === "hoat_dong" && maintenanceDue(e))
      out.push({ id: `eq-md-${e.id}`, kind: "thiet_bi", severity: "info", title: `Đến hạn bảo dưỡng: ${e.code} ${e.name}`, detail: `${maintenanceLeft(e)} đến kỳ bảo dưỡng (chu kỳ ${e.maintenanceInterval.toLocaleString("vi-VN")} ${meterUnit(e)}${e.maintenanceMonths ? ` hoặc ${e.maintenanceMonths} tháng` : ""})`, projectId: e.currentProjectId, link: `/equipment/${e.id}` });
  });
  const usage = getEquipmentUsage(db);
  usage.forEach((u, id) => {
    if (u.fuelNormTotal > 0 && u.fuel / u.fuelNormTotal > 1.08) {
      const e = db.equipment.find((x) => x.id === id)!;
      out.push({ id: `eq-fuel-${id}`, kind: "thiet_bi", severity: "warning", title: `Nhiên liệu vượt định mức: ${e.code} ${e.name}`, detail: `Tiêu hao ${(u.fuel / u.fuelNormTotal * 100).toFixed(0)}% định mức trong 3 tuần gần nhất`, projectId: e.currentProjectId, link: `/equipment/${id}` });
    }
  });
  db.paymentRecords.forEach((p) => {
    if (p.direction === "thu_cdt" && p.status !== "da_thanh_toan" && p.dueDate < DEMO_TODAY)
      out.push({ id: `pay-${p.id}`, kind: "thanh_toan", severity: "warning", title: `Hồ sơ thanh toán quá hạn thu: ${p.code}`, detail: `${pName(p.projectId)} · hạn ${p.dueDate.split("-").reverse().join("/")}`, projectId: p.projectId, link: `/payments?id=${p.id}` });
  });
  db.acceptanceRecords.forEach((a) => {
    if (a.status === "cho_cdt" && diffDays(a.createdAt, DEMO_TODAY) > 21)
      out.push({ id: `ac-${a.id}`, kind: "nghiem_thu", severity: "info", title: `Hồ sơ nghiệm thu chờ CĐT ký quá 3 tuần: ${a.code}`, detail: `${pName(a.projectId)} · ${a.title}`, projectId: a.projectId, link: `/acceptance/${a.id}` });
  });
  const rank = { danger: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
});

// ---------- lookups ----------
export const userName = (db: Database, id: ID | null | undefined) => db.users.find((u) => u.id === id)?.name ?? "—";
export const projectName = (db: Database, id: ID | null | undefined) => db.projects.find((p) => p.id === id)?.name ?? "—";
export const projectShort = (db: Database, id: ID | null | undefined) => db.projects.find((p) => p.id === id)?.shortName ?? "Chưa phân bổ";

/** Cảnh báo hồ sơ xe máy: hết hạn / sắp hết hạn kiểm định, bảo hiểm, thiếu chứng minh chủ sở hữu (thuê ngoài) */
export function equipmentDocWarnings(e: Equipment): { label: string; danger: boolean }[] {
  const out: { label: string; danger: boolean }[] = [];
  const chk = (d: string | null | undefined, name: string) => {
    if (!d) return;
    const left = diffDays(DEMO_TODAY, d);
    if (left < 0) out.push({ label: `Hết hạn ${name}`, danger: true });
    else if (left <= 30) out.push({ label: `Sắp hết hạn ${name} (${left} ngày)`, danger: false });
  };
  chk(e.inspectionDue, "kiểm định");
  chk(e.insuranceDue, "bảo hiểm");
  if (e.ownership === "thue_ngoai" && !e.ownerProof) out.push({ label: "Thiếu CM chủ sở hữu", danger: true });
  return out;
}

// ---------- doanh thu – chi phí ----------
/** Bốn khoản mục chi phí theo Bảng tổng hợp chi phí SXKD (phân hệ Kế toán) */
export const COST_KEYS = ["nvl", "nc", "mtc", "sxc"] as const;
export type CostKey = (typeof COST_KEYS)[number];
export const COST_LABEL: Record<CostKey, { short: string; label: string; color: string }> = {
  nvl: { short: "NVLTT", label: "Nguyên vật liệu trực tiếp", color: "#F97316" },
  nc: { short: "NCTT", label: "Nhân công trực tiếp", color: "#FDBA74" },
  mtc: { short: "CPMTC", label: "Chi phí máy thi công", color: "#C2410C" },
  sxc: { short: "CPSXC", label: "Chi phí sản xuất chung", color: "#94A3B8" },
};
export type CostBreakdown = Record<CostKey, number>;
const zeroCost = (): CostBreakdown => ({ nvl: 0, nc: 0, mtc: 0, sxc: 0 });
export const costTotal = (c: CostBreakdown) => c.nvl + c.nc + c.mtc + c.sxc;

/** Tỷ lệ chi phí dự toán / giá trị dự toán khối lượng của từng dự án (dùng cho chi phí kế hoạch) */
const planCostRatio = memo((db: Database) => {
  const m = new Map<ID, number>();
  db.projects.forEach((p) => {
    const v = db.constructionPlans.filter((t) => t.projectId === p.id && !t.isGroup).reduce((s, t) => s + taskValue(t), 0);
    m.set(p.id, v ? p.budget / v : p.costRatio);
  });
  return m;
});

/**
 * Doanh thu – chi phí theo dự án trong một năm:
 * doanh thu = giá trị khối lượng thực hiện (nhật ký × đơn giá HĐ); chi phí = chi phí thực tế phát sinh từ Kế toán (4 khoản mục)
 */
export function revenueCost(db: Database, projectIds: Set<ID>, year: number) {
  const price = new Map(db.constructionPlans.map((t) => [t.id, t.unitPrice]));
  const y = String(year);
  const byProject = new Map<ID, { revenue: number; cost: number } & CostBreakdown>();
  const get = (id: ID) => { let x = byProject.get(id); if (!x) { x = { revenue: 0, cost: 0, ...zeroCost() }; byProject.set(id, x); } return x; };
  db.constructionLogs.forEach((l) => {
    if (l.status === "nhap" || !projectIds.has(l.projectId) || l.date.slice(0, 4) !== y) return;
    get(l.projectId).revenue += l.qty * (price.get(l.taskId) ?? 0);
  });
  db.costEntries.forEach((c) => {
    if (!projectIds.has(c.projectId) || c.month.slice(0, 4) !== y) return;
    const x = get(c.projectId);
    COST_KEYS.forEach((k) => { x[k] += c[k]; });
    x.cost += costTotal(c);
  });
  return { byProject };
}

/** Doanh thu – chi phí lũy kế từ đầu năm theo tháng: kế hoạch (theo tiến độ kế hoạch, chi phí theo dự toán) và thực tế (nhật ký / Kế toán) */
export function revenueCostCumulative(db: Database, projectIds: Set<ID>, year: number) {
  const price = new Map(db.constructionPlans.map((t) => [t.id, t.unitPrice]));
  const ratio = planCostRatio(db);
  const tasks = db.constructionPlans.filter((t) => !t.isGroup && projectIds.has(t.projectId));
  const logs = db.constructionLogs.filter((l) => l.status !== "nhap" && projectIds.has(l.projectId) && l.date.slice(0, 4) === String(year));
  const costs = db.costEntries.filter((c) => projectIds.has(c.projectId) && c.month.slice(0, 4) === String(year));
  const yStart = `${year - 1}-12-31`;
  const today = DEMO_TODAY.slice(0, 7);
  return Array.from({ length: 12 }, (_, i) => {
    const m = `${year}-${String(i + 1).padStart(2, "0")}`;
    const eom = endOfMonth(m);
    let planRev = 0, planCost = 0;
    tasks.forEach((t) => {
      const v = (taskPlannedPct(t, eom) - taskPlannedPct(t, yStart)) * taskValue(t);
      planRev += v; planCost += v * (ratio.get(t.projectId) ?? 0.9);
    });
    let r = 0;
    logs.forEach((l) => { if (l.date <= eom) r += l.qty * (price.get(l.taskId) ?? 0); });
    const cb = zeroCost();
    costs.forEach((c) => { if (c.month <= m) COST_KEYS.forEach((k) => { cb[k] += c[k]; }); });
    const past = m <= today;
    return { month: m, label: `T${i + 1}`, planRev, planCost, rev: past ? r : null, cost: past ? costTotal(cb) : null, breakdown: past ? cb : null };
  });
}
