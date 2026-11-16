/**
 * Các nghiệp vụ mô phỏng (hàm thuần): nhận DB hiện tại → trả về DB mới.
 * Được gọi qua `run(fn, ...args)` của DbProvider, kết quả được lưu vào localStorage.
 */
import type {
  AcceptanceRecord,
  AcceptanceStatus,
  ConstructionLog,
  Database,
  Equipment,
  EquipmentAssignment,
  EquipmentShift,
  ID,
  Issue,
  Material,
  MaterialRequest,
  MaterialRequestLine,
  Notification,
  PaymentRecord,
  PlanTask,
  Project,
  StockTransaction,
  Supplier,
  WorkflowEvent,
} from "@/types";
import { DEMO_TODAY, nowStamp } from "@/utils/date";
import { genId, nextCode } from "@/utils/id";
import type { ImportRow } from "./planExcel";

type Key = keyof Database;
function setCol<K extends Key>(db: Database, key: K, value: Database[K]): Database {
  return { ...db, [key]: value };
}
function patch<K extends Key>(db: Database, key: K, id: ID, changes: Partial<Database[K][number]>): Database {
  const list = db[key] as unknown as { id: ID }[];
  return setCol(db, key, list.map((x) => (x.id === id ? { ...x, ...changes } : x)) as unknown as Database[K]);
}
function insert<K extends Key>(db: Database, key: K, item: Database[K][number], atStart = false): Database {
  const list = db[key] as unknown as unknown[];
  return setCol(db, key, (atStart ? [item, ...list] : [...list, item]) as unknown as Database[K]);
}
function remove<K extends Key>(db: Database, key: K, pred: (x: Database[K][number]) => boolean): Database {
  const list = db[key] as unknown as Database[K][number][];
  return setCol(db, key, list.filter((x) => !pred(x)) as unknown as Database[K]);
}
const ev = (byId: ID, action: string, note?: string): WorkflowEvent => ({ at: nowStamp(), byId, action, note });

export function pushNotification(db: Database, n: Omit<Notification, "id" | "createdAt" | "read">): Database {
  return insert(db, "notifications", { ...n, id: genId("nt"), createdAt: nowStamp(), read: false }, true);
}
export const markNotificationRead = (db: Database, id: ID) => patch(db, "notifications", id, { read: true });
export const markAllNotificationsRead = (db: Database) => setCol(db, "notifications", db.notifications.map((n) => ({ ...n, read: true })));

// ======================= DỰ ÁN =======================
export type ProjectInput = Omit<Project, "id" | "memberIds" | "approvalStatus" | "settlementStatus"> & { memberIds?: ID[] };
export function createProject(db: Database, input: ProjectInput, byId: ID): Database {
  const p: Project = { ...input, id: genId("p"), memberIds: input.memberIds ?? [input.commanderId], approvalStatus: "cho_duyet", settlementStatus: "chua_quyet_toan" };
  db = insert(db, "projects", p, true);
  return pushNotification(db, { type: "approval", severity: "info", title: "Đơn xin nhận thi công mới", message: `${p.name} chờ Tổng công ty phê duyệt.`, projectId: p.id, link: `/projects/${p.id}` });
  void byId;
}
export const updateProject = (db: Database, id: ID, changes: Partial<Project>) => patch(db, "projects", id, changes);
export function deleteProject(db: Database, id: ID): Database {
  const taskIds = new Set(db.constructionPlans.filter((t) => t.projectId === id).map((t) => t.id));
  db = remove(db, "projects", (p) => p.id === id);
  db = remove(db, "constructionItems", (x) => x.projectId === id);
  db = remove(db, "constructionPlans", (x) => x.projectId === id);
  db = remove(db, "constructionLogs", (x) => taskIds.has(x.taskId));
  db = remove(db, "materialRequests", (x) => x.projectId === id);
  db = remove(db, "inventory", (x) => x.projectId === id);
  db = remove(db, "stockTransactions", (x) => x.projectId === id);
  db = remove(db, "acceptanceRecords", (x) => x.projectId === id);
  db = remove(db, "paymentRecords", (x) => x.projectId === id);
  db = remove(db, "issues", (x) => x.projectId === id);
  db = remove(db, "equipmentUsage", (x) => x.projectId === id);
  db = remove(db, "equipmentShifts", (x) => x.projectId === id);
  db = setCol(db, "equipment", db.equipment.map((e) => (e.currentProjectId === id ? { ...e, currentProjectId: null, status: "nhan_roi", operatorId: null } : e)));
  return db;
}
/** QT quản lý dự án tổng thể: TCT phê duyệt đơn xin nhận thi công → ban hành quyết định phân giao nhiệm vụ */
export function decideProject(db: Database, id: ID, approve: boolean, note: string): Database {
  const p = db.projects.find((x) => x.id === id)!;
  db = patch(db, "projects", id, { approvalStatus: approve ? "da_duyet" : "tu_choi", status: approve ? "chuan_bi" : p.status });
  return pushNotification(db, {
    type: "approval",
    severity: approve ? "success" : "danger",
    title: approve ? "Đã ban hành quyết định phân giao nhiệm vụ" : "Đơn xin nhận thi công bị từ chối",
    message: `${p.name}${note ? ` – ${note}` : ""}`,
    projectId: id,
    link: `/projects/${id}`,
  });
}

