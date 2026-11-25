import type { RoleKey } from "@/types";

/** Ma trận phân quyền đơn giản cho prototype (đề xuất – cần xác nhận với ACC) */
export type Permission =
  | "project.edit"
  | "project.approve"
  | "plan.edit"
  | "progress.update"
  | "log.confirm"
  | "material.request"
  | "material.approve"
  | "material.purchase"
  | "stock.move"
  | "equipment.edit"
  | "equipment.dispatch.request"
  | "equipment.dispatch.approve"
  | "acceptance.edit"
  | "acceptance.approve"
  | "payment.edit"
  | "admin";

const ALL: Permission[] = ["project.edit", "project.approve", "plan.edit", "progress.update", "log.confirm", "material.request", "material.approve", "material.purchase", "stock.move", "equipment.edit", "equipment.dispatch.request", "equipment.dispatch.approve", "acceptance.edit", "acceptance.approve", "payment.edit", "admin"];

export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  lanh_dao: ALL, // tài khoản demo chính – toàn quyền
  phong_ktkt: ["project.edit", "progress.update", "log.confirm", "acceptance.edit", "acceptance.approve", "equipment.dispatch.request"],
  chi_huy_truong: ["plan.edit", "progress.update", "log.confirm", "material.request", "material.approve", "equipment.dispatch.request", "acceptance.edit", "stock.move"],
  to_truong: ["progress.update", "material.request"],
  bp_vat_tu: ["material.request", "material.purchase", "stock.move"],
  phong_thiet_bi: ["equipment.edit", "equipment.dispatch.request", "equipment.dispatch.approve"],
  ke_toan: ["payment.edit", "acceptance.edit"],
  admin: ALL,
};

export const hasPermission = (role: RoleKey | undefined, p: Permission) => !!role && ROLE_PERMISSIONS[role].includes(p);

export const PERMISSION_LABELS: Record<Permission, string> = {
  "project.edit": "Tạo / sửa dự án",
  "project.approve": "Phê duyệt nhận thi công",
  "plan.edit": "Lập, điều chỉnh kế hoạch tiến độ (Chỉ huy trưởng)",
  "progress.update": "Cập nhật khối lượng, nhật ký",
  "log.confirm": "Xác nhận nhật ký",
  "material.request": "Lập đề xuất vật tư",
  "material.approve": "Phê duyệt đề xuất vật tư",
  "material.purchase": "Chọn NCC, đặt hàng",
  "stock.move": "Nhập / xuất kho",
  "equipment.edit": "Quản lý danh sách xe máy",
  "equipment.dispatch.request": "Đề nghị điều động",
  "equipment.dispatch.approve": "Duyệt điều động",
  "acceptance.edit": "Lập hồ sơ nghiệm thu",
  "acceptance.approve": "Xác nhận nghiệm thu",
  "payment.edit": "Hồ sơ thanh toán",
  admin: "Quản trị hệ thống",
};
