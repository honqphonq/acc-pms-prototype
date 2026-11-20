import type { Database } from "@/types";
import type { LabelTone } from "./constants";

/** Dự án đang thực hiện (giai đoạn Đang thi công) – chỉ những dự án này hiển thị trên các màn hình nghiệp vụ */
export const activeProjects = (db: Database) => db.projects.filter((p) => p.status === "dang_thi_cong");
export const projectOptions = (db: Database) => activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }));
export const equipmentOptions = (db: Database) => db.equipment.map((e) => ({ value: e.id, label: `${e.code} – ${e.name}` }));
export const userOptions = (db: Database, filter?: (u: Database["users"][number]) => boolean) => db.users.filter((u) => !filter || filter(u)).map((u) => ({ value: u.id, label: `${u.name} – ${u.title}` }));
export const toOptions = (m: Record<string, LabelTone | string>) => Object.entries(m).map(([value, l]) => ({ value, label: typeof l === "string" ? l : l.label }));

export const METHOD_STATUS: Record<string, LabelTone> = {
  du_thao: { label: "Dự thảo", tone: "neutral" },
  cho_gop_y: { label: "Đang lấy góp ý", tone: "warning" },
  da_duyet: { label: "Đã phê duyệt", tone: "success" },
};
export const STAFF_TYPE: Record<string, LabelTone> = {
  chi_huy: { label: "Chỉ huy", tone: "primary" },
  can_bo_ky_thuat: { label: "Cán bộ kỹ thuật", tone: "info" },
  cong_nhan: { label: "Công nhân", tone: "success" },
  lao_dong_pho_thong: { label: "Lao động phổ thông", tone: "neutral" },
};
export const STAFF_STATUS: Record<string, LabelTone> = { dang_lam: { label: "Đang làm việc", tone: "success" }, da_nghi: { label: "Đã nghỉ", tone: "neutral" } };
export const EQUIPMENT_KIND: Record<string, LabelTone> = {
  o_to: { label: "Xe ô tô", tone: "info" },
  xe_bien_do: { label: "Xe biển đỏ", tone: "danger" },
  may_thiet_bi: { label: "Máy thiết bị", tone: "neutral" },
};
export const MAINT_TYPE: Record<string, string> = { thuong_xuyen: "Bảo dưỡng thường xuyên", dinh_ky: "Bảo dưỡng định kỳ", ra_tron: "Bảo dưỡng rà trơn", dac_biet: "Bảo dưỡng đặc biệt" };
export const MAINT_STATUS: Record<string, LabelTone> = { cho_duyet: { label: "Chờ phê duyệt", tone: "warning" }, da_duyet: { label: "Đã phê duyệt", tone: "info" }, hoan_thanh: { label: "Đã thực hiện", tone: "success" } };
export const REPAIR_LEVEL: Record<string, LabelTone> = { nho: { label: "Sửa chữa nhỏ", tone: "neutral" }, vua: { label: "Sửa chữa vừa", tone: "warning" }, lon: { label: "Sửa chữa lớn", tone: "danger" } };
export const REPAIR_STATUS: Record<string, LabelTone> = { moi: { label: "Mới giao", tone: "neutral" }, dang_sua: { label: "Đang sửa chữa", tone: "info" }, hoan_thanh: { label: "Hoàn thành", tone: "success" } };
export const DISPOSAL_METHOD: Record<string, string> = { thanh_ly: "Thanh lý", ban_dau_gia: "Bán đấu giá", huy: "Hủy bỏ" };
export const DISPOSAL_STATUS: Record<string, LabelTone> = { lap_ke_hoach: { label: "Lập kế hoạch", tone: "neutral" }, cho_duyet: { label: "Chờ phê duyệt", tone: "warning" }, da_duyet: { label: "Đã phê duyệt", tone: "info" }, hoan_thanh: { label: "Đã thanh xử lý", tone: "success" } };
export const INCIDENT_TYPE: Record<string, string> = { tai_nan: "Tai nạn", hu_hong: "Hư hỏng đột xuất", va_cham: "Va chạm" };
export const INCIDENT_SEVERITY: Record<string, LabelTone> = { nhe: { label: "Nhẹ", tone: "neutral" }, trung_binh: { label: "Trung bình", tone: "warning" }, nghiem_trong: { label: "Nghiêm trọng", tone: "danger" } };
export const INCIDENT_STATUS: Record<string, LabelTone> = { moi: { label: "Mới ghi nhận", tone: "danger" }, dang_xu_ly: { label: "Đang xử lý", tone: "warning" }, da_xu_ly: { label: "Đã xử lý", tone: "success" } };
export const PLAN_STATUS: Record<string, LabelTone> = { chua_lap: { label: "Chưa lập phương án", tone: "neutral" }, cho_duyet: { label: "PA chờ duyệt", tone: "warning" }, da_duyet: { label: "PA đã duyệt", tone: "success" } };