// ======================= KẾ HOẠCH THI CÔNG =======================
export function createItem(db: Database, projectId: ID, name: string, managerId: ID): Database {
  const items = db.constructionItems.filter((i) => i.projectId === projectId);
  const order = items.length + 1;
  const prefix = items[0]?.code.split(".").slice(0, -1).join(".") || "1.1";
  return insert(db, "constructionItems", { id: genId("i"), projectId, code: `${prefix}.${order}`, name, order, managerId });
}
export function deleteItem(db: Database, itemId: ID): Database {
  const ids = new Set(db.constructionPlans.filter((t) => t.itemId === itemId).map((t) => t.id));
  db = remove(db, "constructionItems", (i) => i.id === itemId);
  db = remove(db, "constructionPlans", (t) => t.itemId === itemId);
  return remove(db, "constructionLogs", (l) => ids.has(l.taskId));
}
export type TaskInput = Pick<PlanTask, "projectId" | "itemId" | "parentId" | "name" | "assigneeId" | "team" | "unit" | "contractQty" | "unitPrice" | "plannedStart" | "plannedEnd" | "isGroup"> & { note?: string };
export function createTask(db: Database, input: TaskInput): Database {
  const siblings = db.constructionPlans.filter((t) => t.itemId === input.itemId && t.parentId === input.parentId);
  const parentCode = input.parentId ? db.constructionPlans.find((t) => t.id === input.parentId)!.code : db.constructionItems.find((i) => i.id === input.itemId)!.code;
  const order = Math.max(0, ...db.constructionPlans.filter((t) => t.projectId === input.projectId).map((t) => t.order)) + 1;
  const task: PlanTask = {
    ...input,
    id: genId("t"),
    code: `${parentCode}.${siblings.length + 1}`,
    actualQty: 0,
    actualStart: null,
    actualEnd: null,
    status: "chua_thuc_hien",
    order,
    note: input.note ?? "",
  };
  db = insert(db, "constructionPlans", task);
  const assignee = db.users.find((u) => u.id === input.assigneeId);
  return pushNotification(db, { type: "task", severity: "info", title: "Giao việc mới", message: `${task.code} ${task.name} được giao cho ${assignee?.name ?? ""}.`, projectId: input.projectId, link: `/construction/plan/${input.projectId}?task=${task.id}` });
}
export const updateTask = (db: Database, id: ID, changes: Partial<PlanTask>) => patch(db, "constructionPlans", id, changes);
export function deleteTask(db: Database, id: ID): Database {
  const ids = new Set([id, ...db.constructionPlans.filter((t) => t.parentId === id).map((t) => t.id)]);
  db = remove(db, "constructionPlans", (t) => ids.has(t.id));
  return remove(db, "constructionLogs", (l) => ids.has(l.taskId));
}

