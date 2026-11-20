// ===== Domain types for ACC Construction PMS prototype =====

export type ID = string;

export type RoleKey =
  | "lanh_dao" // Ban Tổng Giám đốc / Lãnh đạo TCT
  | "phong_ktkt" // Phòng Kinh tế - Kỹ thuật / Kế hoạch - Kỹ thuật
  | "chi_huy_truong" // Chỉ huy trưởng công trường (CHT)
  | "to_truong" // Tổ trưởng / mũi trưởng
  | "bp_vat_tu" // Bộ phận vật tư
  | "phong_thiet_bi" // Phòng Thiết bị - Công nghệ / BP Xe máy
  | "ke_toan" // Phòng Tài chính - Kế toán / BP Kế toán
  | "admin"; // Quản trị hệ thống

export interface Department {
  id: ID;
  code: string;
  name: string;
  type: "ban_lanh_dao" | "co_quan" | "cong_ty_con" | "cong_truong" | "bo_phan";
  parentId: ID | null;
  head?: string;
}

export interface User {
  id: ID;
  code: string;
  name: string;
  role: RoleKey;
  title: string;
  departmentId: ID;
  phone: string;
  email: string;
  isDemoAccount?: boolean;
  /** công nhân kỹ thuật vận hành xe máy (CMKT) */
  isOperator?: boolean;
  team?: string;
}

export type ProjectCategory = "quoc_phong" | "giao_thong" | "dan_dung";
export type ProjectStatus = "chuan_bi" | "dang_thi_cong" | "tam_dung" | "hoan_thanh";
export type SettlementStatus = "chua_quyet_toan" | "dang_lap" | "da_trinh" | "da_quyet_toan";

export interface Project {
  id: ID;
  code: string;
  name: string;
  shortName: string;
  category: ProjectCategory;
  location: string;
  investor: string;
  contractor: string;
  unitId: ID; // đơn vị thành viên thực hiện
  commanderId: ID; // chỉ huy trưởng
  packageName: string; // gói thầu
  contractNo: string;
  contractDate: string;
  startDate: string;
  endDate: string;
  contractValue: number; // giá trị hợp đồng (VNĐ)
  budget: number; // ngân sách chi phí dự kiến
  costRatio: number; // tỷ lệ chi phí thực hiện / giá trị thực hiện (giả định)
  status: ProjectStatus;
  settlementStatus: SettlementStatus;
  memberIds: ID[];
  description: string;
  approvalStatus: "da_duyet" | "cho_duyet" | "tu_choi";
  province?: string; // tỉnh, thành (34 đơn vị sau sắp xếp 7/2025)
  lat?: number;
  lng?: number;
}

/** File đính kèm (prototype: lưu dạng data URL trên trình duyệt hoặc ảnh mẫu trong /assets) */
export interface Attachment {
  id: ID;
  name: string;
  type: string; // MIME
  size: number; // byte
  url: string | null;
}

/** Hợp đồng / phụ lục hợp đồng của dự án */
export interface Contract {
  id: ID;
  code: string;
  kind: "hop_dong" | "phu_luc";
  projectId: ID;
  parentId: ID | null; // phụ lục thuộc hợp đồng
  title: string;
  signDate: string;
  value: number; // giá trị HĐ, hoặc giá trị điều chỉnh của phụ lục (+/-)
  startDate: string;
  endDate: string;
  files: Attachment[];
  note: string;
}

export interface ConstructionItem {
  id: ID;
  projectId: ID;
  code: string; // 1.1.2
  name: string;
  order: number;
  managerId: ID;
}

export type TaskStatus = "chua_thuc_hien" | "dang_thuc_hien" | "hoan_thanh";

