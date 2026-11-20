import type {
  AcceptanceStatus,
  EquipmentStatus,
  Issue,
  MaterialRequest,
  MaterialRequestStatus,
  PaymentStatus,
  ProjectCategory,
  ProjectStatus,
  RoleKey,
  SettlementStatus,
  TaskStatus,
} from "@/types";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "primary" | "purple";
export interface LabelTone {
  label: string;
  tone: Tone;
}

export const ROLE_LABELS: Record<RoleKey, string> = {
  lanh_dao: "Lãnh đạo Tổng công ty",
  phong_ktkt: "Phòng Kế hoạch - Kỹ thuật",
  chi_huy_truong: "Chỉ huy trưởng công trường",
  to_truong: "Tổ trưởng / Mũi trưởng",
  bp_vat_tu: "Bộ phận Vật tư",
  phong_thiet_bi: "Phòng Thiết bị / BP Xe máy",
  ke_toan: "Tài chính - Kế toán",
  admin: "Quản trị hệ thống",
};

export const ROLE_DESCRIPTIONS: Record<RoleKey, string> = {
  lanh_dao: "Giám sát tổng thể, xem dashboard, phê duyệt dự án & điều động thiết bị",
  phong_ktkt: "Lập, phân giao kế hoạch thi công, theo dõi tiến độ, nghiệm thu",
  chi_huy_truong: "Phân giao công việc, xác nhận nhật ký, phê duyệt đề xuất vật tư",
  to_truong: "Tiếp nhận công việc, cập nhật khối lượng & nhật ký thi công",
  bp_vat_tu: "Lập đề xuất, chọn NCC, đặt hàng, nhập – xuất kho",
  phong_thiet_bi: "Quản lý xe máy, điều động, ca máy, nhiên liệu, bảo dưỡng",
  ke_toan: "Đối chiếu khối lượng, hồ sơ thanh toán, công nợ, quyết toán",
  admin: "Quản lý người dùng, vai trò, danh mục và dữ liệu demo",
};

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  quoc_phong: "Công trình quốc phòng",
  giao_thong: "Công trình giao thông",
  dan_dung: "Công trình dân dụng",
};

export const PROJECT_STATUS: Record<ProjectStatus, LabelTone> = {
  chuan_bi: { label: "Chưa thi công", tone: "neutral" },
  dang_thi_cong: { label: "Đang thi công", tone: "info" },
  tam_dung: { label: "Tạm dừng", tone: "warning" },
  hoan_thanh: { label: "Hoàn thành", tone: "success" },
};

export type ScheduleHealth = "dung_tien_do" | "nguy_co_cham" | "cham_tien_do" | "chua_bat_dau" | "hoan_thanh";
export const HEALTH: Record<ScheduleHealth, LabelTone> = {
  dung_tien_do: { label: "Đúng tiến độ", tone: "success" },
  nguy_co_cham: { label: "Có nguy cơ chậm", tone: "warning" },
  cham_tien_do: { label: "Chậm tiến độ", tone: "danger" },
  chua_bat_dau: { label: "Chưa khởi công", tone: "neutral" },
  hoan_thanh: { label: "Hoàn thành", tone: "success" },
};
/** Trạng thái dự án (chỉ 3 giá trị) – dự án chưa thi công / hoàn thành không có trạng thái */
export const PROJECT_HEALTH: Record<string, LabelTone> = { dung_tien_do: HEALTH.dung_tien_do, nguy_co_cham: HEALTH.nguy_co_cham, cham_tien_do: HEALTH.cham_tien_do };

export const SETTLEMENT_STATUS: Record<SettlementStatus, LabelTone> = {
  chua_quyet_toan: { label: "Chưa quyết toán", tone: "neutral" },
  dang_lap: { label: "Đang lập hồ sơ quyết toán", tone: "warning" },
  da_trinh: { label: "Đã trình quyết toán", tone: "info" },
  da_quyet_toan: { label: "Đã quyết toán", tone: "success" },
};

export const TASK_STATUS: Record<TaskStatus, LabelTone> = {
  chua_thuc_hien: { label: "Chưa thực hiện", tone: "neutral" },
  dang_thuc_hien: { label: "Đang thực hiện", tone: "info" },
  hoan_thanh: { label: "Hoàn thành", tone: "success" },
};