/** Nhập kế hoạch từ Excel: tạo hạng mục còn thiếu (theo mã) và thêm các công việc */
export function importPlanTasks(db: Database, projectId: ID, rows: ImportRow[]): Database {
  const project = db.projects.find((p) => p.id === projectId)!;
  let order = Math.max(0, ...db.constructionPlans.filter((t) => t.projectId === projectId).map((t) => t.order));
  rows.forEach((r) => {
    let item = db.constructionItems.find((i) => i.projectId === projectId && ((r.itemCode && i.code === r.itemCode) || (!r.itemCode && r.itemName && i.name === r.itemName)));
    if (!item) {
      const items = db.constructionItems.filter((i) => i.projectId === projectId);
      const prefix = items[0]?.code.split(".").slice(0, -1).join(".") || "1.1";
      item = { id: genId("i"), projectId, code: r.itemCode || `${prefix}.${items.length + 1}`, name: r.itemName || "Hạng mục nhập từ Excel", order: items.length + 1, managerId: project.commanderId };
      db = insert(db, "constructionItems", item);
    }
    const siblings = db.constructionPlans.filter((t) => t.itemId === item!.id && t.parentId === null).length;
    const assignee = db.users.find((u) => u.name.toLowerCase() === r.assigneeName.toLowerCase());
    db = insert(db, "constructionPlans", {
      id: genId("t"), projectId, itemId: item.id, parentId: null, isGroup: false, code: `${item.code}.${siblings + 1}`, name: r.name,
      assigneeId: assignee?.id ?? project.commanderId, team: r.team, unit: r.unit, contractQty: r.qty, unitPrice: r.unitPrice, actualQty: 0,
      plannedStart: r.start, plannedEnd: r.end, actualStart: null, actualEnd: null, status: "chua_thuc_hien", order: ++order, note: "Nhập từ Excel",
    });
  });
  return pushNotification(db, { type: "task", severity: "info", title: "Đã nhập kế hoạch từ Excel", message: `${rows.length} công việc được thêm vào ${project.shortName}.`, projectId, link: `/construction/plan/${projectId}` });
}

export type LogInput = Omit<ConstructionLog, "id" | "projectId" | "confirmedById">;
/**
 * QT Tổ chức & theo dõi thi công: Tổ trưởng báo cáo kết quả, ghi nhận khối lượng thực hiện
 * → cập nhật lũy kế đầu việc → tiến độ hạng mục, dự án, dashboard tự tính lại.
 */
export function addConstructionLog(db: Database, input: LogInput, statusOverride?: PlanTask["status"]): Database {
  const task = db.constructionPlans.find((t) => t.id === input.taskId)!;
  const log: ConstructionLog = { ...input, id: genId("lg"), projectId: task.projectId, confirmedById: null };
  db = insert(db, "constructionLogs", log, true);
  if (input.status === "nhap") return db; // lưu nháp: chưa cộng khối lượng
  const newQty = Math.round((task.actualQty + input.qty) * 100) / 100;
  const completed = task.contractQty > 0 ? newQty >= task.contractQty : statusOverride === "hoan_thanh";
  const status = statusOverride ?? (completed ? "hoan_thanh" : newQty > 0 ? "dang_thuc_hien" : task.status);
  db = patch(db, "constructionPlans", task.id, {
    actualQty: newQty,
    status,
    actualStart: task.actualStart ?? input.date,
    actualEnd: status === "hoan_thanh" ? input.date : null,
    note: input.content || task.note,
  });
  const p = db.projects.find((x) => x.id === task.projectId)!;
  return pushNotification(db, { type: "task", severity: "info", title: "Nhật ký thi công mới chờ xác nhận", message: `${task.code} ${task.name}: +${input.qty.toLocaleString("vi-VN")} ${task.unit}.`, projectId: p.id, link: `/construction/logs?project=${p.id}` });
}
export const confirmLog = (db: Database, id: ID, byId: ID) => patch(db, "constructionLogs", id, { status: "da_xac_nhan", confirmedById: byId });
export function deleteLog(db: Database, id: ID): Database {
  const log = db.constructionLogs.find((l) => l.id === id)!;
  db = remove(db, "constructionLogs", (l) => l.id === id);
  if (log.status === "nhap") return db;
  const task = db.constructionPlans.find((t) => t.id === log.taskId);
  if (!task) return db;
  const qty = Math.max(0, Math.round((task.actualQty - log.qty) * 100) / 100);
  return patch(db, "constructionPlans", task.id, { actualQty: qty, status: qty <= 0 ? "chua_thuc_hien" : qty >= task.contractQty ? "hoan_thanh" : "dang_thuc_hien", actualEnd: qty >= task.contractQty ? task.actualEnd : null });
}