export interface PlanTask {
  id: ID;
  projectId: ID;
  itemId: ID;
  parentId: ID | null; // group task
  isGroup: boolean;
  code: string; // 1.1.2.2.4
  name: string;
  assigneeId: ID;
  team: string; // tổ đội
  unit: string;
  contractQty: number;
  unitPrice: number;
  actualQty: number;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  expectedEnd?: string | null; // dự kiến kết thúc (tổ trưởng cập nhật)
  status: TaskStatus;
  order: number;
  note?: string;
  /** công việc liền trước: FS = bắt đầu sau khi việc trước kết thúc, SS = bắt đầu cùng/sau khi việc trước bắt đầu */
  predecessors?: TaskDependency[];
  /** đánh giá chất lượng / nghiệm thu nội bộ */
  quality?: QualityEvaluation | null;
}

export interface TaskDependency {
  id: ID;
  type: "FS" | "SS";
}

export interface QualityEvaluation {
  result: "dat" | "khong_dat";
  byId: ID;
  at: string;
  note: string;
}

export interface LaborLine {
  role: string;
  grade: string;
  people: number;
  workdays: number;
}

export interface ConstructionLog {
  id: ID;
  projectId: ID;
  taskId: ID;
  date: string;
  qty: number;
  shift: string;
  weather: string;
  content: string;
  reporterId: ID;
  confirmedById: ID | null;
  status: "nhap" | "da_gui" | "da_xac_nhan";
  labor: LaborLine[];
  photos: string[]; // mock photo keys
}

export interface Material {
  id: ID;
  code: string;
  name: string;
  group: string;
  unit: string;
  unitPrice: number;
  spec: string;
}

export interface Supplier {
  id: ID;
  code: string;
  name: string;
  taxCode: string;
  address: string;
  contact: string;
  phone: string;
  materialGroups: string[];
  rating: number;
  debt: number; // công nợ hiện tại
}

export type MaterialRequestStatus =
  | "nhap"
  | "cho_duyet"
  | "da_duyet"
  | "tu_choi"
  | "tra_lai"
  | "dat_hang"
  | "da_nhap_kho"
  | "hoan_thanh";

export interface MaterialRequestLine {
  materialId: ID;
  qty: number;
  unitPrice: number;
  discount?: number; // chiết khấu %
  vat?: number; // thuế VAT %
}

export interface WorkflowEvent {
  at: string;
  byId: ID;
  action: string;
  note?: string;
}

export interface MaterialRequest {
  id: ID;
  code: string;
  title: string;
  type: "mua_vat_tu" | "dieu_chuyen" | "tam_ung";
  projectId: ID;
  itemId: ID | null;
  taskId: ID | null;
  team?: string; // tổ đội đề xuất
  requesterId: ID;
  approverId: ID;
  createdAt: string;
  neededDate: string;
  status: MaterialRequestStatus;
  lines: MaterialRequestLine[];
  supplierId: ID | null;
  orderNo: string | null;
  orderDate: string | null;
  expectedDelivery: string | null;
  starred: boolean;
  note: string;
  history: WorkflowEvent[];
}

export interface InventoryItem {
  id: ID;
  projectId: ID; // kho công trường
  materialId: ID;
  normQty: number; // định mức theo dự toán của công trình
  minStock: number; // tồn kho tối thiểu
  location: string; // vị trí kho
  // Số lượng nhập / xuất / tồn được tính từ stockTransactions
}

export interface StockTransaction {
  id: ID;
  code: string;
  type: "nhap" | "xuat";
  /** nhập: ncc | dieu_chuyen | tra_lai | kiem_ke; xuất: thi_cong | dieu_chuyen | tra_ncc | kiem_ke */
  subType?: string;
  docQty?: number; // số lượng theo chứng từ (đối chiếu)
  confirmed?: boolean;
  voucherCode?: string; // số phiếu (một phiếu có nhiều dòng vật tư)
  toProjectId?: ID | null; // điều chuyển sang kho dự án
  files?: Attachment[];
  projectId: ID;
  materialId: ID;
  qty: number;
  date: string;
  requestId: ID | null;
  taskId: ID | null;
  supplierId: ID | null;
  byId: ID;
  note: string;
}

export type EquipmentStatus = "hoat_dong" | "nhan_roi" | "bao_tri" | "ngung";

export interface MaintenanceRecord {
  id: ID;
  date: string;
  type: "bao_duong" | "sua_chua";
  content: string;
  cost: number;
  hoursAt: number;
}

