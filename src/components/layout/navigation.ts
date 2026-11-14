import {
  BarChart3, Building2, CalendarRange, ClipboardCheck, HardHat, LayoutDashboard, Package, Settings, Siren, Truck, BookOpenCheck, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  children?: { label: string; to: string }[];
  badgeKey?: "alerts" | "approvals";
}

export const NAV: NavItem[] = [
  { label: "Dashboard tổng quan", to: "/", icon: LayoutDashboard },
  { label: "Quản lý dự án", to: "/projects", icon: Building2 },
  {
    label: "Kế hoạch thi công", to: "/construction", icon: CalendarRange,
    children: [
      { label: "Kế hoạch & tiến độ", to: "/construction/plan" },
      { label: "Nhật ký thi công", to: "/construction/logs" },
      { label: "Giá trị thực hiện", to: "/construction/value-report" },
    ],
  },
  {
    label: "Vật tư vật liệu", to: "/materials", icon: Package, badgeKey: "approvals",
    children: [
      { label: "Nhu cầu & tồn kho", to: "/materials/inventory" },
      { label: "Đề xuất vật tư", to: "/materials/requests" },
      { label: "Nhập – xuất kho", to: "/materials/transactions" },
      { label: "Danh mục vật tư", to: "/materials/catalog" },
      { label: "Nhà cung cấp", to: "/materials/suppliers" },
    ],
  },
  {
    label: "Xe máy thiết bị", to: "/equipment", icon: Truck,
    children: [
      { label: "Danh sách xe máy", to: "/equipment/list" },
      { label: "Điều động thiết bị", to: "/equipment/dispatch" },
      { label: "Ca máy & nhiên liệu", to: "/equipment/shifts" },
      { label: "Bảo dưỡng, sửa chữa", to: "/equipment/maintenance" },
    ],
  },
  {
    label: "Nghiệm thu, thanh toán", to: "/finance", icon: ClipboardCheck,
    children: [
      { label: "Hồ sơ nghiệm thu", to: "/acceptance" },
      { label: "Đối chiếu khối lượng", to: "/acceptance/reconcile" },
      { label: "Hồ sơ thanh toán", to: "/payments" },
      { label: "Thanh quyết toán", to: "/payments/settlement" },
    ],
  },
  {
    label: "Báo cáo", to: "/reports", icon: BarChart3,
  },
  { label: "Cảnh báo & vấn đề", to: "/alerts", icon: Siren, badgeKey: "alerts" },
  { label: "Quản trị hệ thống", to: "/admin", icon: Settings },
  { label: "Hướng dẫn demo", to: "/guide", icon: BookOpenCheck },
];

/** Nhãn breadcrumb theo đường dẫn */
export const PATH_LABELS: Record<string, string> = {
  projects: "Quản lý dự án",
  construction: "Kế hoạch thi công",
  plan: "Kế hoạch & tiến độ",
  logs: "Nhật ký thi công",
  "value-report": "Giá trị thực hiện",
  materials: "Vật tư vật liệu",
  inventory: "Nhu cầu & tồn kho",
  requests: "Đề xuất vật tư",
  transactions: "Nhập – xuất kho",
  catalog: "Danh mục vật tư",
  suppliers: "Nhà cung cấp",
  equipment: "Xe máy thiết bị",
  list: "Danh sách xe máy",
  dispatch: "Điều động thiết bị",
  shifts: "Ca máy & nhiên liệu",
  maintenance: "Bảo dưỡng, sửa chữa",
  acceptance: "Hồ sơ nghiệm thu",
  reconcile: "Đối chiếu khối lượng",
  payments: "Hồ sơ thanh toán",
  settlement: "Thanh quyết toán",
  reports: "Báo cáo",
  alerts: "Cảnh báo & vấn đề",
  admin: "Quản trị hệ thống",
  guide: "Hướng dẫn demo",
};
export { HardHat };