// ======================= VẬT TƯ =======================
export const createMaterial = (db: Database, m: Omit<Material, "id">) => insert(db, "materials", { ...m, id: genId("m") });
export const updateMaterial = (db: Database, id: ID, c: Partial<Material>) => patch(db, "materials", id, c);
export const deleteMaterial = (db: Database, id: ID) => remove(db, "materials", (m) => m.id === id);
export const createSupplier = (db: Database, s: Omit<Supplier, "id" | "debt">) => insert(db, "suppliers", { ...s, id: genId("s"), debt: 0 });
export const updateSupplier = (db: Database, id: ID, c: Partial<Supplier>) => patch(db, "suppliers", id, c);
export const deleteSupplier = (db: Database, id: ID) => remove(db, "suppliers", (s) => s.id === id);

export type RequestInput = Pick<MaterialRequest, "title" | "type" | "projectId" | "itemId" | "taskId" | "neededDate" | "note" | "approverId"> & { lines: MaterialRequestLine[] };
export function saveRequest(db: Database, input: RequestInput, byId: ID, submit: boolean, existingId?: ID): Database {
  if (existingId) {
    const r = db.materialRequests.find((x) => x.id === existingId)!;
    db = patch(db, "materialRequests", existingId, {
      ...input,
      status: submit ? "cho_duyet" : r.status === "tra_lai" ? "tra_lai" : "nhap",
      history: [...r.history, ev(byId, submit ? "Cập nhật và gửi phê duyệt" : "Cập nhật đề xuất")],
    });
  } else {
    const code = nextCode("ĐXVT-2026-", db.materialRequests.map((x) => x.code));
    const r: MaterialRequest = {
      ...input,
      id: genId("mr"),
      code,
      requesterId: byId,
      createdAt: DEMO_TODAY,
      status: submit ? "cho_duyet" : "nhap",
      supplierId: null,
      orderNo: null,
      orderDate: null,
      expectedDelivery: null,
      starred: false,
      history: [ev(byId, submit ? "Tạo đề xuất" : "Tạo đề xuất (lưu nháp)"), ...(submit ? [ev(byId, "Gửi phê duyệt")] : [])],
    };
    db = insert(db, "materialRequests", r, true);
    existingId = r.id;
  }
  if (submit) {
    const r = db.materialRequests.find((x) => x.id === existingId)!;
    db = pushNotification(db, { type: "approval", severity: "warning", title: "Đề xuất vật tư chờ phê duyệt", message: `${r.code} – ${r.title}`, projectId: r.projectId, link: `/materials/requests/${r.id}` });
  }
  return db;
}
export function submitRequest(db: Database, id: ID, byId: ID): Database {
  const r = db.materialRequests.find((x) => x.id === id)!;
  db = patch(db, "materialRequests", id, { status: "cho_duyet", history: [...r.history, ev(byId, "Gửi phê duyệt")] });
  return pushNotification(db, { type: "approval", severity: "warning", title: "Đề xuất vật tư chờ phê duyệt", message: `${r.code} – ${r.title}`, projectId: r.projectId, link: `/materials/requests/${r.id}` });
}
export function decideRequest(db: Database, id: ID, decision: "da_duyet" | "tu_choi" | "tra_lai", byId: ID, note: string): Database {
  const r = db.materialRequests.find((x) => x.id === id)!;
  const action = decision === "da_duyet" ? "Phê duyệt" : decision === "tu_choi" ? "Từ chối" : "Trả lại";
  db = patch(db, "materialRequests", id, { status: decision, history: [...r.history, ev(byId, action, note)] });
  return pushNotification(db, {
    type: "material",
    severity: decision === "da_duyet" ? "success" : "danger",
    title: `Đề xuất vật tư ${action.toLowerCase()}`,
    message: `${r.code} – ${r.title}${note ? `: ${note}` : ""}`,
    projectId: r.projectId,
    link: `/materials/requests/${r.id}`,
  });
}
/** BP Vật tư: kiểm tra tồn kho – còn hàng thì xuất trực tiếp từ kho */
export function fulfillFromStock(db: Database, id: ID, byId: ID): Database {
  const r = db.materialRequests.find((x) => x.id === id)!;
  r.lines.forEach((l) => {
    db = issueStock(db, { projectId: r.projectId, materialId: l.materialId, qty: l.qty, date: DEMO_TODAY, taskId: r.taskId, requestId: r.id, byId, note: `Xuất từ tồn kho theo đề xuất ${r.code}` });
  });
  const cur = db.materialRequests.find((x) => x.id === id)!;
  return patch(db, "materialRequests", id, { status: "hoan_thanh", history: [...cur.history, ev(byId, "Kiểm tra tồn kho: còn hàng"), ev(byId, "Xuất sử dụng", "Xuất trực tiếp từ tồn kho công trường")] });
}
/** Hết hàng → Lựa chọn NCC → Thực hiện mua hàng */
export function placeOrder(db: Database, id: ID, supplierId: ID, orderNo: string, expectedDelivery: string, byId: ID): Database {
  const r = db.materialRequests.find((x) => x.id === id)!;
  const s = db.suppliers.find((x) => x.id === supplierId)!;
  return patch(db, "materialRequests", id, {
    status: "dat_hang",
    supplierId,
    orderNo,
    orderDate: DEMO_TODAY,
    expectedDelivery,
    history: [...r.history, ev(byId, "Tổng hợp nhu cầu, kiểm tra tồn kho", "Tồn kho không đủ đáp ứng"), ev(byId, "Chọn nhà cung cấp & đặt hàng", `${s.name} – ${orderNo}`)],
  });
}
/** Nhập kho hàng về theo đề xuất */
export function receiveRequest(db: Database, id: ID, byId: ID): Database {
  const r = db.materialRequests.find((x) => x.id === id)!;
  r.lines.forEach((l) => {
    db = receiveStock(db, { projectId: r.projectId, materialId: l.materialId, qty: l.qty, date: DEMO_TODAY, supplierId: r.supplierId, requestId: r.id, byId, note: `Nhập kho theo đề xuất ${r.code}` });
  });
  db = patch(db, "materialRequests", id, { status: "da_nhap_kho", history: [...r.history, ev(byId, "Nhập kho")] });
  const amount = r.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  if (r.supplierId) {
    db = insert(db, "paymentRecords", {
      id: genId("pay"),
      code: nextCode("TTNCC-2026-", db.paymentRecords.filter((p) => p.direction === "tra_ncc").map((p) => p.code)),
      direction: "tra_ncc",
      projectId: r.projectId,
      acceptanceIds: [],
      supplierId: r.supplierId,
      title: `Thanh toán tiền vật tư theo ${r.code} – ${r.title}`,
      amount: Math.round(amount),
      retention: 0,
      paidAmount: 0,
      createdAt: DEMO_TODAY,
      dueDate: addDaysLocal(DEMO_TODAY, 30),
      paidAt: null,
      status: "lap_ho_so",
      createdById: byId,
      history: [ev(byId, "Tự động lập đề nghị thanh toán NCC khi nhập kho")],
    });
    db = syncSupplierDebt(db);
  }
  return db;
}
/** Xuất sử dụng phần hàng đã nhập theo đề xuất */
export function issueRequest(db: Database, id: ID, byId: ID): Database {
  const r = db.materialRequests.find((x) => x.id === id)!;
  r.lines.forEach((l) => {
    db = issueStock(db, { projectId: r.projectId, materialId: l.materialId, qty: l.qty, date: DEMO_TODAY, taskId: r.taskId, requestId: r.id, byId, note: `Xuất sử dụng theo đề xuất ${r.code}` });
  });
  return patch(db, "materialRequests", id, { status: "hoan_thanh", history: [...r.history, ev(byId, "Xuất sử dụng")] });
}
export const toggleStar = (db: Database, id: ID) => patch(db, "materialRequests", id, { starred: !db.materialRequests.find((x) => x.id === id)!.starred });
export const deleteRequest = (db: Database, id: ID) => remove(db, "materialRequests", (r) => r.id === id);

