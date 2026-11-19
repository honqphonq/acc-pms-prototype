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

export type TaskHealth = "hoan_thanh" | "qua_han" | "cham" | "dung" | "chua_bat_dau";
export function taskHealth(t: { actual: number; planned: number; plannedEnd: string; plannedStart: string }): TaskHealth {
  if (t.actual >= 1) return "hoan_thanh";
  if (t.plannedEnd < DEMO_TODAY) return "qua_han";
  if (t.planned - t.actual > 0.15) return "cham";
  if (t.plannedStart > DEMO_TODAY && t.actual === 0) return "chua_bat_dau";
  return "dung";
}
export const TASK_HEALTH_LABEL: Record<TaskHealth, { label: string; tone: "success" | "danger" | "warning" | "info" | "neutral" }> = {
  hoan_thanh: { label: "Hoàn thành", tone: "success" },
  qua_han: { label: "Quá hạn", tone: "danger" },
  cham: { label: "Chậm", tone: "warning" },
  dung: { label: "Đúng kế hoạch", tone: "info" },
  chua_bat_dau: { label: "Chưa đến hạn", tone: "neutral" },
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
          return { task: t, depth, value, doneValue, planned, actual, health: taskHealth({ actual, planned, plannedEnd: t.plannedEnd, plannedStart: t.plannedStart }), children };
        }
        const planned = taskPlannedPct(t);
        const actual = taskActualPct(t);
        return { task: t, depth, value: taskValue(t), doneValue: taskDoneValue(t), planned, actual, health: taskHealth({ actual, planned, plannedEnd: t.plannedEnd, plannedStart: t.plannedStart }), children };
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

/** Số ngày trễ hạn tối đa của công việc quá hạn để coi là "Chậm tiến độ" (giả định) */
export const LATE_DAYS_DELAYED = 14;

/**
 * Trạng thái tiến độ dự án – xác định theo thời hạn của các công việc:
 * - Chậm tiến độ: có công việc quá hạn kết thúc kế hoạch > 14 ngày mà chưa hoàn thành
 * - Có nguy cơ chậm: có công việc quá hạn (≤ 14 ngày) hoặc công việc đang làm chậm hơn tiến độ thời gian kế hoạch
 * - Đúng tiến độ: các công việc đều đang trong thời hạn
 */
export function healthOf(o: { status: Project["status"]; actual: number; started: boolean; maxDaysLate: number; tasksOverdue: number; tasksBehind: number }): { health: ScheduleHealth; reason: string } {
  if (o.status === "hoan_thanh" || o.actual >= 1) return { health: "hoan_thanh", reason: "Đã hoàn thành toàn bộ công việc" };
  if (o.status === "chuan_bi" && !o.started) return { health: "chua_bat_dau", reason: "Chưa đến thời gian thi công" };
  if (o.maxDaysLate > LATE_DAYS_DELAYED) return { health: "cham_tien_do", reason: `${o.tasksOverdue} công việc quá hạn, trễ nhất ${o.maxDaysLate} ngày` };
  if (o.tasksOverdue > 0) return { health: "nguy_co_cham", reason: `${o.tasksOverdue} công việc quá hạn ${o.maxDaysLate} ngày` };
  if (o.tasksBehind > 0) return { health: "nguy_co_cham", reason: `${o.tasksBehind} công việc đang chậm so với thời gian kế hoạch` };
  return { health: "dung_tien_do", reason: "Các công việc đều trong thời hạn kế hoạch" };
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
    const h = healthOf({ status: p.status, actual, started: ts.some((t) => t.actualQty > 0), maxDaysLate, tasksOverdue: overdue.length, tasksBehind });
    map.set(p.id, {
      project: p,
      planValue,
      execValue,
      planned,
      actual,
      delta,
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
      cost: execValue * p.costRatio,
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
export const maintenanceDue = (e: Equipment) => e.totalHours - e.lastMaintenanceHours >= e.maintenanceInterval * 0.9;
export const getEquipmentUsage = memo((db: Database) => {
  const from = addDays(DEMO_TODAY, -21);
  const map = new Map<ID, { hours: number; fuel: number; shifts: number; fuelNormTotal: number }>();
  db.equipmentShifts.filter((s) => s.date >= from).forEach((s) => {
    const e = db.equipment.find((x) => x.id === s.equipmentId);
    const cur = map.get(s.equipmentId) ?? { hours: 0, fuel: 0, shifts: 0, fuelNormTotal: 0 };
    cur.hours += s.hours;
    cur.fuel += s.fuelLiters;
    cur.shifts += 1;
    cur.fuelNormTotal += s.hours * (e?.fuelNorm ?? 0);
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
      out.push({ id: `eq-md-${e.id}`, kind: "thiet_bi", severity: "info", title: `Đến hạn bảo dưỡng: ${e.code} ${e.name}`, detail: `${e.totalHours - e.lastMaintenanceHours} giờ kể từ lần bảo dưỡng gần nhất (chu kỳ ${e.maintenanceInterval} giờ)`, projectId: e.currentProjectId, link: `/equipment/${e.id}` });
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