export const MR_STATUS: Record<MaterialRequestStatus, LabelTone> = {
  nhap: { label: "Lưu nháp", tone: "neutral" },
  cho_duyet: { label: "Chờ duyệt", tone: "warning" },
  da_duyet: { label: "Đã phê duyệt", tone: "success" },
  tu_choi: { label: "Từ chối", tone: "danger" },
  tra_lai: { label: "Trả lại", tone: "purple" },
  dat_hang: { label: "Đang đặt hàng", tone: "info" },
  da_nhap_kho: { label: "Đã nhập kho", tone: "primary" },
  hoan_thanh: { label: "Hoàn thành", tone: "success" },
};
export const MR_TYPE: Record<MaterialRequest["type"], string> = {
  mua_vat_tu: "Đề xuất mua vật tư",
  dieu_chuyen: "Đề xuất điều chuyển vật tư",
  tam_ung: "Đề xuất tạm ứng",
};

export const EQUIPMENT_STATUS: Record<EquipmentStatus, LabelTone> = {
  hoat_dong: { label: "Hoạt động", tone: "success" },
  nhan_roi: { label: "Nhàn rỗi", tone: "neutral" },
  bao_tri: { label: "Bảo trì", tone: "warning" },
  ngung: { label: "Ngừng sử dụng", tone: "danger" },
};

export const ASSIGNMENT_STATUS: Record<string, LabelTone> = {
  cho_duyet: { label: "Chờ duyệt", tone: "warning" },
  da_duyet: { label: "Đã duyệt", tone: "info" },
  dang_dieu_dong: { label: "Đang điều động", tone: "success" },
  hoan_thanh: { label: "Đã kết thúc", tone: "neutral" },
  tu_choi: { label: "Từ chối", tone: "danger" },
};

export const ACCEPTANCE_STATUS: Record<AcceptanceStatus, LabelTone> = {
  nhap: { label: "Đang lập", tone: "neutral" },
  cho_tvgs: { label: "Chờ TVGS xác nhận", tone: "warning" },
  cho_cdt: { label: "Chờ CĐT ký", tone: "info" },
  da_nghiem_thu: { label: "Đã nghiệm thu", tone: "success" },
  tra_lai: { label: "Bị trả lại", tone: "danger" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, LabelTone> = {
  lap_ho_so: { label: "Đang lập hồ sơ", tone: "neutral" },
  da_trinh: { label: "Đã trình", tone: "warning" },
  da_duyet: { label: "Đã phê duyệt", tone: "info" },
  thanh_toan_mot_phan: { label: "Thanh toán một phần", tone: "purple" },
  da_thanh_toan: { label: "Đã thanh toán", tone: "success" },
};

export const ISSUE_CATEGORY: Record<Issue["category"], string> = {
  ky_thuat: "Kỹ thuật",
  vat_tu: "Vật tư",
  thiet_bi: "Thiết bị",
  an_toan: "An toàn lao động",
  thoi_tiet: "Thời tiết",
  phap_ly: "Mặt bằng / pháp lý",
};
export const ISSUE_SEVERITY: Record<Issue["severity"], LabelTone> = {
  thap: { label: "Thấp", tone: "neutral" },
  trung_binh: { label: "Trung bình", tone: "warning" },
  cao: { label: "Cao", tone: "danger" },
};
export const ISSUE_STATUS: Record<Issue["status"], LabelTone> = {
  moi: { label: "Mới", tone: "danger" },
  dang_xu_ly: { label: "Đang xử lý", tone: "warning" },
  da_xu_ly: { label: "Đã xử lý", tone: "success" },
};

export const PHOTO_LABELS: Record<string, string> = {
  concrete: "Đổ bê tông",
  excavation: "Đào đất hố móng",
  formwork: "Lắp dựng ván khuôn",
  finishing: "Công tác hoàn thiện",
  site: "Toàn cảnh công trường",
  paving: "Thi công mặt đường",
  piling: "Ép cọc",
  pipe: "Lắp đặt đường ống",
  rebar: "Gia công cốt thép",
  lighting: "Lắp đèn tín hiệu",
  team: "Tổ đội thi công",
};

/** Ngưỡng đánh giá tiến độ (điểm %) – giả định cho prototype */
export const SCHEDULE_THRESHOLDS = { atRisk: -3, delayed: -10 };
export const CHART_COLORS = {
  plan: "#94A3B8",
  actual: "#E60028",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#E11D48",
  info: "#2563EB",
  navy: "#1E2A44",
  teal: "#0D9488",
  purple: "#7C3AED",
};

/** Bảng màu chuỗi dữ liệu (đã kiểm tra CVD bằng validator) – gán theo thứ tự cố định */
export const SERIES = ["#2563EB", "#E60028", "#0D9488", "#D97706", "#7C3AED"];
export const CATEGORY_COLORS: Record<ProjectCategory, string> = { quoc_phong: SERIES[2], giao_thong: SERIES[0], dan_dung: SERIES[3] };