type TxInput = Omit<StockTransaction, "id" | "code" | "type" | "supplierId" | "requestId" | "taskId"> & { supplierId?: ID | null; requestId?: ID | null; taskId?: ID | null };
function ensureInventory(db: Database, projectId: ID, materialId: ID): Database {
  if (db.inventory.some((i) => i.projectId === projectId && i.materialId === materialId)) return db;
  const p = db.projects.find((x) => x.id === projectId);
  return insert(db, "inventory", { id: genId("inv"), projectId, materialId, normQty: 0, minStock: 0, location: `Kho công trường ${p?.shortName ?? ""}` });
}
export function receiveStock(db: Database, t: TxInput): Database {
  db = ensureInventory(db, t.projectId, t.materialId);
  const code = nextCode("PNK-", db.stockTransactions.filter((x) => x.type === "nhap").map((x) => x.code), 4);
  return insert(db, "stockTransactions", { supplierId: null, requestId: null, taskId: null, ...t, id: genId("tx"), code, type: "nhap" });
}
export function issueStock(db: Database, t: TxInput): Database {
  db = ensureInventory(db, t.projectId, t.materialId);
  const code = nextCode("PXK-", db.stockTransactions.filter((x) => x.type === "xuat").map((x) => x.code), 4);
  return insert(db, "stockTransactions", { supplierId: null, requestId: null, taskId: null, ...t, id: genId("tx"), code, type: "xuat" });
}
export const updateInventory = (db: Database, id: ID, c: { normQty?: number; minStock?: number }) => patch(db, "inventory", id, c);

