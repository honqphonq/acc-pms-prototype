import {
  Building2, Calculator, LayoutDashboard, Settings, Truck, BookOpenCheck, HardHat, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  children?: { label: string; to: string; soon?: boolean }[];
  badgeKey?: "alerts" | "approvals";
}

/** Menu theo “Danh mục tính năng phần mềm quản lý thi công xây dựng – ACC” (cập nhật 18/11) */
export const NAV: NavItem[] = [
  { label: "Trang chủ", to: "/", icon: LayoutDashboard },
  {
    label: "Quản lý công trình", to: "/projects", icon: Building2,
    children: [
      { label: "Danh sách công trình", to: "/projects" },
      { label: "Hợp đồng & phụ lục", to: "/projects/contracts" },
      { label: "Phương án tổ chức thi công", to: "/construction/methods" },
      { label: "Tiến độ thi công", to: "/construction/plan" },
      { label: "Nhân sự thi công", to: "/construction/staff" },
      { label: "Hồ sơ thi công", to: "/construction/documents" },
    ],
  },
  {
    label: "Quản lý xe máy thiết bị", to: "/equipment", icon: Truck,
    children: [
      { label: "Danh mục xe máy thiết bị", to: "/equipment/list" },
      { label: "Nhân viên CMKT", to: "/equipment/operators" },
      { label: "Phân bổ điều động", to: "/equipment/dispatch" },
      { label: "Theo dõi hoạt động", to: "/equipment/shifts" },
      { label: "Bảo dưỡng", to: "/equipment/maintenance" },
      { label: "Sửa chữa", to: "/equipment/repairs" },
      { label: "Thanh xử lý", to: "/equipment/disposal" },
      { label: "Sự cố tai nạn", to: "/equipment/incidents" },
      { label: "Tuyến đường", to: "/equipment/routes" },
    ],
  },
  {
    label: "Tài chính kế toán", to: "/finance", icon: Calculator, badgeKey: "approvals",
    children: [
      { label: "Dự toán thi công", to: "/finance/estimate", soon: true },
      { label: "Danh mục vật tư, vật liệu", to: "/materials/catalog" },
      { label: "Đề xuất vật tư", to: "/materials/requests" },
      { label: "Nhập kho vật tư", to: "/materials/receipts" },
      { label: "Xuất kho vật tư", to: "/materials/issues" },
      { label: "Tồn kho và kiểm kê", to: "/materials/inventory" },
      { label: "Chi phí tập hợp", to: "/finance/costs", soon: true },
      { label: "Hồ sơ thanh toán với CĐT", to: "/finance/payments", soon: true },
      { label: "Giá trị khối lượng thi công", to: "/finance/value", soon: true },
      { label: "Công nợ thầu phụ, NCC", to: "/finance/debts", soon: true },
    ],
  },
  {
    label: "Quản lý hệ thống", to: "/admin", icon: Settings,
    children: [
      { label: "Người dùng", to: "/admin/users" },
      { label: "Vai trò người dùng", to: "/admin/roles" },
      { label: "Quyền hệ thống", to: "/admin/permissions" },
      { label: "Lịch sử đăng nhập", to: "/admin/logins" },
    ],
  },
  { label: "Hướng dẫn demo", to: "/guide", icon: BookOpenCheck },
];

/** Nhãn breadcrumb theo đường dẫn */
export const PATH_LABELS: Record<string, string> = {
  projects: "Quản lý công trình",
  packages: "Quản lý gói thầu",
  contracts: "Hợp đồng & phụ lục",
  construction: "Quản lý công trình",
  plan: "Tiến độ thi công",
  methods: "Phương án tổ chức thi công",
  staff: "Nhân sự thi công",
  documents: "Hồ sơ thi công",
  logs: "Nhật ký thi công",
  "value-report": "Giá trị thực hiện",
  materials: "Tài chính kế toán",
  inventory: "Tồn kho và kiểm kê",
  requests: "Đề xuất vật tư",
  receipts: "Nhập kho vật tư",
  issues: "Xuất kho vật tư",
  transactions: "Nhập – xuất kho",
  catalog: "Danh mục vật tư",
  suppliers: "Nhà cung cấp",
  equipment: "Quản lý xe máy thiết bị",
  list: "Danh mục xe máy thiết bị",
  operators: "Nhân viên CMKT",
  dispatch: "Phân bổ điều động",
  shifts: "Theo dõi hoạt động",
  maintenance: "Bảo dưỡng",
  repairs: "Sửa chữa",
  disposal: "Thanh xử lý",
  incidents: "Sự cố tai nạn",
  routes: "Tuyến đường",
  finance: "Tài chính kế toán",
  estimate: "Dự toán thi công",
  costs: "Chi phí tập hợp",
  payments: "Hồ sơ thanh toán",
  value: "Giá trị khối lượng thi công",
  debts: "Công nợ thầu phụ, NCC",
  acceptance: "Hồ sơ nghiệm thu",
  reconcile: "Đối chiếu khối lượng",
  settlement: "Thanh quyết toán",
  reports: "Báo cáo",
  alerts: "Cảnh báo & vấn đề",
  admin: "Quản lý hệ thống",
  users: "Người dùng",
  roles: "Vai trò người dùng",
  permissions: "Quyền hệ thống",
  logins: "Lịch sử đăng nhập",
  account: "Thông tin tài khoản",
  guide: "Hướng dẫn demo",
};
export { HardHat };
