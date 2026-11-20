/**
 * Các nghiệp vụ mô phỏng (hàm thuần): nhận DB hiện tại → trả về DB mới.
 * Được gọi qua `run(fn, ...args)` của DbProvider, kết quả được lưu vào localStorage.
 */
import type {
  Attachment,
  AcceptanceRecord,
  AcceptanceStatus,
  ConstructionLog,
  Contract,
  Database,
  Directive,
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
import { requestValue } from "./selectors";

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
  // TCT tạo dự án và giao nhiệm vụ cho đơn vị luôn (không qua bước xét duyệt)
  const p: Project = { ...input, id: genId("p"), memberIds: input.memberIds ?? [input.commanderId], approvalStatus: "da_duyet", settlementStatus: "chua_quyet_toan" };
  db = insert(db, "projects", p, true);
  if (p.contractValue > 0 || p.contractNo) {
    const c: Contract = { id: genId("hd"), code: p.contractNo || `HĐ-${p.code}`, kind: "hop_dong", projectId: p.id, parentId: null, title: `Hợp đồng thi công xây dựng – ${p.shortName}`, signDate: p.contractDate, value: p.contractValue, startDate: p.startDate, endDate: p.endDate, files: [], note: "" };
    db = insert(db, "contracts", c, true);
  }
  const unit = db.departments.find((d) => d.id === p.unitId)?.name ?? "";
  return pushNotification(db, { type: "task", severity: "info", title: "Giao nhiệm vụ dự án mới", message: `${p.name} được giao cho ${unit} – CHT ${db.users.find((u) => u.id === p.commanderId)?.name ?? ""}.`, projectId: p.id, link: `/projects/${p.id}` });
  void byId;
}
/** Giá trị hợp đồng của dự án = hợp đồng + cộng dồn các phụ lục */
function syncProjectValue(db: Database, projectId: ID): Database {
  const cs = db.contracts.filter((c) => c.projectId === projectId);
  if (!cs.length) return db;
  return patch(db, "projects", projectId, { contractValue: cs.reduce((s, c) => s + c.value, 0) });
}
export function saveContract(db: Database, c: Contract): Database {
  const before = db.contracts.find((x) => x.id === c.id);
  db = saveRow(db, "contracts", c);
  db = syncProjectValue(db, c.projectId);
  return before && before.projectId !== c.projectId ? syncProjectValue(db, before.projectId) : db;
}
export function deleteContract(db: Database, id: ID): Database {
  const c = db.contracts.find((x) => x.id === id);
  if (!c) return db;
  db = remove(db, "contracts", (x) => x.id === id || x.parentId === id);
  return syncProjectValue(db, c.projectId);
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
export type TaskInput = Pick<PlanTask, "projectId" | "itemId" | "parentId" | "name" | "assigneeId" | "team" | "unit" | "contractQty" | "unitPrice" | "plannedStart" | "plannedEnd" | "isGroup"> & { note?: string; predecessors?: PlanTask["predecessors"] };
export function createTask(db: Database, input: TaskInput): Database {
  const siblings = db.constructionPlans.filter((t) => t.itemId === input.itemId && t.parentId === input.parentId);
  const parentCode = input.parentId ? db.constructionPlans.find((t) => t.id === input.parentId)!.code : db.constructionItems.find((i) => i.id === input.itemId)!.code;
  const order = Math.max(0, ...db.constructionPlans.filter((t) => t.projectId === input.projectId).map((t) => t.order)) + 1;
  const task: PlanTask = {
    ...input,
    id: genId("t"),
    code: (() => {
      const codes = db.constructionPlans.filter((t) => t.projectId === input.projectId).map((t) => t.code);
      // dự án đánh số ID liên tục (như tiến độ MS Project) → lấy số tiếp theo
      return codes.length && codes.every((c) => /^\d+$/.test(c)) ? String(Math.max(...codes.map(Number)) + 1) : `${parentCode}.${siblings.length + 1}`;
    })(),
    actualQty: 0,
    actualStart: null,
    actualEnd: null,
    status: "chua_thuc_hien",
    order,
    note: input.note ?? "",
  };
  db = insert(db, "constructionPlans", task);
  const assignee = db.users.find((u) => u.id === input.assigneeId);
  return pushNotification(db, { type: "task", severity: "info", title: "Giao việc mới", message: `${task.code} ${task.name} được giao cho ${assignee?.name ?? ""}.`, projectId: input.projectId, link: `/construction/plan/${input.projectId}/task/${task.id}` });
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
/** Tính lại khối lượng lũy kế, trạng thái, ngày bắt đầu / kết thúc thực tế của công việc từ các lần cập nhật hằng ngày */
export function recomputeTask(db: Database, taskId: ID): Database {
  const task = db.constructionPlans.find((t) => t.id === taskId);
  if (!task) return db;
  const logs = db.constructionLogs.filter((l) => l.taskId === taskId && l.status !== "nhap").sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let cum = 0;
  let doneAt: string | null = null;
  logs.forEach((l) => { cum = Math.round((cum + l.qty) * 100) / 100; if (!doneAt && task.contractQty > 0 && cum >= task.contractQty) doneAt = l.date; });
  const status: PlanTask["status"] = doneAt ? "hoan_thanh" : cum > 0 ? "dang_thuc_hien" : "chua_thuc_hien";
  return patch(db, "constructionPlans", taskId, { actualQty: cum, status, actualStart: logs[0]?.date ?? null, actualEnd: doneAt });
}
/**
 * QT Tổ chức & theo dõi thi công: cập nhật khối lượng hằng ngày (cộng dồn)
 * → lũy kế công việc → tiến độ hạng mục, dự án, dashboard tự tính lại.
 */
export function addConstructionLog(db: Database, input: LogInput): Database {
  const task = db.constructionPlans.find((t) => t.id === input.taskId)!;
  const log: ConstructionLog = { ...input, id: genId("lg"), projectId: task.projectId, confirmedById: null };
  db = insert(db, "constructionLogs", log, true);
  if (input.status === "nhap") return db; // lưu nháp: chưa cộng khối lượng
  db = recomputeTask(db, task.id);
  const p = db.projects.find((x) => x.id === task.projectId)!;
  return pushNotification(db, { type: "task", severity: "info", title: "Cập nhật khối lượng mới", message: `${task.code} ${task.name}: +${input.qty.toLocaleString("vi-VN")} ${task.unit} (${input.date.split("-").reverse().join("/")}).`, projectId: p.id, link: `/construction/plan/${p.id}/task/${task.id}` });
}
export function updateConstructionLog(db: Database, id: ID, changes: Partial<ConstructionLog>): Database {
  const log = db.constructionLogs.find((l) => l.id === id);
  if (!log) return db;
  return recomputeTask(patch(db, "constructionLogs", id, changes), log.taskId);
}
export const confirmLog = (db: Database, id: ID, byId: ID) => patch(db, "constructionLogs", id, { status: "da_xac_nhan", confirmedById: byId });
export function deleteLog(db: Database, id: ID): Database {
  const log = db.constructionLogs.find((l) => l.id === id);
  if (!log) return db;
  return recomputeTask(remove(db, "constructionLogs", (l) => l.id === id), log.taskId);
}

// ======================= VẬT TƯ =======================
export const createMaterial = (db: Database, m: Omit<Material, "id">) => insert(db, "materials", { ...m, id: genId("m") });
export const updateMaterial = (db: Database, id: ID, c: Partial<Material>) => patch(db, "materials", id, c);
export const deleteMaterial = (db: Database, id: ID) => remove(db, "materials", (m) => m.id === id);
export const createSupplier = (db: Database, s: Omit<Supplier, "id" | "debt">) => insert(db, "suppliers", { ...s, id: genId("s"), debt: 0 });
export const updateSupplier = (db: Database, id: ID, c: Partial<Supplier>) => patch(db, "suppliers", id, c);
export const deleteSupplier = (db: Database, id: ID) => remove(db, "suppliers", (s) => s.id === id);

export type RequestInput = Pick<MaterialRequest, "title" | "type" | "projectId" | "itemId" | "taskId" | "neededDate" | "note" | "approverId" | "team"> & { lines: MaterialRequestLine[] };
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
  const amount = requestValue(r);
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

// ======================= DANH MỤC ĐƠN GIẢN (dùng chung) =======================
/** Thêm mới hoặc cập nhật một bản ghi theo id trong collection */
export function saveRow<K extends Key>(db: Database, key: K, row: Database[K][number] & { id: ID }): Database {
  const list = db[key] as unknown as { id: ID }[];
  return list.some((x) => x.id === row.id) ? patch(db, key, row.id, row) : insert(db, key, row, true);
}
export function deleteRow<K extends Key>(db: Database, key: K, id: ID): Database {
  return remove(db, key, (x) => (x as unknown as { id: ID }).id === id);
}

/** Xử lý chênh lệch kiểm kê: tạo phiếu điều chỉnh tồn kho (nhập thừa / xuất thiếu) và khóa phiếu kiểm kê */
export function processStocktake(db: Database, id: ID, byId: ID): Database {
  const st = db.stocktakes.find((x) => x.id === id);
  if (!st) return db;
  let next = db;
  st.lines.forEach((l) => {
    const diff = Math.round((l.actualQty - l.bookQty) * 100) / 100;
    if (!diff) return;
    const codes = next.stockTransactions.map((t) => t.code);
    const type = diff > 0 ? "nhap" : "xuat";
    const tx: StockTransaction = {
      id: genId("tx"), code: nextCode(type === "nhap" ? "PNK-" : "PXK-", codes, 4), type, subType: "kiem_ke", projectId: st.projectId, materialId: l.materialId,
      qty: Math.abs(diff), docQty: Math.abs(diff), confirmed: true, date: DEMO_TODAY, requestId: null, taskId: null, supplierId: null, byId, note: `Điều chỉnh tồn kho theo phiếu kiểm kê ${st.code}`,
    };
    next = insert(next, "stockTransactions", tx);
  });
  return patch(next, "stocktakes", id, { status: "da_xu_ly" });
}

/** Thu hồi XMTB về Tổng công ty: kết thúc quyết định điều động hiện hành, máy về trạng thái nhàn rỗi */
export function recallEquipment(db: Database, assignmentId: ID, byId: ID): Database {
  const a = db.equipmentAssignments.find((x) => x.id === assignmentId);
  if (!a) return db;
  let next = patch(db, "equipmentAssignments", a.id, { status: "hoan_thanh", endDate: DEMO_TODAY });
  next = patch(next, "equipment", a.equipmentId, { status: "nhan_roi", currentProjectId: null, operatorId: null });
  const rec: EquipmentAssignment = {
    id: genId("as"), code: nextCode("QĐ-TH-2026-", next.equipmentAssignments.map((x) => x.code)), equipmentId: a.equipmentId, fromProjectId: a.toProjectId, toProjectId: "",
    operatorId: null, startDate: DEMO_TODAY, endDate: DEMO_TODAY, status: "hoan_thanh", kind: "thu_hoi", requesterId: byId, reason: "Thu hồi thiết bị về kho Tổng công ty", createdAt: DEMO_TODAY,
  };
  return insert(next, "equipmentAssignments", rec, true);
}

/** Phân ca: xếp 1 nhân viên CMKT vận hành máy trong 1 ca (null = bỏ phân ca nếu chưa có nhật trình) */
export function assignShift(db: Database, equipmentId: ID, projectId: ID, date: string, shift: EquipmentShift["shift"], operatorId: ID | null): Database {
  const cur = db.equipmentShifts.find((s) => s.equipmentId === equipmentId && s.date === date && s.shift === shift);
  if (!operatorId) return cur && cur.logged === false ? remove(db, "equipmentShifts", (s) => s.id === cur.id) : db;
  if (cur) return patch(db, "equipmentShifts", cur.id, { operatorId });
  return insert(db, "equipmentShifts", { id: genId("sh"), equipmentId, projectId, date, shift, operatorId, hours: 0, fuelLiters: 0, output: "", note: "", km: 0, logged: false }, true);
}
/** Nhật trình cuối ca: giờ máy / km, khối lượng, nhiên liệu → cộng giờ máy cho thiết bị */
export function logShift(db: Database, id: ID, data: { hours: number; km: number; fuelLiters: number; output: string; note: string }): Database {
  const s = db.equipmentShifts.find((x) => x.id === id);
  if (!s) return db;
  const e = db.equipment.find((x) => x.id === s.equipmentId)!;
  const delta = data.hours - (s.logged ? s.hours : 0);
  db = patch(db, "equipmentShifts", id, { ...data, logged: true });
  return patch(db, "equipment", e.id, { totalHours: Math.round((e.totalHours + delta) * 10) / 10 });
}

// ======================= PHIẾU NHẬP / XUẤT NHIỀU DÒNG =======================
export interface VoucherLine { materialId: ID; docQty: number; qty: number }
export interface VoucherHeader {
  type: "nhap" | "xuat";
  subType: string; // nhập: ncc | dieu_chuyen | tra_lai; xuất: thi_cong | dieu_chuyen | tra_ncc
  projectId: ID;
  date: string;
  supplierId: ID | null;
  taskId: ID | null;
  toProjectId: ID | null; // xuất điều chuyển sang kho dự án khác
  note: string;
  files: Attachment[];
}
/** Lập phiếu nhập / xuất gồm nhiều dòng vật tư; xác nhận thì mới cập nhật tồn kho.
 *  Xuất điều chuyển tự sinh phiếu nhập (chờ xác nhận) ở kho nhận. */
export function createVoucher(db: Database, h: VoucherHeader, lines: VoucherLine[], byId: ID, confirm: boolean): Database {
  const prefix = h.type === "nhap" ? "PNK-" : "PXK-";
  const codes = db.stockTransactions.filter((x) => x.type === h.type).map((x) => x.voucherCode ?? x.code);
  const voucherCode = nextCode(prefix, codes, 4);
  lines.filter((l) => l.materialId && l.qty > 0).forEach((l, i) => {
    db = ensureInventory(db, h.projectId, l.materialId);
    db = insert(db, "stockTransactions", {
      id: genId("tx"), code: `${voucherCode}.${i + 1}`, voucherCode, type: h.type, subType: h.subType, projectId: h.projectId, materialId: l.materialId, qty: l.qty, docQty: l.docQty || l.qty, confirmed: confirm,
      date: h.date, requestId: null, taskId: h.taskId, supplierId: h.supplierId, toProjectId: h.toProjectId, byId, note: h.note, files: h.files,
    });
  });
  if (h.type === "xuat" && h.subType === "dieu_chuyen" && h.toProjectId) {
    const from = db.projects.find((p) => p.id === h.projectId)?.shortName;
    db = createVoucher(db, { ...h, type: "nhap", projectId: h.toProjectId, toProjectId: null, note: `Nhận điều chuyển từ kho ${from} (${voucherCode})` }, lines, byId, false);
  }
  return db;
}
export function confirmVoucher(db: Database, voucherCode: string): Database {
  return setCol(db, "stockTransactions", db.stockTransactions.map((t) => ((t.voucherCode ?? t.code) === voucherCode ? { ...t, confirmed: true } : t)));
}
export function deleteVoucher(db: Database, voucherCode: string): Database {
  return remove(db, "stockTransactions", (t) => (t.voucherCode ?? t.code) === voucherCode);
}

// ---------- Công việc điều hành ----------
export type DirectiveInput = Pick<Directive, "title" | "content" | "projectId" | "assigneeId" | "dueDate" | "followerIds" | "attachments">;
const dueVi = (d: string) => d.split("-").reverse().join("/");
export function createDirective(db: Database, input: DirectiveInput, byId: ID): Database {
  const code = nextCode("CV-", db.directives.map((d) => d.code));
  const id = genId("cv");
  const who = db.users.find((u) => u.id === input.assigneeId)?.name ?? "";
  const next = insert(db, "directives", { ...input, id, code, assignedBy: byId, createdAt: DEMO_TODAY, status: "dang_thuc_hien", comments: [], files: [] }, true);
  return pushNotification(next, { type: "task", severity: "info", title: `Công việc mới: ${input.title}`, message: `${code} · giao cho ${who} · hạn ${dueVi(input.dueDate)}`, projectId: input.projectId, link: `/directives?id=${id}` });
}
export function addDirectiveComment(db: Database, id: ID, userId: ID, text: string): Database {
  const d = db.directives.find((x) => x.id === id);
  if (!d) return db;
  return patch(db, "directives", id, { comments: [...(d.comments ?? []), { id: genId("cm"), userId, at: `${DEMO_TODAY}T${new Date().toTimeString().slice(0, 8)}`, text }] });
}
export function completeDirective(db: Database, id: ID, result: string, files: Attachment[]): Database {
  const d = db.directives.find((x) => x.id === id);
  const next = patch(db, "directives", id, { status: "hoan_thanh", completedAt: DEMO_TODAY, result, files });
  return d ? pushNotification(next, { type: "task", severity: "success", title: `Đã hoàn thành: ${d.title}`, message: `${d.code} · ${db.users.find((u) => u.id === d.assigneeId)?.name ?? ""} đã báo cáo hoàn thành`, projectId: d.projectId, link: `/directives?id=${id}` }) : next;
}