// ======================= XE MÁY THIẾT BỊ =======================
export const createEquipment = (db: Database, e: Omit<Equipment, "id" | "maintenances">) => insert(db, "equipment", { ...e, id: genId("eq"), maintenances: [] }, true);
export const updateEquipment = (db: Database, id: ID, c: Partial<Equipment>) => patch(db, "equipment", id, c);
export function deleteEquipment(db: Database, id: ID): Database {
  db = remove(db, "equipment", (e) => e.id === id);
  db = remove(db, "equipmentAssignments", (a) => a.equipmentId === id);
  db = remove(db, "equipmentUsage", (u) => u.equipmentId === id);
  return remove(db, "equipmentShifts", (s) => s.equipmentId === id);
}
/** Bước 1 – Dự án gửi yêu cầu sử dụng thiết bị */
export function requestDispatch(db: Database, input: Pick<EquipmentAssignment, "equipmentId" | "toProjectId" | "operatorId" | "startDate" | "endDate" | "reason">, byId: ID): Database {
  const e = db.equipment.find((x) => x.id === input.equipmentId)!;
  const code = nextCode("QĐ-ĐĐ-2026-", db.equipmentAssignments.map((a) => a.code));
  db = insert(db, "equipmentAssignments", { ...input, id: genId("as"), code, fromProjectId: e.currentProjectId, status: "cho_duyet", requesterId: byId, createdAt: DEMO_TODAY }, true);
  return pushNotification(db, { type: "equipment", severity: "warning", title: "Đề nghị điều động thiết bị", message: `${e.code} ${e.name} → ${db.projects.find((p) => p.id === input.toProjectId)?.shortName}`, projectId: input.toProjectId, link: "/equipment/dispatch" });
}
/** Bước 2 – Phòng xe máy kiểm tra, phân công người vận hành, ban hành quyết định điều động */
export function approveDispatch(db: Database, id: ID, operatorId: ID | null): Database {
  const a = db.equipmentAssignments.find((x) => x.id === id)!;
  // kết thúc điều động hiện tại của thiết bị
  db = setCol(db, "equipmentAssignments", db.equipmentAssignments.map((x) =>
    x.equipmentId === a.equipmentId && x.status === "dang_dieu_dong" ? { ...x, status: "hoan_thanh", endDate: DEMO_TODAY } : x.id === id ? { ...x, status: "dang_dieu_dong", operatorId: operatorId ?? x.operatorId } : x,
  ));
  db = patch(db, "equipment", a.equipmentId, { currentProjectId: a.toProjectId, status: "hoat_dong", operatorId: operatorId ?? a.operatorId });
  const e = db.equipment.find((x) => x.id === a.equipmentId)!;
  return pushNotification(db, { type: "equipment", severity: "success", title: "Đã ban hành quyết định điều động", message: `${a.code}: ${e.code} ${e.name} đến ${db.projects.find((p) => p.id === a.toProjectId)?.shortName}`, projectId: a.toProjectId, link: `/equipment/${e.id}` });
}
export const rejectDispatch = (db: Database, id: ID) => patch(db, "equipmentAssignments", id, { status: "tu_choi" });
export function releaseEquipment(db: Database, equipmentId: ID): Database {
  db = setCol(db, "equipmentAssignments", db.equipmentAssignments.map((x) => (x.equipmentId === equipmentId && x.status === "dang_dieu_dong" ? { ...x, status: "hoan_thanh", endDate: DEMO_TODAY } : x)));
  return patch(db, "equipment", equipmentId, { currentProjectId: null, status: "nhan_roi", operatorId: null });
}
/** Bước 3–5 – ghi nhận ca máy, giờ máy, nhiên liệu */
export function addShift(db: Database, s: Omit<EquipmentShift, "id">): Database {
  db = insert(db, "equipmentShifts", { ...s, id: genId("sh") }, true);
  const e = db.equipment.find((x) => x.id === s.equipmentId)!;
  return patch(db, "equipment", e.id, { totalHours: Math.round((e.totalHours + s.hours) * 10) / 10 });
}
export const deleteShift = (db: Database, id: ID) => remove(db, "equipmentShifts", (s) => s.id === id);
export function addMaintenance(db: Database, equipmentId: ID, m: { type: "bao_duong" | "sua_chua"; content: string; cost: number; date: string }, finish: boolean): Database {
  const e = db.equipment.find((x) => x.id === equipmentId)!;
  return patch(db, "equipment", equipmentId, {
    maintenances: [{ ...m, id: genId("mt"), hoursAt: e.totalHours }, ...e.maintenances],
    lastMaintenanceHours: m.type === "bao_duong" ? e.totalHours : e.lastMaintenanceHours,
    status: finish ? (e.currentProjectId ? "hoat_dong" : "nhan_roi") : "bao_tri",
  });
}