export interface Equipment {
  id: ID;
  code: string;
  name: string;
  group: string;
  /** Ô tô / Xe biển đỏ (quân sự) / Máy thiết bị */
  kind: "o_to" | "xe_bien_do" | "may_thiet_bi";
  assetCode: string;
  chassisNo: string;
  engineNo: string;
  qualityGrade: string;
  decisionNo: string; // quyết định điều động về đơn vị / hợp đồng thuê
  inspectionDue: string | null; // hạn kiểm định
  insuranceDue: string | null; // hạn bảo hiểm
  ownerProof: boolean; // có chứng minh chủ sở hữu (thiết bị thuê ngoài)
  vetcCode?: string; // thẻ thu phí không dừng (xe biển đỏ)
  images?: Attachment[];
  docFiles?: Attachment[]; // giấy đăng ký, kiểm định, bảo hiểm...
  ownership: "so_huu" | "thue_ngoai";
  plate: string;
  brand: string;
  year: number;
  manageUnitId: ID;
  status: EquipmentStatus;
  currentProjectId: ID | null;
  operatorId: ID | null;
  totalHours: number;
  fuelNorm: number; // lít / giờ
  maintenanceInterval: number; // giờ
  lastMaintenanceHours: number;
  rentalSupplier?: string;
  rentalRate?: number; // đ / ca
  maintenances: MaintenanceRecord[];
}

export interface EquipmentAssignment {
  id: ID;
  code: string;
  equipmentId: ID;
  fromProjectId: ID | null;
  toProjectId: ID;
  operatorId: ID | null;
  startDate: string;
  endDate: string;
  status: "cho_duyet" | "da_duyet" | "dang_dieu_dong" | "hoan_thanh" | "tu_choi";
  /** de_xuat: đề xuất nhu cầu của dự án; dieu_chuyen: chuyển sang dự án khác; thu_hoi: thu hồi về TCT */
  kind?: "phan_bo" | "dieu_chuyen" | "thu_hoi";
  requesterId: ID;
  reason: string;
  createdAt: string;
}

export interface EquipmentShift {
  id: ID;
  equipmentId: ID;
  projectId: ID;
  date: string;
  shift: "Ca 1" | "Ca 2" | "Ca 3";
  operatorId: ID;
  hours: number;
  fuelLiters: number;
  output: string;
  note: string;
  km?: number;
  logged?: boolean; // đã cập nhật nhật trình
}

/** Giờ máy tổng hợp theo tháng tại một công trình (trước giai đoạn có ca máy chi tiết) */
export interface EquipmentUsageMonthly {
  id: ID;
  equipmentId: ID;
  projectId: ID;
  month: string; // YYYY-MM
  workingDays: number;
  hours: number;
  fuelLiters: number;
}

export type AcceptanceStatus = "nhap" | "cho_tvgs" | "cho_cdt" | "da_nghiem_thu" | "tra_lai";

export interface AcceptanceLine {
  taskId: ID;
  executedQty: number; // khối lượng thi công thực tế tại thời điểm lập
  acceptedQty: number; // khối lượng nghiệm thu
}

export interface AcceptanceRecord {
  id: ID;
  code: string;
  projectId: ID;
  itemId: ID | null;
  title: string;
  phase: string; // đợt
  type: "cong_viec" | "giai_doan" | "hoan_thanh";
  createdAt: string;
  acceptedAt: string | null;
  createdById: ID;
  status: AcceptanceStatus;
  lines: AcceptanceLine[];
  documents: string[];
  history: WorkflowEvent[];
  note: string;
}

export type PaymentStatus = "lap_ho_so" | "da_trinh" | "da_duyet" | "da_thanh_toan" | "thanh_toan_mot_phan";

export interface PaymentRecord {
  id: ID;
  code: string;
  direction: "thu_cdt" | "tra_ncc";
  projectId: ID;
  acceptanceIds: ID[];
  supplierId: ID | null;
  title: string;
  amount: number; // giá trị đề nghị
  retention: number; // giữ lại bảo hành / tạm ứng thu hồi
  paidAmount: number;
  createdAt: string;
  dueDate: string;
  paidAt: string | null;
  status: PaymentStatus;
  createdById: ID;
  history: WorkflowEvent[];
}