// ======================= NGHIỆM THU =======================
export type AcceptanceInput = Pick<AcceptanceRecord, "projectId" | "itemId" | "title" | "phase" | "type" | "lines" | "documents" | "note">;
export function createAcceptance(db: Database, input: AcceptanceInput, byId: ID): Database {
  const p = db.projects.find((x) => x.id === input.projectId)!;
  const code = nextCode(`BBNT-${p.code}-`, db.acceptanceRecords.filter((a) => a.projectId === p.id).map((a) => a.code));
  return insert(db, "acceptanceRecords", { ...input, id: genId("ac"), code, createdAt: DEMO_TODAY, acceptedAt: null, createdById: byId, status: "nhap", history: [ev(byId, "Lập hồ sơ nghiệm thu")] }, true);
}
export const updateAcceptance = (db: Database, id: ID, c: Partial<AcceptanceRecord>) => patch(db, "acceptanceRecords", id, c);
export const deleteAcceptance = (db: Database, id: ID) => remove(db, "acceptanceRecords", (a) => a.id === id);
const AC_FLOW: Record<string, { next: AcceptanceStatus; action: string }> = {
  nhap: { next: "cho_tvgs", action: "Trình TVGS kiểm tra" },
  tra_lai: { next: "cho_tvgs", action: "Trình lại TVGS" },
  cho_tvgs: { next: "cho_cdt", action: "TVGS xác nhận, trình Chủ đầu tư" },
  cho_cdt: { next: "da_nghiem_thu", action: "Chủ đầu tư ký biên bản nghiệm thu" },
};
export const acceptanceNextAction = (s: AcceptanceStatus) => AC_FLOW[s];
export function advanceAcceptance(db: Database, id: ID, byId: ID, note?: string): Database {
  const a = db.acceptanceRecords.find((x) => x.id === id)!;
  const step = AC_FLOW[a.status];
  if (!step) return db;
  db = patch(db, "acceptanceRecords", id, { status: step.next, acceptedAt: step.next === "da_nghiem_thu" ? DEMO_TODAY : a.acceptedAt, history: [...a.history, ev(byId, step.action, note)] });
  if (step.next === "da_nghiem_thu")
    db = pushNotification(db, { type: "acceptance", severity: "success", title: "Hồ sơ đã được nghiệm thu", message: `${a.code} – có thể lập hồ sơ thanh toán`, projectId: a.projectId, link: `/acceptance/${a.id}` });
  return db;
}
export function returnAcceptance(db: Database, id: ID, byId: ID, note: string): Database {
  const a = db.acceptanceRecords.find((x) => x.id === id)!;
  return patch(db, "acceptanceRecords", id, { status: "tra_lai", history: [...a.history, ev(byId, "Trả lại hồ sơ", note)] });
}