export interface Notification {
  id: ID;
  type: "approval" | "task" | "material" | "equipment" | "acceptance" | "payment" | "system";
  severity: "info" | "success" | "warning" | "danger";
  title: string;
  message: string;
  projectId: ID | null;
  link: string;
  createdAt: string;
  read: boolean;
}

export interface Issue {
  id: ID;
  code: string;
  projectId: ID;
  title: string;
  category: "ky_thuat" | "vat_tu" | "thiet_bi" | "an_toan" | "thoi_tiet" | "phap_ly";
  severity: "thap" | "trung_binh" | "cao";
  status: "moi" | "dang_xu_ly" | "da_xu_ly";
  reportedById: ID;
  assigneeId: ID;
  createdAt: string;
  dueDate: string;
  description: string;
}

// ===== Phân hệ bổ sung theo danh mục tính năng 18/11 =====
export interface VersionEntry {
  version: number;
  at: string;
  byId: ID;
  note: string;
}
export interface CommentEntry {
  id: ID;
  byId: ID;
  at: string;
  content: string;
}

/** Phương án tổ chức thi công */
export interface ConstructionMethod {
  id: ID;
  code: string;
  projectId: ID;
  itemId: ID | null;
  title: string;
  summary: string;
  status: "du_thao" | "cho_gop_y" | "da_duyet";
  version: number;
  createdById: ID;
  updatedAt: string;
  files: Attachment[];
  versions: VersionEntry[];
  comments: CommentEntry[];
}

/** Nhân sự thi công (chỉ huy, cán bộ kỹ thuật, công nhân, lao động phổ thông) */
export interface SiteStaff {
  id: ID;
  code: string;
  projectId: ID;
  name: string;
  type: "chi_huy" | "can_bo_ky_thuat" | "cong_nhan" | "lao_dong_pho_thong";
  position: string;
  team: string;
  phone: string;
  idNo: string;
  birthYear: number;
  hometown: string;
  joinDate: string;
  status: "dang_lam" | "da_nghi";
  certificates: string;
  safetyCard: boolean;
  healthCheck: string | null;
  idFront?: Attachment | null;
  idBack?: Attachment | null;
  certFiles?: Attachment[];
  safetyCardFile?: Attachment | null;
  healthFile?: Attachment | null;
}

export interface DocFolder {
  id: ID;
  projectId: ID;
  parentId: ID | null;
  name: string;
  order: number;
}
export interface SiteDocument {
  id: ID;
  projectId: ID;
  folderId: ID;
  name: string;
  fileType: string;
  sizeKb: number;
  version: number;
  uploadedById: ID;
  uploadedAt: string;
  versions: VersionEntry[];
  file?: Attachment | null;
}

/** Nhân viên chuyên môn kỹ thuật (lái xe, lái máy) */
export interface Operator {
  id: ID; // trùng id người dùng vận hành (op..)
  code: string;
  name: string;
  phone: string;
  rank: string; // cấp bậc
  contractType: string;
  licenses: OperatorLicense[];
  workerGrade: string; // bậc thợ
  salaryCoef: number;
  idNo: string;
  hometown: string;
  healthCheck: string;
  safetyCard: boolean;
  insurance24h: boolean;
  yearsExp: number;
  note: string;
}

/** Giấy phép lái xe / chứng chỉ vận hành của nhân viên CMKT */
export interface OperatorLicense {
  id: ID;
  kind: "gplx" | "chung_chi";
  no: string;
  name: string; // hạng GPLX (C, FC...) hoặc nội dung chứng chỉ (Vận hành máy lu...)
  military: boolean; // GPLX quân sự
  issueDate: string;
  expiry: string | null;
  file: Attachment | null;
}

export interface MaintenancePlan {
  id: ID;
  code: string;
  equipmentId: ID;
  type: "thuong_xuyen" | "dinh_ky" | "ra_tron" | "dac_biet";
  plannedDate: string;
  content: string;
  materials: string;
  status: "cho_duyet" | "da_duyet" | "hoan_thanh";
  createdById: ID;
  approvedById: ID | null;
  cost: number;
}

export interface RepairRequest {
  id: ID;
  code: string;
  equipmentId: ID;
  level: "nho" | "vua" | "lon";
  content: string;
  assigneeId: ID;
  deadline: string;
  createdAt: string;
  status: "moi" | "dang_sua" | "hoan_thanh";
  cost: number;
  result: string;
  documents: string;
}

export interface DisposalPlan {
  id: ID;
  code: string;
  equipmentId: ID;
  reason: string;
  method: "thanh_ly" | "ban_dau_gia" | "huy";
  residualValue: number;
  plannedDate: string;
  status: "lap_ke_hoach" | "cho_duyet" | "da_duyet" | "hoan_thanh";
  createdById: ID;
}

export interface Incident {
  id: ID;
  code: string;
  equipmentId: ID;
  operatorId: ID | null;
  projectId: ID | null;
  date: string;
  type: "tai_nan" | "hu_hong" | "va_cham";
  severity: "nhe" | "trung_binh" | "nghiem_trong";
  description: string;
  plan: string; // phương án xử lý
  planStatus: "chua_lap" | "cho_duyet" | "da_duyet";
  status: "moi" | "dang_xu_ly" | "da_xu_ly";
  progress: string;
}

export interface TransportRoute {
  id: ID;
  code: string;
  name: string;
  from: string;
  to: string;
  projectId: ID | null;
  lengthKm: number;
  avgMinutes: number;
  stops: string;
  conditions: string;
  points: [number, number][];
}

export interface Stocktake {
  id: ID;
  code: string;
  projectId: ID;
  date: string;
  byId: ID;
  status: "nhap" | "da_xu_ly";
  note: string;
  lines: { materialId: ID; bookQty: number; actualQty: number }[];
}

export interface LoginEntry {
  id: ID;
  userId: ID;
  at: string;
  ip: string;
  device: string;
  result: "thanh_cong" | "that_bai";
}

/** Toàn bộ dữ liệu demo */
/** Việc chỉ đạo: lãnh đạo giao trực tiếp từ màn hình báo cáo */
export interface Directive {
  id: ID;
  code: string;
  title: string;
  content: string;
  refLabel: string; // liên quan đến (dự án / XMTB / cảnh báo)
  link: string;
  projectId: ID | null;
  assigneeId: ID;
  assignedBy: ID;
  createdAt: string;
  dueDate: string;
  status: "dang_thuc_hien" | "hoan_thanh";
  completedAt?: string;
  result?: string;
  files?: Attachment[];
}

export interface Database {
  projects: Project[];
  users: User[];
  departments: Department[];
  constructionItems: ConstructionItem[];
  constructionPlans: PlanTask[];
  constructionLogs: ConstructionLog[];
  materials: Material[];
  suppliers: Supplier[];
  materialRequests: MaterialRequest[];
  inventory: InventoryItem[];
  stockTransactions: StockTransaction[];
  equipment: Equipment[];
  equipmentAssignments: EquipmentAssignment[];
  equipmentShifts: EquipmentShift[];
  equipmentUsage: EquipmentUsageMonthly[];
  acceptanceRecords: AcceptanceRecord[];
  paymentRecords: PaymentRecord[];
  notifications: Notification[];
  issues: Issue[];
  constructionMethods: ConstructionMethod[];
  siteStaff: SiteStaff[];
  docFolders: DocFolder[];
  documents: SiteDocument[];
  operators: Operator[];
  maintenancePlans: MaintenancePlan[];
  repairs: RepairRequest[];
  disposals: DisposalPlan[];
  incidents: Incident[];
  routes: TransportRoute[];
  stocktakes: Stocktake[];
  contracts: Contract[];
  loginHistory: LoginEntry[];
  directives: Directive[];
}

export type CollectionKey = keyof Database;