// ======================= THANH TOÁN =======================
export function createPayment(db: Database, input: Pick<PaymentRecord, "projectId" | "acceptanceIds" | "title" | "amount" | "retention" | "dueDate">, byId: ID): Database {
  const p = db.projects.find((x) => x.id === input.projectId)!;
  const code = nextCode(`HSTT-${p.code}-`, db.paymentRecords.filter((x) => x.projectId === p.id && x.direction === "thu_cdt").map((x) => x.code));
  return insert(db, "paymentRecords", { ...input, id: genId("pay"), code, direction: "thu_cdt", supplierId: null, paidAmount: 0, createdAt: DEMO_TODAY, paidAt: null, status: "lap_ho_so", createdById: byId, history: [ev(byId, "Lập hồ sơ thanh toán")] }, true);
}
export function advancePayment(db: Database, id: ID, byId: ID, paidNow?: number): Database {
  const p = db.paymentRecords.find((x) => x.id === id)!;
  const net = p.amount - p.retention;
  let changes: Partial<PaymentRecord> = {};
  if (p.status === "lap_ho_so") changes = { status: "da_trinh", history: [...p.history, ev(byId, p.direction === "thu_cdt" ? "Trình Chủ đầu tư" : "Trình Kế toán trưởng")] };
  else if (p.status === "da_trinh") changes = { status: "da_duyet", history: [...p.history, ev(byId, p.direction === "thu_cdt" ? "Chủ đầu tư phê duyệt giá trị thanh toán" : "Kế toán trưởng phê duyệt")] };
  else if (p.status === "da_duyet" || p.status === "thanh_toan_mot_phan") {
    const paid = Math.min(net, p.paidAmount + (paidNow ?? net - p.paidAmount));
    const full = paid >= net - 1;
    changes = { paidAmount: paid, paidAt: DEMO_TODAY, status: full ? "da_thanh_toan" : "thanh_toan_mot_phan", history: [...p.history, ev(byId, full ? (p.direction === "thu_cdt" ? "Đã nhận thanh toán đủ" : "Đã chuyển khoản cho NCC") : "Ghi nhận thanh toán một phần", `${Math.round(paid - p.paidAmount).toLocaleString("vi-VN")} đ`)] };
  }
  db = patch(db, "paymentRecords", id, changes);
  return syncSupplierDebt(db);
}
export const deletePayment = (db: Database, id: ID) => syncSupplierDebt(remove(db, "paymentRecords", (p) => p.id === id));
function syncSupplierDebt(db: Database): Database {
  return setCol(db, "suppliers", db.suppliers.map((s) => ({ ...s, debt: db.paymentRecords.filter((p) => p.supplierId === s.id).reduce((x, p) => x + p.amount - p.paidAmount, 0) })));
}

// ======================= VẤN ĐỀ PHÁT SINH =======================
export function saveIssue(db: Database, input: Omit<Issue, "id" | "code">, id?: ID): Database {
  if (id) return patch(db, "issues", id, input);
  const code = nextCode("VĐ-", db.issues.map((i) => i.code), 4);
  return insert(db, "issues", { ...input, id: genId("is"), code }, true);
}
export const deleteIssue = (db: Database, id: ID) => remove(db, "issues", (i) => i.id === id);

// ======================= NGƯỜI DÙNG =======================
export const saveUser = (db: Database, u: Database["users"][number]) =>
  db.users.some((x) => x.id === u.id) ? patch(db, "users", u.id, u) : insert(db, "users", u, true);
export const deleteUser = (db: Database, id: ID) => remove(db, "users", (u) => u.id === id);

function addDaysLocal(s: string, n: number) {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
