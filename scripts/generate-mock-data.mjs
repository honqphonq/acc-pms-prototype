/**
 * Sinh dữ liệu demo cho prototype ACC PMS.
 * Chạy: npm run gen:data  → ghi các file JSON vào src/data và public/mock-data
 *
 * Dữ liệu được sinh có tính xác định (seeded random) để mỗi lần chạy cho cùng kết quả.
 * Mọi số liệu tổng hợp (tiến độ, giá trị thực hiện, tồn kho...) đều được tính lại ở frontend
 * từ dữ liệu gốc, nên Dashboard và trang chi tiết luôn nhất quán.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIRS = [path.join(__dirname, "../src/data"), path.join(__dirname, "../public/mock-data")];
const TODAY = "2026-11-14";

// ---------- helpers ----------
let seed = 20261114;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rint = (a, b) => Math.floor(a + rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const d = (s) => new Date(s + "T00:00:00Z");
const fmt = (dt) => dt.toISOString().slice(0, 10);
const addDays = (s, n) => {
  const x = d(s);
  x.setUTCDate(x.getUTCDate() + n);
  return fmt(x);
};
const diffDays = (a, b) => Math.round((d(b) - d(a)) / 86400000);
const lerpDate = (a, b, f) => addDays(a, Math.round(diffDays(a, b) * f));
const minDate = (a, b) => (a < b ? a : b);
const INT_UNITS = new Set(["gói", "bộ", "lần", "viên", "cái", "hệ"]);
const roundQty = (q, unit) => (INT_UNITS.has(unit) ? Math.round(q) : Math.round(q * 10) / 10);
const plannedPct = (t, today = TODAY) => {
  if (today < t.plannedStart) return 0;
  if (today >= t.plannedEnd) return 1;
  return (diffDays(t.plannedStart, today) + 1) / (diffDays(t.plannedStart, t.plannedEnd) + 1);
};
const pad = (n, w = 3) => String(n).padStart(w, "0");

// ---------- departments ----------
const departments = [
  { id: "d-hdtv", code: "HĐTV", name: "Chủ tịch Tổng công ty", type: "ban_lanh_dao", parentId: null, head: "Lê Quang Vinh" },
  { id: "d-btgd", code: "BTGĐ", name: "Ban Tổng Giám đốc", type: "ban_lanh_dao", parentId: "d-hdtv", head: "Nguyễn Văn Hùng" },
  { id: "d-cq", code: "CQTCT", name: "Cơ quan Tổng công ty", type: "co_quan", parentId: "d-btgd" },
  { id: "d-vp", code: "VP", name: "Văn phòng", type: "bo_phan", parentId: "d-cq" },
  { id: "d-tbcn", code: "TBCN", name: "Phòng Thiết bị - Công nghệ", type: "bo_phan", parentId: "d-cq", head: "Phạm Văn Vinh" },
  { id: "d-tckt", code: "TCKT", name: "Phòng Tài chính - Kế toán", type: "bo_phan", parentId: "d-cq", head: "Hoàng Thị Bích" },
  { id: "d-khkt", code: "KHKT", name: "Phòng Kế hoạch - Kỹ thuật", type: "bo_phan", parentId: "d-cq", head: "Lê Thanh Thiện" },
  { id: "d-ktkt", code: "KTKT", name: "Phòng Kinh tế - Kỹ thuật", type: "bo_phan", parentId: "d-cq", head: "Đỗ Minh Châu" },
  { id: "d-cty", code: "CTC", name: "Các công ty con", type: "co_quan", parentId: "d-btgd" },
  { id: "d-acc24", code: "ACC 24", name: "Công ty CP ACC 24", type: "cong_ty_con", parentId: "d-cty" },
  { id: "d-acc244", code: "ACC 244", name: "Công ty CP ACC 244", type: "cong_ty_con", parentId: "d-cty" },
  { id: "d-acc245", code: "ACC 245", name: "Công ty CP ACC 245", type: "cong_ty_con", parentId: "d-cty" },
  { id: "d-acc25", code: "ACC 25", name: "Công ty CP ACC 25", type: "cong_ty_con", parentId: "d-cty" },
  { id: "d-accdtxl", code: "ACC ĐTXL", name: "Công ty TNHH MTV Đầu tư và Xây lắp ACC", type: "cong_ty_con", parentId: "d-cty" },
];

// ---------- users ----------
const users = [
  { id: "u01", code: "NV001", name: "Nguyễn Đức Toàn", role: "lanh_dao", title: "Phó Tổng Giám đốc", departmentId: "d-btgd", isDemoAccount: true },
  { id: "u02", code: "NV002", name: "Nguyễn Văn Hùng", role: "lanh_dao", title: "Tổng Giám đốc", departmentId: "d-btgd" },
  { id: "u03", code: "NV003", name: "Lê Thanh Thiện", role: "phong_ktkt", title: "Trưởng phòng Kế hoạch - Kỹ thuật", departmentId: "d-khkt", isDemoAccount: true },
  { id: "u04", code: "NV004", name: "Trần Quốc Hải", role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId: "d-acc244", isDemoAccount: true },
  { id: "u05", code: "NV005", name: "Lê Thị Mai", role: "chi_huy_truong", title: "Phó chỉ huy trưởng kỹ thuật", departmentId: "d-acc244" },
  { id: "u06", code: "NV006", name: "Phạm Văn Long", role: "to_truong", title: "Tổ trưởng tổ móng CPĐD", departmentId: "d-acc244", team: "Tổ móng CPĐD số 1" },
  { id: "u07", code: "NV007", name: "Nguyễn Minh Anh", role: "to_truong", title: "Mũi trưởng thi công khu bay", departmentId: "d-acc244", team: "Mũi thi công khu bay" },
  { id: "u08", code: "NV008", name: "Hoàng Quang Huy", role: "to_truong", title: "Tổ trưởng tổ BTXM mặt đường", departmentId: "d-acc244", team: "Tổ BTXM mặt đường số 1", isDemoAccount: true },
  { id: "u09", code: "NV009", name: "Đỗ Thanh Tùng", role: "to_truong", title: "Tổ trưởng tổ BTXM móng M150", departmentId: "d-acc244", team: "Tổ BTXM M150 số 1" },
  { id: "u10", code: "NV010", name: "Chu Anh Tài", role: "bp_vat_tu", title: "Cán bộ vật tư công trường", departmentId: "d-acc244", isDemoAccount: true },
  { id: "u11", code: "NV011", name: "Lê Phú Khang", role: "bp_vat_tu", title: "Trưởng bộ phận vật tư", departmentId: "d-acc244" },
  { id: "u12", code: "NV012", name: "Phạm Văn Vinh", role: "phong_thiet_bi", title: "Trưởng phòng Thiết bị - Công nghệ", departmentId: "d-tbcn", isDemoAccount: true },
  { id: "u13", code: "NV013", name: "Trần Quang Huy", role: "phong_thiet_bi", title: "Cán bộ xe máy công trường", departmentId: "d-acc244" },
  { id: "u14", code: "NV014", name: "Hoàng Thị Bích", role: "ke_toan", title: "Kế toán trưởng", departmentId: "d-tckt", isDemoAccount: true },
  { id: "u15", code: "NV015", name: "Nguyễn Thu Hà", role: "ke_toan", title: "Kế toán công trường", departmentId: "d-acc244" },
  { id: "u16", code: "NV016", name: "Đặng Minh Quân", role: "admin", title: "Quản trị hệ thống", departmentId: "d-vp", isDemoAccount: true },
  { id: "u17", code: "NV017", name: "Đỗ Minh Châu", role: "phong_ktkt", title: "Trưởng phòng Kinh tế - Kỹ thuật", departmentId: "d-ktkt" },
  // Chỉ huy trưởng các công trường khác
  { id: "u20", code: "NV020", name: "Vũ Đình Khôi", role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId: "d-acc244" },
  { id: "u21", code: "NV021", name: "Bùi Văn Thắng", role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId: "d-acc245" },
  { id: "u22", code: "NV022", name: "Đinh Công Sơn", role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId: "d-acc24" },
  { id: "u23", code: "NV023", name: "Ngô Quang Vinh", role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId: "d-acc25" },
  { id: "u24", code: "NV024", name: "Phan Văn Lực", role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId: "d-acc24" },
  { id: "u25", code: "NV025", name: "Mai Xuân Trường", role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId: "d-acc25" },
  { id: "u26", code: "NV026", name: "Lương Thế Anh", role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId: "d-acc245" },
  { id: "u27", code: "NV027", name: "Tạ Hữu Nghĩa", role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId: "d-acc24" },
  { id: "u28", code: "NV028", name: "Hồ Sỹ Dũng", role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId: "d-accdtxl" },
  { id: "u29", code: "NV029", name: "Cao Văn Bình", role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId: "d-acc25" },
];
// Chỉ huy trưởng các công trường mở rộng (dự án 12–26)
[
  ["Lê Văn Thành", "d-acc24"], ["Nguyễn Hữu Phước", "d-acc25"], ["Trần Đình Trọng", "d-acc244"], ["Phạm Quốc Bảo", "d-acc245"], ["Đỗ Văn Hưng", "d-acc24"],
  ["Hoàng Minh Đức", "d-acc244"], ["Vũ Văn Tiến", "d-acc245"], ["Bùi Quang Huy", "d-acc25"], ["Nguyễn Trọng Nghĩa", "d-acc244"], ["Đặng Văn Lâm", "d-acc245"],
  ["Lưu Quang Minh", "d-accdtxl"], ["Trịnh Xuân Hòa", "d-acc24"], ["Phan Thanh Tùng", "d-acc25"], ["Ngô Đức Thịnh", "d-accdtxl"], ["Hà Mạnh Cường", "d-acc244"],
].forEach(([name, departmentId], i) => users.push({ id: `u${60 + i}`, code: `NV0${60 + i}`, name, role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId }));

// Kỹ sư / tổ trưởng chung
const engineerNames = [
  "Trịnh Văn Nam", "Lê Hoàng Phúc", "Nguyễn Thị Lan", "Phạm Đức Mạnh", "Vũ Minh Tuấn", "Đào Quang Thịnh",
  "Hà Văn Quyết", "Lý Thị Hồng", "Kiều Văn Toản", "Đặng Thị Thu", "Trương Công Định", "Nông Văn Hải",
  "Lưu Đức Thắng", "Âu Văn Kiên", "Tô Minh Khánh", "Châu Văn Phát",
];
engineerNames.forEach((name, i) => {
  users.push({
    id: `u${30 + i}`, code: `NV0${30 + i}`, name, role: "to_truong",
    title: pick(["Kỹ sư giám sát hiện trường", "Tổ trưởng thi công", "Mũi trưởng thi công", "Kỹ sư kết cấu"]),
    departmentId: pick(["d-acc24", "d-acc244", "d-acc245", "d-acc25"]),
    team: `Tổ thi công số ${i + 1}`,
  });
});
Object.assign(users.find((u) => u.id === "u30"), { title: "Tổ trưởng tổ thảm bê tông nhựa", departmentId: "d-acc244", team: "Tổ thảm BTN" });
// Công nhân kỹ thuật vận hành (CMKT)
const operatorNames = [
  "Nguyễn Văn Bảy", "Trần Văn Cường", "Lê Văn Dũng", "Phạm Văn Đông", "Hoàng Văn Giang", "Vũ Văn Hòa",
  "Đỗ Văn Khải", "Bùi Văn Lâm", "Ngô Văn Mạnh", "Dương Văn Nghĩa", "Đinh Văn Oanh", "Lại Văn Phong",
  "Mạc Văn Quang", "Tăng Văn Sáng", "Triệu Văn Tâm", "Thái Văn Uy", "Hứa Văn Việt", "Quách Văn Xuân",
  "Phùng Văn Yên", "Cù Văn An", "La Văn Bình", "Khúc Văn Chiến", "Ninh Văn Đạt", "Giáp Văn Hiếu",
];
operatorNames.forEach((name, i) => {
  users.push({
    id: `op${pad(i + 1, 2)}`, code: `CN${pad(i + 1)}`, name, role: "to_truong",
    title: "Công nhân vận hành xe máy (CMKT)", departmentId: "d-tbcn", isOperator: true,
  });
});
users.forEach((u, i) => {
  u.phone = `09${pad(12 + i * 7, 2).slice(-2)}${pad(345 + i * 113, 3).slice(-3)}${pad(100 + i * 37, 3).slice(-3)}`;
  u.email = `${u.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().split(" ").slice(-1)[0]}.${u.code.toLowerCase()}@acc.vn`;
});

// ---------- projects ----------
const projectDefs = [
  {
    id: "p01", code: "ACC244-GB", shortName: "Sân bay Gia Bình", name: "Cảng hàng không quốc tế Gia Bình – Giai đoạn 1.1",
    category: "giao_thong", location: "Gia Bình, Bắc Ninh", unitId: "d-acc244", commanderId: "u04",
    investor: "Ban Quản lý dự án Cảng hàng không quốc tế Gia Bình",
    contractor: "Tổng công ty ACC – Công ty CP ACC 244",
    packageName: "Gói thầu: Thi công kết cấu khu bay – Hạng mục: Thi công kết cấu hạ tầng sân bay và mặt đường", contractNo: "1504/2026/HĐXD-GB", contractDate: "2026-04-15",
    startDate: "2026-04-28", endDate: "2027-04-25", status: "dang_thi_cong", costRatio: 0.91,
  },
  {
    id: "p02", code: "ACC244-DAD", shortName: "Sân đỗ máy bay Đà Nẵng", name: "Mở rộng sân đỗ máy bay – Cảng HKQT Đà Nẵng",
    category: "giao_thong", location: "Đà Nẵng", unitId: "d-acc244", commanderId: "u20",
    investor: "Tổng công ty Cảng hàng không Việt Nam – CTCP (ACV)", contractor: "Tổng công ty ACC – Công ty CP ACC 244",
    packageName: "Gói thầu XL-02: Thi công sân đỗ máy bay và hệ thống kỹ thuật", contractNo: "1508/2025/HĐTC-ACV", contractDate: "2025-08-15",
    startDate: "2025-09-15", endDate: "2027-02-28", budget: 690e9, status: "dang_thi_cong", costRatio: 0.96, ratio: 0.62, template: "airport", value: 760e9,
  },
  {
    id: "p03", code: "ACC245-CBI", shortName: "Cảng HKQT Cát Bi", name: "Cảng hàng không quốc tế Cát Bi – Mở rộng đường lăn song song",
    category: "giao_thong", location: "Hải Phòng", unitId: "d-acc245", commanderId: "u21",
    investor: "Tổng công ty Cảng hàng không Việt Nam – CTCP (ACV)", contractor: "Tổng công ty ACC – Công ty CP ACC 245",
    packageName: "Gói thầu số 08: Thi công đường lăn song song và đường lăn nối", contractNo: "2006/2025/HĐXD-ACV", contractDate: "2025-06-20",
    startDate: "2025-07-01", endDate: "2027-09-30", budget: 1120e9, status: "dang_thi_cong", costRatio: 0.89, ratio: 1.02, template: "airport", value: 1250e9,
  },
  {
    id: "p04", code: "ACC24-VDO", shortName: "Cảng HK Quảng Ninh", name: "Cảng Hàng không Quảng Ninh – Mở rộng sân đỗ tàu bay",
    category: "giao_thong", location: "Quảng Ninh", unitId: "d-acc24", commanderId: "u22",
    investor: "Sở Giao thông vận tải tỉnh Quảng Ninh", contractor: "Tổng công ty ACC – Công ty CP ACC 24",
    packageName: "Gói thầu XL-01: Thi công sân đỗ tàu bay số 2", contractNo: "0911/2025/HĐXD-SGTVT", contractDate: "2025-10-09",
    startDate: "2025-11-01", endDate: "2027-05-31", budget: 490e9, status: "dang_thi_cong", costRatio: 0.93, ratio: 0.88, template: "airport", value: 540e9,
  },
  {
    id: "p05", code: "ACC25-VCA", shortName: "Sân bay Cần Thơ", name: "Nâng cấp và cải tạo sân bay Cần Thơ",
    category: "giao_thong", location: "Cần Thơ", unitId: "d-acc25", commanderId: "u23",
    investor: "Tổng công ty Cảng hàng không Việt Nam – CTCP (ACV)", contractor: "Tổng công ty ACC – Công ty CP ACC 25",
    packageName: "Gói thầu số 05: Cải tạo đường cất hạ cánh và đường lăn", contractNo: "1802/2026/HĐXD-ACV", contractDate: "2026-02-18",
    startDate: "2026-03-01", endDate: "2028-03-31", budget: 575e9, status: "dang_thi_cong", costRatio: 0.9, ratio: 0.98, template: "airport", value: 640e9,
  },
  {
    id: "p06", code: "ACC24-QK2", shortName: "Kho kỹ thuật QK2", name: "Kho kỹ thuật Quân khu 2",
    category: "quoc_phong", location: "Phú Thọ", unitId: "d-acc24", commanderId: "u24",
    investor: "Bộ Tư lệnh Quân khu 2", contractor: "Tổng công ty ACC – Công ty CP ACC 24",
    packageName: "Gói thầu XL: Thi công xây dựng khu kho kỹ thuật", contractNo: "2507/2025/HĐ-BTL", contractDate: "2025-07-25",
    startDate: "2025-08-01", endDate: "2027-03-31", budget: 380e9, status: "dang_thi_cong", costRatio: 0.9, ratio: 0.99, template: "building", value: 420e9,
  },
  {
    id: "p07", code: "ACC25-K18", shortName: "TT huấn luyện K18", name: "Trung tâm huấn luyện K18",
    category: "quoc_phong", location: "Hòa Bình", unitId: "d-acc25", commanderId: "u25",
    investor: "Bộ Tham mưu Quân chủng Phòng không – Không quân", contractor: "Tổng công ty ACC – Công ty CP ACC 25",
    packageName: "Gói thầu số 03: Xây dựng khu huấn luyện và nhà ở học viên", contractNo: "1511/2025/HĐ-QC", contractDate: "2025-11-15",
    startDate: "2025-12-01", endDate: "2027-06-30", budget: 260e9, status: "dang_thi_cong", costRatio: 0.95, ratio: 0.85, template: "building", value: 285e9,
  },
  {
    id: "p08", code: "ACC245-CAST", shortName: "Trụ sở CA Sóc Trăng", name: "Trụ sở làm việc Công an tỉnh Sóc Trăng",
    category: "dan_dung", location: "Sóc Trăng", unitId: "d-acc245", commanderId: "u26",
    investor: "Công an tỉnh Sóc Trăng", contractor: "Tổng công ty ACC – Công ty CP ACC 245",
    packageName: "Gói thầu XL-01: Thi công xây dựng trụ sở chính", contractNo: "0302/2025/HĐXD-CA", contractDate: "2025-02-03",
    startDate: "2025-03-01", endDate: "2026-12-31", budget: 172e9, status: "dang_thi_cong", costRatio: 0.88, ratio: 1.0, template: "building", value: 190e9,
  },
  {
    id: "p09", code: "ACC24-BCHVP", shortName: "BCH QS Vĩnh Phúc", name: "Bộ Chỉ huy Quân sự tỉnh Vĩnh Phúc",
    category: "dan_dung", location: "Vĩnh Phúc", unitId: "d-acc24", commanderId: "u27",
    investor: "Bộ Chỉ huy Quân sự tỉnh Vĩnh Phúc", contractor: "Tổng công ty ACC – Công ty CP ACC 24",
    packageName: "Gói thầu số 04: Xây dựng nhà làm việc và hạ tầng kỹ thuật", contractNo: "2209/2025/HĐXD-BCH", contractDate: "2025-09-22",
    startDate: "2025-10-01", endDate: "2027-04-30", budget: 292e9, status: "dang_thi_cong", costRatio: 0.94, ratio: 0.8, template: "building", value: 320e9,
  },
  {
    id: "p10", code: "ACCDTXL-THX", shortName: "Đài KSKL Thọ Xuân", name: "Nhà chỉ huy và đài kiểm soát không lưu – Cảng HK Thọ Xuân",
    category: "giao_thong", location: "Thanh Hóa", unitId: "d-accdtxl", commanderId: "u28",
    investor: "Tổng công ty Quản lý bay Việt Nam", contractor: "Tổng công ty ACC – Công ty TNHH MTV Đầu tư và Xây lắp ACC",
    packageName: "Gói thầu XL-03: Xây dựng nhà chỉ huy và đài kiểm soát", contractNo: "2810/2026/HĐXD-VATM", contractDate: "2026-10-28",
    startDate: "2027-01-04", endDate: "2028-06-30", budget: 438e9, status: "chuan_bi", costRatio: 0.9, value: 480e9, approval: "cho_duyet", template: null,
  },
  {
    id: "p11", code: "ACC25-DIN", shortName: "Sân đỗ ô tô Điện Biên", name: "Sân đỗ ô tô và đường nội bộ – Cảng HK Điện Biên",
    category: "giao_thong", location: "Điện Biên", unitId: "d-acc25", commanderId: "u29",
    investor: "Tổng công ty Cảng hàng không Việt Nam – CTCP (ACV)", contractor: "Tổng công ty ACC – Công ty CP ACC 25",
    packageName: "Gói thầu XL-04: Sân đỗ ô tô, đường nội bộ và cây xanh", contractNo: "1001/2025/HĐXD-ACV", contractDate: "2025-01-10",
    startDate: "2025-01-15", endDate: "2026-08-30", budget: 132e9, status: "hoan_thanh", costRatio: 0.9, ratio: 1, template: "airport_small", value: 145e9, settlement: "dang_lap",
  },
];

// ---- 15 dự án đang thi công bổ sung (tổng 24 dự án đang triển khai) ----
const P = (n, id, code, shortName, name, category, location, unitId, investor, template, value, startDate, endDate, ratio) => ({
  id, code, shortName, name, category, location, unitId, commanderId: `u${60 + n}`, investor,
  contractor: `Tổng công ty ACC – ${{ "d-acc24": "Công ty CP ACC 24", "d-acc244": "Công ty CP ACC 244", "d-acc245": "Công ty CP ACC 245", "d-acc25": "Công ty CP ACC 25", "d-accdtxl": "Công ty TNHH MTV Đầu tư và Xây lắp ACC" }[unitId]}`,
  packageName: template === "building" ? "Gói thầu XL: Thi công xây dựng công trình" : "Gói thầu XL: Thi công hạ tầng hàng không", contractNo: `${String(10 + n).padStart(2, "0")}${startDate.slice(5, 7)}/${startDate.slice(0, 4)}/HĐXD`,
  contractDate: addDays(startDate, -20), startDate, endDate, budget: Math.round(value * 0.9), status: "dang_thi_cong", costRatio: 0.88 + (n % 5) * 0.02, ratio, template, value,
});
projectDefs.push(
  P(0, "p12", "ACC24-KEP", "Sân bay Kép", "Cải tạo đường lăn, sân đỗ Sân bay quân sự Kép", "quoc_phong", "Bắc Giang", "d-acc24", "Bộ Tư lệnh Quân chủng Phòng không – Không quân", "airport", 680e9, "2025-12-01", "2027-08-31", 0.99),
  P(1, "p13", "ACC25-HL921", "Doanh trại E921", "Doanh trại Trung đoàn Không quân 921", "quoc_phong", "Hà Nội", "d-acc25", "Bộ Tham mưu Quân chủng Phòng không – Không quân", "building", 265e9, "2026-01-15", "2027-07-31", 1.0),
  P(2, "p14", "ACC244-LD918", "Kho kỹ thuật Lữ đoàn 918", "Khu kho kỹ thuật Lữ đoàn Không quân 918", "quoc_phong", "Hà Nội", "d-acc244", "Lữ đoàn Không quân Vận tải 918", "building", 198e9, "2026-03-01", "2027-06-30", 0.98),
  P(3, "p15", "ACC245-CR", "Sân đỗ trực thăng Cam Ranh", "Sân đỗ trực thăng Vùng 4 Hải quân – Cam Ranh", "quoc_phong", "Khánh Hòa", "d-acc245", "Bộ Tư lệnh Vùng 4 Hải quân", "airport", 355e9, "2025-10-15", "2027-03-31", 0.97),
  P(4, "p16", "ACC24-SQKQ", "KTX Trường SQ Không quân", "Ký túc xá học viên Trường Sĩ quan Không quân", "quoc_phong", "Khánh Hòa", "d-acc24", "Trường Sĩ quan Không quân", "building", 230e9, "2026-02-01", "2027-09-30", 1.01),
  P(5, "p17", "ACC244-HUI", "Sân đỗ Cảng HKQT Phú Bài", "Mở rộng sân đỗ máy bay – Cảng HKQT Phú Bài", "giao_thong", "Thừa Thiên Huế", "d-acc244", "Tổng công ty Cảng hàng không Việt Nam – CTCP (ACV)", "airport", 820e9, "2025-08-01", "2027-04-30", 1.0),
  P(6, "p18", "ACC245-UIH", "Đường CHC số 2 Phù Cát", "Đường cất hạ cánh số 2 – Cảng HK Phù Cát", "giao_thong", "Bình Định", "d-acc245", "Tổng công ty Cảng hàng không Việt Nam – CTCP (ACV)", "airport", 910e9, "2025-11-01", "2028-02-29", 0.98),
  P(7, "p19", "ACC25-DLI", "Sân đỗ Liên Khương", "Mở rộng sân đỗ tàu bay – Cảng HK Liên Khương", "giao_thong", "Lâm Đồng", "d-acc25", "Tổng công ty Cảng hàng không Việt Nam – CTCP (ACV)", "airport", 460e9, "2026-01-05", "2027-10-31", 1.0),
  P(8, "p20", "ACC244-SGN", "Đường lăn Tân Sơn Nhất", "Đường lăn nối và đường lăn song song – Cảng HKQT Tân Sơn Nhất", "giao_thong", "TP Hồ Chí Minh", "d-acc244", "Tổng công ty Cảng hàng không Việt Nam – CTCP (ACV)", "airport", 1150e9, "2025-09-15", "2027-12-31", 0.99),
  P(9, "p21", "ACC245-PXU", "Đường CHC Pleiku", "Cải tạo đường cất hạ cánh – Cảng HK Pleiku", "giao_thong", "Gia Lai", "d-acc245", "Tổng công ty Cảng hàng không Việt Nam – CTCP (ACV)", "airport", 395e9, "2026-02-15", "2027-11-30", 0.97),
  P(10, "p22", "ACCDTXL-VCS", "Đèn tín hiệu Côn Đảo", "Hệ thống đèn tín hiệu và sân đỗ – Cảng HK Côn Đảo", "giao_thong", "Bà Rịa – Vũng Tàu", "d-accdtxl", "Tổng công ty Cảng hàng không Việt Nam – CTCP (ACV)", "airport_small", 168e9, "2026-03-01", "2027-05-31", 1.0),
  P(11, "p23", "ACC24-CAAV", "Trụ sở Cục Hàng không", "Trụ sở làm việc Cục Hàng không Việt Nam – khối văn phòng", "dan_dung", "Hà Nội", "d-acc24", "Cục Hàng không Việt Nam", "building", 540e9, "2025-10-01", "2027-09-30", 0.99),
  P(12, "p24", "ACC25-HNM", "BV đa khoa Hà Nam", "Bệnh viện đa khoa tỉnh Hà Nam – khối kỹ thuật nghiệp vụ", "dan_dung", "Hà Nam", "d-acc25", "Sở Y tế tỉnh Hà Nam", "building", 385e9, "2025-12-15", "2027-12-31", 1.0),
  P(13, "p25", "ACCDTXL-VII", "Nhà điều hành Cảng HK Vinh", "Nhà điều hành và khu kỹ thuật – Cảng HK Vinh", "dan_dung", "Nghệ An", "d-accdtxl", "Tổng công ty Cảng hàng không Việt Nam – CTCP (ACV)", "building", 275e9, "2026-01-10", "2027-08-31", 0.98),
  P(14, "p26", "ACC244-ATC", "Trung tâm Kiểm soát đường dài", "Trung tâm Kiểm soát đường dài Hà Nội – nhà kỹ thuật", "dan_dung", "Hà Nội", "d-acc244", "Tổng công ty Quản lý bay Việt Nam", "building", 310e9, "2026-04-01", "2028-03-31", 1.01),
);

const descriptions = {
  dan_dung: "Công trình dân dụng cấp II, kết cấu khung bê tông cốt thép toàn khối, móng cọc ép BTCT.",
  giao_thong: "Công trình hạ tầng hàng không: kết cấu mặt đường bê tông xi măng, hệ thống thoát nước và đèn tín hiệu.",
  quoc_phong: "Công trình quốc phòng – yêu cầu bảo mật thông tin; kết cấu BTCT, khung thép tiền chế.",
};

// ---------- task templates ----------
const T = (name, unit, a, b, share, unitPrice, team) => ({ name, unit, a, b, share, unitPrice, team });
const templates = {
  airport: [
    { name: "Công tác chuẩn bị mặt bằng", tasks: [T("Phát quang, dọn dẹp mặt bằng thi công", "m²", 0, 0.05, 0.008, 18000, "Tổ đất"), T("Lán trại, đường công vụ tạm", "gói", 0.01, 0.07, 0.006, 0, "Tổ nề")] },
    { name: "Nền sân đỗ, đường lăn", tasks: [T("Đào khuôn, vét bùn hữu cơ", "m³", 0.05, 0.18, 0.04, 95000, "Tổ đất"), T("Đắp cát nền đầm chặt K95", "m³", 0.12, 0.3, 0.07, 235000, "Tổ đất"), T("Lu lèn hoàn thiện nền K98", "m²", 0.24, 0.36, 0.03, 42000, "Tổ máy")] },
    { name: "Móng mặt đường", tasks: [T("Móng cấp phối đá dăm loại I dày 30cm", "m³", 0.3, 0.5, 0.11, 520000, "Tổ móng đường"), T("Móng đá gia cố xi măng 5% dày 18cm", "m³", 0.42, 0.6, 0.1, 780000, "Tổ móng đường")] },
    { name: "Mặt đường bê tông xi măng", tasks: [T("Bê tông mặt đường M350 dày 40cm", "m³", 0.5, 0.84, 0.38, 2650000, "Tổ bê tông"), T("Cắt khe, chèn matit khe co giãn", "m", 0.58, 0.9, 0.035, 165000, "Tổ hoàn thiện")] },
    { name: "Hệ thống kỹ thuật & an toàn bay", tasks: [T("Hệ thống thoát nước, cống hộp BTCT", "m", 0.32, 0.74, 0.12, 18500000, "Tổ cống"), T("Đèn tín hiệu tim đường lăn, đèn lề", "bộ", 0.78, 0.95, 0.07, 92000000, "Tổ điện"), T("Sơn kẻ vạch tín hiệu sân đỗ", "m²", 0.88, 1, 0.021, 285000, "Tổ hoàn thiện")] },
  ],
  airport_small: [
    { name: "Nền và móng", tasks: [T("Đào nền, đắp cát đầm chặt K95", "m³", 0, 0.25, 0.18, 230000, "Tổ đất"), T("Móng cấp phối đá dăm", "m³", 0.2, 0.45, 0.2, 510000, "Tổ móng đường")] },
    { name: "Mặt đường và sân đỗ", tasks: [T("Bê tông nhựa chặt C12.5 dày 7cm", "m²", 0.4, 0.75, 0.32, 320000, "Tổ bê tông nhựa"), T("Bó vỉa, rãnh tam giác", "m", 0.55, 0.8, 0.08, 450000, "Tổ hoàn thiện")] },
    { name: "Hoàn thiện, cây xanh", tasks: [T("Hệ thống chiếu sáng sân đỗ", "bộ", 0.7, 0.92, 0.12, 38000000, "Tổ điện"), T("Trồng cây xanh, thảm cỏ", "m²", 0.85, 1, 0.1, 210000, "Tổ cảnh quan")] },
  ],
  building: [
    { name: "Công tác chuẩn bị và san lấp mặt bằng", tasks: [T("Giải phóng, san lấp mặt bằng", "m³", 0, 0.06, 0.012, 125000, "Tổ đất"), T("Lán trại, hàng rào tạm", "gói", 0.02, 0.07, 0.006, 0, "Tổ nề")] },
    { name: "Phần móng", tasks: [T("Ép cọc BTCT 300x300", "m", 0.06, 0.18, 0.1, 1420000, "Tổ cọc"), T("Đào đất hố móng", "m³", 0.15, 0.22, 0.02, 118000, "Tổ đất"), T("Bê tông đài móng, giằng móng M300", "m³", 0.2, 0.32, 0.06, 2350000, "Tổ bê tông")] },
    { name: "Phần thân", tasks: [T("Bê tông cột, dầm, sàn các tầng", "m³", 0.3, 0.62, 0.24, 3150000, "Tổ bê tông"), T("Xây tường gạch không nung", "m³", 0.45, 0.7, 0.06, 1350000, "Tổ nề")] },
    { name: "Hoàn thiện", tasks: [T("Trát, bả, sơn hoàn thiện", "m²", 0.6, 0.88, 0.1, 185000, "Tổ hoàn thiện"), T("Ốp lát, trần thạch cao", "m²", 0.65, 0.9, 0.12, 520000, "Tổ hoàn thiện"), T("Hệ thống điện, nước, PCCC", "m² sàn", 0.55, 0.92, 0.16, 1250000, "Tổ điện nước")] },
    { name: "Hạ tầng ngoài nhà", tasks: [T("Sân, đường nội bộ", "m²", 0.84, 0.97, 0.08, 650000, "Tổ đường"), T("Cảnh quan, cây xanh, cổng tường rào", "gói", 0.9, 1, 0.032, 0, "Tổ cảnh quan")] },
  ],
};

const projects = [];
const constructionItems = [];
const constructionPlans = [];
const engineerIds = users.filter((u) => u.role === "to_truong" && !u.isOperator && +u.id.slice(1) >= 30).map((u) => u.id);

// --- p01: SB Gia Bình – tiến độ thi công chi tiết thật (scripts/data/gia-binh-schedule.json) ---
// Cấu trúc: A..E = hạng mục; KHU VỰC ZONE = nhóm cấp 1; Lòng đường / Lề vật liệu = nhóm cấp 2; còn lại = công việc.
const GB_PRICES = [
  [/CPĐD/, 165000], [/M150/, 420000], [/M350/, 680000], [/BTN C19/, 245000], [/BTN C16/, 215000],
  [/khu phụ trợ/, 6800000000], [/Tập kết/, 3200000000], [/Vệ sinh/, 450000000], [/Nghiệm thu/, 0],
];
const GB_TEAM = (name, zoneIdx) => {
  const n = (zoneIdx % 2) + 1;
  if (/CPĐD/.test(name)) return ["u06", `Tổ móng CPĐD số ${n}`];
  if (/M150/.test(name)) return ["u09", `Tổ BTXM M150 số ${n}`];
  if (/M350/.test(name)) return ["u08", `Tổ BTXM mặt đường số ${n}`];
  if (/BTN/.test(name)) return ["u30", "Tổ thảm BTN"];
  if (/Nghiệm thu|Vệ sinh/.test(name)) return ["u04", "Ban chỉ huy công trường"];
  return ["u05", "Tổ phụ trợ"];
};
/** Tiến độ thực tế tại ngày dữ liệu 14/11/2026: [tỷ lệ hoàn thành, số ngày kết thúc lệch so với kế hoạch] */
const GB_ACTUAL = {
  10: 0.88, 12: 0.7, 20: 0.93, 22: 0.55, 30: [1, 2], 32: [1, 3], 33: 0.78, 34: 0, 39: 0.91, 40: 0.64,
  49: [1, 3], 50: 0.3, 59: 0.86, 60: 0.37, 90: 0.76, 91: 0.7, 92: 0.22, 9: [1, 4], 19: [1, -1], 29: [1, 2],
};
function addGiaBinh() {
  const pid = "p01";
  const rows = JSON.parse(fs.readFileSync(path.join(__dirname, "data/gia-binh-schedule.json"), "utf8"));
  const managers = { A: "u05", B: "u07", C: "u07", D: "u06", E: "u04" };
  let item = null, zone = null, sub = null, zoneIdx = 0, order = 0, lastLeaf = null;
  const tid = (n) => `t-p01-${pad(n)}`;
  for (const r of rows.slice(1)) {
    const sec = r.name.match(/^([A-E])\.\s*(.*)$/);
    if (sec) {
      item = { id: `i-p01-${sec[1]}`, projectId: pid, code: sec[1], name: sec[2].charAt(0) + sec[2].slice(1).toLowerCase().replace("hạ cánh", "hạ cánh"), order: "ABCDE".indexOf(sec[1]) + 1, managerId: managers[sec[1]] };
      item.name = { A: "Công tác chuẩn bị", B: "Kết cấu đường cất hạ cánh", C: "Kết cấu đường lăn", D: "Khu vực sân đỗ máy bay zone A2", E: "Nghiệm thu bàn giao công trình" }[sec[1]];
      constructionItems.push(item);
      zone = sub = lastLeaf = null;
      continue;
    }
    const isLeaf = !!r.unit || item.code === "A";
    const base = { projectId: pid, itemId: item.id, code: String(r.id), plannedStart: r.start, plannedEnd: r.end, actualStart: null, actualEnd: null, note: "", order: ++order, predecessors: [] };
    if (!isLeaf) {
      const isZone = r.name === r.name.toUpperCase() || /^SÂN ĐỖ máy bay/.test(r.name);
      const name = isZone ? r.name.charAt(0) + r.name.slice(1).toLowerCase().replace(/zone (\w+)/i, (_, z) => `zone ${z.toUpperCase()}`).replace("chc", "CHC") : r.name;
      const g = { ...base, id: tid(r.id), parentId: isZone ? null : zone?.id ?? null, isGroup: true, name, assigneeId: "u07", team: "Mũi thi công khu bay", unit: "", contractQty: 0, unitPrice: 0, actualQty: 0, status: "chua_thuc_hien" };
      constructionPlans.push(g);
      if (isZone) { zone = g; sub = null; zoneIdx++; lastLeaf = null; } else sub = g;
      continue;
    }
    const [assigneeId, team] = GB_TEAM(r.name, zoneIdx);
    const unit = r.unit === "m3" ? "m³" : r.unit === "m2" ? "m²" : r.unit === "HM" ? "HM" : "gói";
    const unitPrice = GB_PRICES.find(([re]) => re.test(r.name))?.[1] ?? 0;
    const t = { ...base, id: tid(r.id), parentId: sub?.id ?? zone?.id ?? null, isGroup: false, name: r.name, assigneeId, team, unit, contractQty: r.qty ?? 1, unitPrice, actualQty: 0, status: "chua_thuc_hien" };
    // phụ thuộc: nối tiếp trong cùng nhóm (FS nếu bắt đầu sau khi việc trước kết thúc, ngược lại SS)
    const prev = lastLeaf;
    lastLeaf = t;
    if (prev) t.predecessors = [{ id: prev.id, type: t.plannedStart > prev.plannedEnd ? "FS" : "SS" }];
    if (item.code === "E" && r.id === 99) t.predecessors = [{ id: tid(86), type: "FS" }];
    // thực tế
    const ov = GB_ACTUAL[r.id];
    let pct = r.end < TODAY ? 1 : r.start <= TODAY ? Math.min(0.97, plannedPct(t) * 0.94) : 0;
    let endShift = rint(-3, 0);
    if (Array.isArray(ov)) { pct = ov[0]; endShift = ov[1]; } else if (typeof ov === "number") pct = ov;
    t.actualQty = roundQty(t.contractQty * pct, unit);
    if (pct > 0) { t.actualStart = minDate(addDays(r.start, rint(0, 2)), TODAY); t.status = "dang_thuc_hien"; }
    if (pct >= 1) { t.actualQty = t.contractQty; t.status = "hoan_thanh"; t.actualEnd = minDate(addDays(r.end, endShift), addDays(TODAY, -1)); if (t.actualEnd < t.actualStart) t.actualEnd = t.actualStart; }
    constructionPlans.push(t);
  }
  constructionPlans.filter((g) => g.projectId === pid && g.isGroup).forEach((g) => {
    const desc = constructionPlans.filter((x) => x.parentId === g.id || constructionPlans.find((y) => y.id === x.parentId)?.parentId === g.id).filter((x) => !x.isGroup);
    if (desc.every((x) => x.status === "hoan_thanh")) g.status = "hoan_thanh"; else if (desc.some((x) => x.actualStart)) g.status = "dang_thuc_hien";
  });
}
addGiaBinh();

function genPlan(def) {
  const tpl = templates[def.template];
  if (!tpl) return;
  let order = 0;
  const totalShare = tpl.reduce((s, it) => s + it.tasks.reduce((x, t) => x + t.share, 0), 0);
  tpl.forEach((it, ii) => {
    const itemId = `i-${def.id}-${ii + 1}`;
    constructionItems.push({ id: itemId, projectId: def.id, code: `1.${ii + 1}`, name: it.name, order: ii + 1, managerId: pick(engineerIds) });
    it.tasks.forEach((tt, ti) => {
      order++;
      const value = (def.value * tt.share) / totalShare;
      let unitPrice = tt.unitPrice;
      let qty;
      if (unitPrice === 0) {
        qty = 1;
        unitPrice = Math.round(value / 1e6) * 1e6;
      } else {
        qty = INT_UNITS.has(tt.unit) ? Math.max(1, Math.round(value / unitPrice)) : Math.round(value / unitPrice / 10) * 10;
      }
      const plannedStart = lerpDate(def.startDate, def.endDate, tt.a);
      const plannedEnd = lerpDate(def.startDate, def.endDate, tt.b);
      const task = {
        id: `t-${def.id}-${pad(order)}`, projectId: def.id, itemId, parentId: null, isGroup: false,
        code: `1.${ii + 1}.${ti + 1}`, name: tt.name, assigneeId: pick(engineerIds), team: `${tt.team} số ${rint(1, 3)}`,
        unit: tt.unit, contractQty: qty, unitPrice, actualQty: 0, plannedStart, plannedEnd,
        actualStart: null, actualEnd: null, status: "chua_thuc_hien", order, note: "",
      };
      const p = plannedPct(task);
      let a = def.status === "hoan_thanh" ? 1 : p * def.ratio * (0.92 + rand() * 0.16);
      if (def.ratio >= 0.97 && p >= 1) a = 1;
      if (p >= 1 && def.ratio < 0.97 && rand() < 0.45) a = 1;
      // công việc đã hết hạn từ lâu (> 45 ngày) thì coi như đã hoàn thành muộn
      if (p >= 1 && diffDays(plannedEnd, TODAY) > 45) a = 1;
      a = Math.min(1, Math.max(0, a));
      if (a > 0.985) a = 1;
      task.actualQty = roundQty(qty * a, tt.unit);
      if (task.actualQty > 0) {
        task.actualStart = addDays(plannedStart, rint(0, 6));
        if (task.actualStart > TODAY) task.actualStart = TODAY;
        task.status = "dang_thuc_hien";
      }
      if (task.actualQty >= qty) {
        task.actualQty = qty;
        task.status = "hoan_thanh";
        task.actualEnd = minDate(addDays(plannedEnd, def.ratio < 0.97 ? rint(-4, 12) : rint(-6, 1)), addDays(TODAY, -1));
        if (task.actualEnd < task.actualStart) task.actualEnd = addDays(task.actualStart, 1);
      }
      constructionPlans.push(task);
    });
  });
}

projectDefs.forEach((def) => {
  genPlan(def);
  const memberPool = [def.commanderId, ...constructionPlans.filter((t) => t.projectId === def.id).map((t) => t.assigneeId)];
  if (def.id === "p01") memberPool.push("u05", "u06", "u07", "u08", "u09", "u10", "u11", "u13", "u15", "u30");
  const tasks = constructionPlans.filter((t) => t.projectId === def.id && !t.isGroup);
  const contractValue = def.id === "p01" || tasks.length ? tasks.reduce((s, t) => s + t.contractQty * t.unitPrice, 0) : def.value;
  projects.push({
    id: def.id, code: def.code, name: def.name, shortName: def.shortName, category: def.category, location: def.location,
    investor: def.investor, contractor: def.contractor, unitId: def.unitId, commanderId: def.commanderId,
    packageName: def.packageName, contractNo: def.contractNo, contractDate: def.contractDate,
    startDate: def.startDate, endDate: def.endDate, contractValue, budget: def.budget ?? Math.round((contractValue * 0.9) / 1e6) * 1e6, costRatio: def.costRatio,
    status: def.status, settlementStatus: def.settlement || "chua_quyet_toan",
    memberIds: [...new Set(memberPool)], description: def.id === "p01" ? "Thi công kết cấu khu bay: đường cất hạ cánh (zone R2–R4B), đường lăn (zone T2–T4B), sân đỗ máy bay zone A2 – móng CPĐD loại 1, BTXM M150 & M350, lề BTN C19/C16. Vật liệu CPĐD, BTXM, thép do Chủ đầu tư cấp." : descriptions[def.category], approvalStatus: "da_duyet",
  });
});

// ---------- vị trí dự án theo 34 tỉnh, thành (sau sắp xếp đơn vị hành chính 7/2025) ----------
const GEO = {
  p01: ["Bắc Ninh", "Gia Bình, Bắc Ninh", 21.06, 106.29], p02: ["TP Đà Nẵng", "TP Đà Nẵng", 16.05, 108.2], p03: ["TP Hải Phòng", "TP Hải Phòng", 20.82, 106.72],
  p04: ["Quảng Ninh", "Vân Đồn, Quảng Ninh", 21.12, 107.41], p05: ["TP Cần Thơ", "TP Cần Thơ", 10.08, 105.71], p06: ["Phú Thọ", "Việt Trì, Phú Thọ", 21.32, 105.4],
  p07: ["Phú Thọ", "Hòa Bình, Phú Thọ", 20.81, 105.34], p08: ["TP Cần Thơ", "Sóc Trăng, TP Cần Thơ", 9.6, 105.97], p09: ["Phú Thọ", "Vĩnh Yên, Phú Thọ", 21.31, 105.6],
  p10: ["Thanh Hóa", "Thọ Xuân, Thanh Hóa", 19.9, 105.47], p11: ["Điện Biên", "Điện Biên Phủ, Điện Biên", 21.4, 103.01], p12: ["Bắc Ninh", "Kép, Bắc Ninh", 21.39, 106.26],
  p13: ["TP Hà Nội", "TP Hà Nội", 21.06, 105.72], p14: ["TP Hà Nội", "Gia Lâm, TP Hà Nội", 21.04, 105.9], p15: ["Khánh Hòa", "Cam Ranh, Khánh Hòa", 11.99, 109.22],
  p16: ["Khánh Hòa", "Nha Trang, Khánh Hòa", 12.25, 109.19], p17: ["TP Huế", "Phú Bài, TP Huế", 16.4, 107.7], p18: ["Gia Lai", "Phù Cát, Gia Lai", 13.95, 109.04],
  p19: ["Lâm Đồng", "Liên Khương, Lâm Đồng", 11.75, 108.37], p20: ["TP Hồ Chí Minh", "TP Hồ Chí Minh", 10.82, 106.66], p21: ["Gia Lai", "Pleiku, Gia Lai", 14.0, 108.02],
  p22: ["TP Hồ Chí Minh", "Côn Đảo, TP Hồ Chí Minh", 8.73, 106.63], p23: ["TP Hà Nội", "TP Hà Nội", 21.02, 105.81], p24: ["Ninh Bình", "Phủ Lý, Ninh Bình", 20.54, 105.91],
  p25: ["Nghệ An", "Vinh, Nghệ An", 18.74, 105.67], p26: ["TP Hà Nội", "TP Hà Nội", 20.98, 105.85],
};
projects.forEach((p) => { const g = GEO[p.id]; if (g) Object.assign(p, { province: g[0], location: g[1], lat: g[2], lng: g[3] }); });

// ---------- hợp đồng & phụ lục ----------
const ATT = (name, url = null, size = rint(200, 4800) * 1024) => ({ id: `att-${name.length}-${rint(1000, 9999)}`, name, type: /\.(webp|jpg|png)$/.test(name) ? "image/" + name.split(".").pop() : /\.svg$/.test(name) ? "image/svg+xml" : /\.pdf$/.test(name) ? "application/pdf" : "application/octet-stream", size, url });
const contracts = [];
projectDefs.forEach((def) => {
  const p = projects.find((x) => x.id === def.id);
  const main = { id: `hd-${def.id}`, code: def.contractNo, kind: "hop_dong", projectId: def.id, parentId: null, title: `Hợp đồng thi công xây dựng – ${p.shortName}`, signDate: def.contractDate, value: p.contractValue, startDate: def.startDate, endDate: def.endDate, files: [ATT(`HD ${def.contractNo.replace(/\//g, "-")} (ban ky).pdf`)], note: "" };
  contracts.push(main);
  const apps = ((def) => (def.id === "p01" ? [
      { id: "pl-gb-1", code: "PL01/1504/2026", date: "2026-06-05", title: "Điều chỉnh tiến độ bàn giao mặt bằng zone R4B", valueChange: 0, note: "Lùi thời điểm bàn giao mặt bằng R4B sang 12/09/2026" },
      { id: "pl-gb-2", code: "PL02/1504/2026", date: "2026-08-20", title: "Bổ sung khối lượng BTXM M350 sân đỗ zone A2", valueChange: 3850000000, note: "Theo thiết kế điều chỉnh mở rộng vệt lăn" },
      { id: "pl-gb-3", code: "PL03/1504/2026", date: "2026-10-28", title: "Điều chỉnh đơn giá nhân công theo Thông tư mới", valueChange: 1240000000, note: "Áp dụng từ đợt thanh toán 4" },
    ] : rand() < 0.4 ? [{ id: `pl-${def.id}-1`, code: `PL01/${def.contractNo}`, date: addDays(def.contractDate, 120), title: "Điều chỉnh khối lượng phát sinh", valueChange: Math.round(def.value * 0.015 / 1e6) * 1e6, note: "" }] : []))(def);
  apps.forEach((a, k) => {
    contracts.push({ id: a.id, code: a.code, kind: "phu_luc", projectId: def.id, parentId: main.id, title: a.title, signDate: a.date, value: a.valueChange, startDate: a.date, endDate: def.endDate, files: [ATT(`${a.code.replace(/\//g, "-")}.pdf`)], note: a.note });
    void k;
  });
  p.contractValue = contracts.filter((c) => c.projectId === def.id).reduce((s, c) => s + c.value, 0);
});

// ---------- construction logs (tổng = actualQty) ----------
const weathers = ["Nắng", "Nắng nhẹ", "Nhiều mây", "Mưa nhỏ", "Nắng nóng", "Âm u"];
const logContents = {
  "m³": ["Thi công theo đúng biện pháp, đã nghiệm thu nội bộ phần khối lượng hoàn thành.", "Đã lấy mẫu thí nghiệm theo quy định, chờ kết quả nén mẫu.", "Thi công ca ngày, huy động thêm 01 máy để đẩy nhanh tiến độ."],
  "m²": ["Hoàn thành phân đoạn theo kế hoạch tuần, mặt bằng đã bàn giao cho tổ kế tiếp.", "Đã kiểm tra cao độ, độ phẳng đạt yêu cầu thiết kế."],
  "m": ["Thi công đạt chiều dài thiết kế, đã kiểm tra tim tuyến.", "Ghi nhận nhật ký ép cọc, lực ép đạt yêu cầu."],
  "tấn": ["Gia công, lắp dựng cốt thép theo bản vẽ shop drawing đã duyệt.", "Đã nghiệm thu cốt thép với TVGS trước khi đổ bê tông."],
  default: ["Thi công theo kế hoạch được phân giao, không phát sinh vướng mắc.", "Đã hoàn thành khối lượng ngày, báo cáo CHT xác nhận."],
};
const photoKeysByUnit = { "m³": ["concrete", "excavation", "formwork"], "m²": ["finishing", "site", "paving"], m: ["piling", "pipe"], "tấn": ["rebar"], "bộ": ["lighting"], default: ["site", "team"] };
const constructionLogs = [];
let logSeq = 0;
constructionPlans.filter((t) => !t.isGroup && t.actualQty > 0).forEach((t) => {
  const end = t.actualEnd || addDays(TODAY, -1);
  const span = Math.max(1, diffDays(t.actualStart, end));
  // dự án demo SB Gia Bình: nhật ký chi tiết; các dự án khác rút gọn để nhẹ dữ liệu
  const n = INT_UNITS.has(t.unit) ? Math.min(t.actualQty, 2) : t.projectId === "p01" ? Math.min(10, Math.max(1, Math.ceil(span / 7))) : Math.min(2, Math.max(1, Math.ceil(span / 30)));
  const weights = Array.from({ length: n }, () => 0.6 + rand());
  const wsum = weights.reduce((a, b) => a + b, 0);
  let remain = t.actualQty;
  const proj = projectDefs.find((p) => p.id === t.projectId);
  for (let i = 0; i < n; i++) {
    let q = i === n - 1 ? remain : roundQty((t.actualQty * weights[i]) / wsum, t.unit);
    q = Math.min(q, remain);
    remain = roundQty(remain - q, t.unit);
    const date = n === 1 ? end : addDays(t.actualStart, Math.round((span * (i + 1)) / n));
    const recentLog = date >= addDays(TODAY, -3);
    const contents = logContents[t.unit] || logContents.default;
    const keys = photoKeysByUnit[t.unit] || photoKeysByUnit.default;
    constructionLogs.push({
      id: `lg-${pad(++logSeq, 4)}`, projectId: t.projectId, taskId: t.id, date: minDate(date, TODAY), qty: q,
      shift: "Ca ngày 07:00 – 17:00", weather: pick(weathers), content: pick(contents),
      reporterId: t.assigneeId, confirmedById: recentLog ? null : proj.commanderId, status: recentLog ? "da_gui" : "da_xac_nhan",
      labor: [
        { role: "Thợ chính", grade: "3,5/7", people: rint(4, 10), workdays: 0 },
        { role: "Phụ hồ", grade: "2/7", people: rint(3, 8), workdays: 0 },
      ].map((l) => ({ ...l, workdays: l.people })),
      photos: [pick(keys), pick(keys)].slice(0, rint(1, 2)),
    });
  }
});
// Nhật ký mẫu chi tiết cho công việc [10] BTXM M350 zone R2
constructionLogs
  .filter((l) => l.taskId === "t-p01-010")
  .forEach((l, i, arr) => {
    if (i === arr.length - 1) {
      l.content = "Đã rải xong BTXM M350 tấm mặt đường làn 6–7 CHC zone R2, phủ nilon bảo dưỡng. Lấy 3 tổ mẫu uốn gửi thí nghiệm.";
      l.labor = [
        { role: "Thợ bê tông", grade: "3,5/7", people: 8, workdays: 8 },
        { role: "Phụ hồ", grade: "2/7", people: 6, workdays: 6 },
        { role: "Thợ cốt thép", grade: "3/7", people: 2, workdays: 2 },
      ];
      l.photos = ["concrete", "formwork"];
    }
  });

// ---------- materials & suppliers ----------
const materials = [
  ["VL001", "Xi măng PCB40", "Xi măng", "tấn", 1650000, "TCVN 6260:2009, bao 50kg"],
  ["VL002", "Thép CB400-V Ø16", "Thép", "tấn", 15800000, "TCVN 1651-2:2018, cây 11,7m"],
  ["VL003", "Thép CB300-V Ø12", "Thép", "tấn", 15500000, "TCVN 1651-2:2018, cây 11,7m"],
  ["VL004", "Thép CB400-V Ø25", "Thép", "tấn", 16100000, "TCVN 1651-2:2018, cây 11,7m"],
  ["VL005", "Cát vàng bê tông", "Cát, đá", "m³", 420000, "Mô đun độ lớn ≥ 2,0"],
  ["VL006", "Cát san lấp", "Cát, đá", "m³", 185000, "Cát đen san nền"],
  ["VL007", "Đá dăm 1x2", "Cát, đá", "m³", 380000, "Đá bazan nghiền, TCVN 7570:2006"],
  ["VL008", "Đá dăm 0,5x1", "Cát, đá", "m³", 360000, "Đá bazan nghiền"],
  ["VL009", "Đá dăm 2x4", "Cát, đá", "m³", 340000, "Đá bazan nghiền"],
  ["VL010", "Bê tông thương phẩm M300", "Bê tông", "m³", 1480000, "Độ sụt 12±2cm, đá 1x2"],
  ["VL011", "Bê tông thương phẩm M350", "Bê tông", "m³", 1560000, "Bê tông mặt đường sân bay, độ sụt 4±2cm"],
  ["VL012", "Bê tông thương phẩm M250", "Bê tông", "m³", 1380000, "Độ sụt 12±2cm"],
  ["VL013", "Gạch không nung 6 lỗ", "Gạch, vữa", "viên", 2150, "220x105x150mm, M7,5"],
  ["VL014", "Ván khuôn phủ phim 18mm", "Ván khuôn, cốp pha", "m²", 285000, "1220x2440mm, luân chuyển 6 lần"],
  ["VL015", "Dây thép buộc 1mm", "Thép", "kg", 24500, "Thép mạ kẽm"],
  ["VL016", "Ống PVC Ø200", "Ống, phụ kiện", "m", 312000, "PN6, thoát nước ngầm"],
  ["VL017", "Cọc BTCT 300x300", "Cọc", "m", 520000, "Bê tông M300, đoạn 8m"],
  ["VL018", "Cấp phối đá dăm loại I", "Cát, đá", "m³", 395000, "Dmax 25, TCVN 8859:2011"],
  ["VL019", "Nhựa đường 60/70", "Nhựa đường", "tấn", 14200000, "TCVN 7493:2005"],
  ["VL020", "Sơn kẻ vạch nhiệt dẻo", "Sơn", "kg", 38000, "Màu trắng/vàng, phản quang"],
  ["VL021", "Cáp điện CXV 4x95mm²", "Điện", "m", 1150000, "0,6/1kV"],
  ["VL022", "Lưới thép hàn D6 a200", "Thép", "m²", 68000, "Tấm 2,4x6m"],
  ["VL023", "Matit chèn khe", "Vật liệu chèn khe", "kg", 52000, "Gốc polyurethane"],
  ["VL024", "Bulông neo M24", "Phụ kiện", "bộ", 145000, "Cấp bền 8.8"],
  ["VL025", "Màng nilon chống mất nước", "Phụ kiện", "m²", 2000, "Dày 0,15mm"],
  ["VL026", "Bê tông xi măng M150/25 (móng)", "Bê tông", "m³", 1250000, "CĐT cấp – trạm trộn công trường, đá 1x2"],
  ["VL027", "Bê tông nhựa chặt C19", "Bê tông nhựa", "tấn", 1550000, "TCVN 8819:2011, Dmax 19"],
  ["VL028", "Bê tông nhựa chặt C16", "Bê tông nhựa", "tấn", 1620000, "TCVN 8819:2011, Dmax 16"],
  ["VL029", "Nhũ tương nhựa đường tưới dính bám", "Nhựa đường", "kg", 14500, "CSS-1h, 0,5 kg/m²"],
  ["VL030", "Thép thanh truyền lực Ø32", "Thép", "tấn", 16500000, "CĐT cấp – thép tròn trơn CB240-T, L=45cm"],
  ["VL031", "Dầu diesel 0,05S", "Nhiên liệu", "lít", 21500, "Cấp cho xe máy thi công"],
].map(([code, name, group, unit, unitPrice, spec], i) => ({ id: `m${pad(i + 1, 2)}`, code, name, group, unit, unitPrice, spec }));
const mat = (code) => materials.find((m) => m.code === code);

const suppliers = [
  ["NCC001", "Công ty CP Bê tông Hà Thành", "0101234567", "Km 12 Đại lộ Thăng Long, Hà Nội", "Nguyễn Văn Thành", ["Bê tông"], 4.6],
  ["NCC002", "Công ty CP Thép Việt Hưng", "0102345678", "KCN Phố Nối A, Hưng Yên", "Trần Thị Hương", ["Thép"], 4.4],
  ["NCC003", "Công ty TNHH VLXD Minh Phát", "0103456789", "Số 25 Phạm Văn Đồng, Hà Nội", "Lê Minh Phát", ["Xi măng", "Gạch, vữa", "Cát, đá"], 4.1],
  ["NCC004", "Công ty CP Khai thác đá Kiện Khê", "0700123456", "Thanh Liêm, Hà Nam", "Đỗ Văn Kiên", ["Cát, đá"], 4.3],
  ["NCC005", "Công ty TNHH Cốp pha Thăng Long", "0104567890", "KCN Quang Minh, Hà Nội", "Phạm Thăng", ["Ván khuôn, cốp pha", "Phụ kiện"], 3.9],
  ["NCC006", "Công ty CP Nhựa đường Hải Nam", "0200987654", "Cảng Đình Vũ, Hải Phòng", "Vũ Hải Nam", ["Nhựa đường", "Sơn", "Vật liệu chèn khe"], 4.2],
  ["NCC007", "Công ty CP Cơ điện Thành Long", "0105678901", "Số 8 Lê Văn Lương, Hà Nội", "Hoàng Thành Long", ["Điện", "Ống, phụ kiện"], 4.0],
  ["NCC008", "Công ty TNHH Cọc bê tông Sông Đà", "0106789012", "Ba Vì, Hà Nội", "Nguyễn Sông", ["Cọc"], 4.5],
  ["NCC009", "Công ty CP Bê tông nhựa Kinh Bắc", "2300456789", "KCN Quế Võ, Bắc Ninh", "Trần Văn Bắc", ["Bê tông nhựa"], 4.4],
  ["NCC010", "Công ty CP Xăng dầu Bắc Ninh", "2300112233", "TP Bắc Ninh, Bắc Ninh", "Nguyễn Thị Dầu", ["Nhiên liệu"], 4.7],
].map(([code, name, taxCode, address, contact, materialGroups, rating], i) => ({
  id: `s${pad(i + 1, 2)}`, code, name, taxCode, address, contact, phone: `024${pad(3800000 + i * 12345, 7)}`, materialGroups, rating, debt: 0,
}));
const supplierFor = (m) => suppliers.find((s) => s.materialGroups.includes(m.group)) || suppliers[2];

// ---------- inventory & stock transactions ----------
const inventory = [];
const stockTransactions = [];
let txSeq = 0;
const projectMaterials = {
  p01: null, // tính từ khối lượng tiến độ SB Gia Bình (bên dưới)
  airport: [["VL001", 2400], ["VL004", 380], ["VL005", 2600], ["VL007", 4200], ["VL011", 52000], ["VL018", 64000], ["VL019", 120], ["VL020", 18000], ["VL021", 6200], ["VL023", 14000], ["VL025", 160000]],
  building: [["VL001", 900], ["VL002", 260], ["VL003", 210], ["VL005", 1600], ["VL007", 2400], ["VL010", 9000], ["VL013", 600000], ["VL014", 4200], ["VL015", 8000], ["VL017", 24000]],
};
function projectProgress(pid) {
  const ts = constructionPlans.filter((t) => t.projectId === pid && !t.isGroup);
  const total = ts.reduce((s, t) => s + t.contractQty * t.unitPrice, 0);
  return total ? ts.reduce((s, t) => s + t.actualQty * t.unitPrice, 0) / total : 0;
}
const tx = (o) => stockTransactions.push({ id: `tx-${pad(++txSeq, 4)}`, code: `${o.type === "nhap" ? "PNK" : "PXK"}-${pad(txSeq, 4)}`, requestId: null, taskId: null, supplierId: null, note: "", ...o });
{
  const gb = constructionPlans.filter((t) => t.projectId === "p01" && !t.isGroup);
  const sum = (re) => gb.filter((t) => re.test(t.name)).reduce((s, t) => s + t.contractQty, 0);
  const r0 = (x) => Math.round(x / 10) * 10;
  const m350 = sum(/M350/);
  projectMaterials.p01 = [
    ["VL018", r0(sum(/CPĐD/) * 1.32)], ["VL026", r0(sum(/M150/) * 1.02)], ["VL011", r0(m350 * 1.02)],
    ["VL027", r0(sum(/BTN C19/) * 0.08 * 2.35)], ["VL028", r0(sum(/BTN C16/) * 0.07 * 2.35)], ["VL029", r0((sum(/BTN C19/) + sum(/BTN C16/)) * 0.5 * 1.05)],
    ["VL030", Math.round(m350 * 0.012)], ["VL023", r0(m350 * 0.9)], ["VL025", r0(m350 * 2.6)], ["VL031", 520000],
  ];
}
projectDefs.forEach((def) => {
  if (def.status === "chuan_bi") return;
  const list = def.id === "p01" ? projectMaterials.p01 : def.template?.startsWith("airport") ? projectMaterials.airport : projectMaterials.building;
  const scale = def.id === "p01" ? 1 : def.value / (def.template?.startsWith("airport") ? 760e9 : 400e9);
  const prog = projectProgress(def.id);
  const pTasks = constructionPlans.filter((t) => t.projectId === def.id && !t.isGroup && t.actualQty > 0);
  list.forEach(([code, baseNorm], idx) => {
    const m = mat(code);
    const normQty = roundQty(baseNorm * scale, m.unit === "viên" ? "viên" : "m³");
    let consumeFactor = 0.85 + rand() * 0.3;
    // tạo một vài tình huống cảnh báo
    const special = (def.id === "p01" && code === "VL029") || (def.id === "p02" && code === "VL023") || (def.id === "p07" && code === "VL013") || (def.id === "p09" && code === "VL010");
    if (special) consumeFactor = 0.93 / Math.max(prog, 0.05);
    const issued = roundQty(Math.min(normQty * 1.02, normQty * prog * consumeFactor), m.unit);
    let onHand = roundQty(normQty * (0.03 + rand() * 0.06), m.unit);
    let minStock = roundQty(normQty * 0.04, m.unit);
    const shortage = (def.id === "p01" && (code === "VL027" || code === "VL023")) || (def.id === "p02" && code === "VL011") || (def.id === "p04" && code === "VL004") || (def.id === "p09" && code === "VL010");
    if (shortage) onHand = roundQty(minStock * 0.35, m.unit);
    // SB Gia Bình: tồn tối thiểu hợp lý theo từng vật tư; 1 vật tư "sắp hết" (≤ 120% tối thiểu)
    if (def.id === "p01" && !shortage) minStock = roundQty(onHand * (code === "VL025" ? 0.9 : 0.35 + rand() * 0.3), m.unit);
    if (def.status === "hoan_thanh") onHand = 0;
    const received = roundQty(issued + onHand, m.unit);
    inventory.push({ id: `inv-${def.id}-${code}`, projectId: def.id, materialId: m.id, normQty, minStock: def.status === "hoan_thanh" ? 0 : minStock, location: `Kho công trường ${def.shortName}` });
    if (received <= 0) return;
    const sup = supplierFor(m);
    // nhập kho: 2-3 lần
    const nIn = rint(2, 3);
    let rem = received;
    for (let i = 0; i < nIn; i++) {
      const q = i === nIn - 1 ? rem : roundQty((received / nIn) * (0.8 + rand() * 0.4), m.unit);
      rem = roundQty(rem - q, m.unit);
      const date = lerpDate(def.startDate, minDate(addDays(TODAY, -2), def.endDate), (i + 0.3) / nIn);
      tx({ type: "nhap", projectId: def.id, materialId: m.id, qty: q, date, supplierId: sup.id, byId: def.id === "p01" ? "u10" : def.commanderId, note: `Nhập theo hợp đồng mua bán với ${sup.name}` });
    }
    // xuất sử dụng: 2-4 lần, gắn với đầu việc
    if (issued > 0) {
      const nOut = rint(2, 4);
      let r2 = issued;
      for (let i = 0; i < nOut; i++) {
        const q = i === nOut - 1 ? r2 : roundQty((issued / nOut) * (0.8 + rand() * 0.4), m.unit);
        r2 = roundQty(r2 - q, m.unit);
        const date = lerpDate(def.startDate, minDate(addDays(TODAY, -1), def.endDate), (i + 0.6) / nOut);
        const task = pTasks.length ? pick(pTasks) : null;
        tx({ type: "xuat", projectId: def.id, materialId: m.id, qty: q, date, taskId: task?.id || null, byId: def.id === "p01" ? "u10" : def.commanderId, note: task ? `Xuất thi công: ${task.name}` : "Xuất sử dụng thi công" });
      }
    }
    void idx;
  });
});

// ---------- material requests ----------
const mr = [];
const MR = (o) => {
  const id = `mr-${pad(mr.length + 1, 3)}`;
  mr.push({
    id, code: `ĐXVT-2026-${pad(mr.length + 101)}`, type: "mua_vat_tu", itemId: null, taskId: null, approverId: "u04",
    supplierId: null, orderNo: null, orderDate: null, expectedDelivery: null, starred: false, note: "", ...o,
    lines: o.lines.map(([code, qty]) => ({ materialId: mat(code).id, qty, unitPrice: mat(code).unitPrice })),
  });
};
const H = (at, byId, action, note) => ({ at: `${at}T08:${pad(rint(10, 59), 2)}:00`, byId, action, note });
MR({ title: "BTN C19 rải thảm lề CHC zone R2", projectId: "p01", itemId: "i-p01-B", taskId: "t-p01-014", requesterId: "u10", createdAt: "2026-11-12", neededDate: "2026-11-27", status: "cho_duyet", starred: true, lines: [["VL027", 1800]], note: "Đợt 1 – thảm lề vật liệu CHC zone R2 (18.684 m²)", history: [H("2026-11-12", "u10", "Tạo đề xuất"), H("2026-11-12", "u10", "Gửi phê duyệt")] });
MR({ title: "Nhũ tương tưới dính bám lề CHC zone R2", projectId: "p01", itemId: "i-p01-B", taskId: "t-p01-014", requesterId: "u10", createdAt: "2026-11-11", neededDate: "2026-11-26", status: "cho_duyet", lines: [["VL029", 9500]], history: [H("2026-11-11", "u10", "Tạo đề xuất"), H("2026-11-11", "u10", "Gửi phê duyệt")] });
MR({ title: "Matit chèn khe mặt đường CHC zone R4B", projectId: "p01", itemId: "i-p01-B", taskId: "t-p01-040", requesterId: "u11", createdAt: "2026-11-02", neededDate: "2026-11-08", status: "cho_duyet", starred: true, lines: [["VL023", 1500]], history: [H("2026-11-02", "u11", "Tạo đề xuất"), H("2026-11-02", "u11", "Gửi phê duyệt")] });
MR({ title: "Màng nilon bảo dưỡng BTXM zone R3", projectId: "p01", itemId: "i-p01-B", taskId: "t-p01-020", requesterId: "u10", createdAt: "2026-10-28", neededDate: "2026-11-05", status: "cho_duyet", lines: [["VL025", 20000]], history: [H("2026-10-28", "u10", "Tạo đề xuất"), H("2026-10-28", "u10", "Gửi phê duyệt")] });
MR({ title: "Điều chuyển thép thanh truyền lực sang đường lăn T2", type: "dieu_chuyen", projectId: "p01", itemId: "i-p01-C", taskId: "t-p01-051", requesterId: "u13", createdAt: "2026-11-08", neededDate: "2026-11-24", status: "tra_lai", lines: [["VL030", 12]], history: [H("2026-11-08", "u13", "Tạo đề xuất"), H("2026-11-08", "u13", "Gửi phê duyệt"), H("2026-11-09", "u04", "Trả lại", "Bổ sung biên bản bàn giao thép CĐT cấp và kế hoạch đổ BTXM M350 zone T2")] });
MR({ title: "BTN C16 thảm lề CHC zone R3", projectId: "p01", itemId: "i-p01-B", taskId: "t-p01-025", requesterId: "u10", createdAt: "2026-11-13", neededDate: "2026-11-28", status: "nhap", lines: [["VL028", 1800]], history: [H("2026-11-13", "u10", "Tạo đề xuất (lưu nháp)")] });
MR({ title: "Dầu diesel xe máy thi công tháng 11", projectId: "p01", itemId: "i-p01-A", taskId: null, requesterId: "u13", createdAt: "2026-11-04", neededDate: "2026-11-15", status: "da_duyet", lines: [["VL031", 60000]], history: [H("2026-11-04", "u13", "Tạo đề xuất"), H("2026-11-04", "u13", "Gửi phê duyệt"), H("2026-11-05", "u04", "Phê duyệt", "Đồng ý, cấp theo định mức ca máy")] });
MR({ title: "Tạm ứng mua BTN C19 lề CHC zone R4A", type: "tam_ung", projectId: "p01", itemId: "i-p01-B", taskId: "t-p01-034", requesterId: "u11", createdAt: "2026-10-30", neededDate: "2026-11-10", status: "dat_hang", starred: true, supplierId: "s09", orderNo: "ĐH-KB-2026-0412", orderDate: "2026-11-02", expectedDelivery: "2026-11-16", lines: [["VL027", 2400]], history: [H("2026-10-30", "u11", "Tạo đề xuất"), H("2026-10-30", "u11", "Gửi phê duyệt"), H("2026-10-31", "u04", "Phê duyệt"), H("2026-11-01", "u11", "Tổng hợp nhu cầu, kiểm tra tồn kho", "Tồn kho BTN C19 không đủ – cần mua"), H("2026-11-02", "u11", "Chọn nhà cung cấp & đặt hàng", "Trạm trộn BTN Kinh Bắc, giao theo ca rải")] });
MR({ title: "Matit chèn khe mặt đường CHC zone R2", projectId: "p01", itemId: "i-p01-B", taskId: "t-p01-010", requesterId: "u10", createdAt: "2026-10-25", neededDate: "2026-11-03", status: "da_nhap_kho", supplierId: "s06", orderNo: "ĐH-HN-2026-0398", orderDate: "2026-10-27", expectedDelivery: "2026-11-02", lines: [["VL023", 1800]], history: [H("2026-10-25", "u10", "Tạo đề xuất"), H("2026-10-25", "u10", "Gửi phê duyệt"), H("2026-10-26", "u04", "Phê duyệt"), H("2026-10-27", "u11", "Chọn nhà cung cấp & đặt hàng"), H("2026-11-02", "u10", "Nhập kho", "PNK theo đề xuất")] });
MR({ title: "Dầu diesel xe máy thi công tháng 10", projectId: "p01", itemId: "i-p01-A", taskId: null, requesterId: "u13", createdAt: "2026-10-01", neededDate: "2026-10-05", status: "hoan_thanh", supplierId: "s10", orderNo: "ĐH-XD-2026-1120", orderDate: "2026-10-02", expectedDelivery: "2026-10-04", lines: [["VL031", 55000]], history: [H("2026-10-01", "u13", "Tạo đề xuất"), H("2026-10-01", "u13", "Gửi phê duyệt"), H("2026-10-01", "u04", "Phê duyệt"), H("2026-10-02", "u11", "Chọn nhà cung cấp & đặt hàng"), H("2026-10-04", "u10", "Nhập kho"), H("2026-10-06", "u10", "Xuất sử dụng")] });
MR({ title: "Màng nilon bảo dưỡng BTXM zone R2", projectId: "p01", itemId: "i-p01-B", taskId: "t-p01-010", requesterId: "u11", createdAt: "2026-09-02", neededDate: "2026-09-08", status: "hoan_thanh", supplierId: "s05", orderNo: "ĐH-TL-2026-0301", orderDate: "2026-09-03", expectedDelivery: "2026-09-08", lines: [["VL025", 30000]], history: [H("2026-09-02", "u11", "Tạo đề xuất"), H("2026-09-02", "u11", "Gửi phê duyệt"), H("2026-09-02", "u04", "Phê duyệt"), H("2026-09-03", "u11", "Chọn nhà cung cấp & đặt hàng"), H("2026-09-08", "u10", "Nhập kho"), H("2026-09-12", "u10", "Xuất sử dụng")] });
MR({ title: "Bê tông M350 bổ sung zone R4B", projectId: "p01", itemId: "i-p01-B", taskId: "t-p01-040", requesterId: "u10", createdAt: "2026-10-30", neededDate: "2026-11-04", status: "tu_choi", lines: [["VL011", 900]], history: [H("2026-10-30", "u10", "Tạo đề xuất"), H("2026-10-30", "u10", "Gửi phê duyệt"), H("2026-10-31", "u04", "Từ chối", "BTXM do Chủ đầu tư cấp – đề nghị lập phiếu yêu cầu cấp vật liệu gửi CĐT")] });
MR({ title: "Bê tông M350 mặt đường sân đỗ đợt 5", projectId: "p02", itemId: "i-p02-4", taskId: "t-p02-008", requesterId: "u20", approverId: "u20", createdAt: "2026-11-10", neededDate: "2026-11-20", status: "cho_duyet", starred: true, lines: [["VL011", 1800]], history: [H("2026-11-10", "u20", "Tạo đề xuất"), H("2026-11-10", "u20", "Gửi phê duyệt")] });
MR({ title: "Matit chèn khe co giãn", projectId: "p02", itemId: "i-p02-4", taskId: "t-p02-009", requesterId: "u20", approverId: "u20", createdAt: "2026-10-26", neededDate: "2026-11-12", status: "dat_hang", supplierId: "s06", orderNo: "ĐH-HN-2026-0087", orderDate: "2026-10-29", expectedDelivery: "2026-11-12", lines: [["VL023", 2500]], history: [H("2026-10-26", "u20", "Tạo đề xuất"), H("2026-10-26", "u20", "Gửi phê duyệt"), H("2026-10-27", "u20", "Phê duyệt"), H("2026-10-29", "u20", "Chọn nhà cung cấp & đặt hàng")] });
MR({ title: "Cấp phối đá dăm loại I móng đường lăn", projectId: "p03", itemId: "i-p03-3", taskId: "t-p03-006", requesterId: "u21", approverId: "u21", createdAt: "2026-11-06", neededDate: "2026-11-25", status: "da_duyet", lines: [["VL018", 4200]], history: [H("2026-11-06", "u21", "Tạo đề xuất"), H("2026-11-06", "u21", "Gửi phê duyệt"), H("2026-11-07", "u21", "Phê duyệt")] });
MR({ title: "Thép Ø25 cống hộp BTCT", projectId: "p04", itemId: "i-p04-5", taskId: "t-p04-010", requesterId: "u22", approverId: "u22", createdAt: "2026-11-09", neededDate: "2026-11-19", status: "cho_duyet", lines: [["VL004", 46]], history: [H("2026-11-09", "u22", "Tạo đề xuất"), H("2026-11-09", "u22", "Gửi phê duyệt")] });
MR({ title: "Xi măng PCB40 xây tường kho", projectId: "p06", itemId: "i-p06-3", taskId: null, requesterId: "u24", approverId: "u24", createdAt: "2026-09-15", neededDate: "2026-09-25", status: "hoan_thanh", supplierId: "s03", orderNo: "ĐH-MP-2026-0955", orderDate: "2026-09-17", expectedDelivery: "2026-09-24", lines: [["VL001", 120]], history: [H("2026-09-15", "u24", "Tạo đề xuất"), H("2026-09-15", "u24", "Gửi phê duyệt"), H("2026-09-16", "u24", "Phê duyệt"), H("2026-09-17", "u24", "Chọn nhà cung cấp & đặt hàng"), H("2026-09-24", "u24", "Nhập kho"), H("2026-09-26", "u24", "Xuất sử dụng")] });
MR({ title: "Gạch không nung nhà ở học viên", projectId: "p07", itemId: "i-p07-3", taskId: null, requesterId: "u25", approverId: "u25", createdAt: "2026-10-18", neededDate: "2026-11-01", status: "da_nhap_kho", supplierId: "s03", orderNo: "ĐH-MP-2026-1188", orderDate: "2026-10-20", expectedDelivery: "2026-10-31", lines: [["VL013", 120000]], history: [H("2026-10-18", "u25", "Tạo đề xuất"), H("2026-10-18", "u25", "Gửi phê duyệt"), H("2026-10-19", "u25", "Phê duyệt"), H("2026-10-20", "u25", "Chọn nhà cung cấp & đặt hàng"), H("2026-10-31", "u25", "Nhập kho")] });
MR({ title: "Bê tông M300 sàn tầng 3 nhà làm việc", projectId: "p09", itemId: "i-p09-3", taskId: "t-p09-006", requesterId: "u27", approverId: "u27", createdAt: "2026-11-11", neededDate: "2026-11-21", status: "cho_duyet", lines: [["VL010", 210]], history: [H("2026-11-11", "u27", "Tạo đề xuất"), H("2026-11-11", "u27", "Gửi phê duyệt")] });
MR({ title: "Sơn kẻ vạch nhiệt dẻo đường lăn", projectId: "p05", itemId: "i-p05-5", taskId: null, requesterId: "u23", approverId: "u23", createdAt: "2026-11-13", neededDate: "2027-01-15", status: "nhap", lines: [["VL020", 3500]], history: [H("2026-11-13", "u23", "Tạo đề xuất (lưu nháp)")] });
// tổ đề xuất: theo tổ của công việc, nếu không có thì lấy tổ đầu tiên của hạng mục
mr.forEach((r) => {
  const t = constructionPlans.find((x) => x.id === r.taskId);
  r.team = t?.team || constructionPlans.find((x) => x.itemId === r.itemId && x.team && !x.isGroup)?.team || constructionPlans.find((x) => x.projectId === r.projectId && x.team)?.team || "";
});
// phiếu nhập/xuất gắn với đề xuất đã nhập kho / hoàn thành
mr.forEach((r) => {
  if (!["da_nhap_kho", "hoan_thanh"].includes(r.status)) return;
  const recvAt = r.history.find((h) => h.action === "Nhập kho").at.slice(0, 10);
  r.lines.forEach((l) => {
    tx({ type: "nhap", projectId: r.projectId, materialId: l.materialId, qty: l.qty, date: recvAt, requestId: r.id, supplierId: r.supplierId, byId: r.requesterId, note: `Nhập kho theo đề xuất ${r.code}` });
    if (!inventory.find((i) => i.projectId === r.projectId && i.materialId === l.materialId)) {
      const m = materials.find((x) => x.id === l.materialId);
      inventory.push({ id: `inv-${r.projectId}-${m.code}`, projectId: r.projectId, materialId: m.id, normQty: roundQty(l.qty * 6, m.unit), minStock: roundQty(l.qty * 0.3, m.unit), location: `Kho công trường ${projects.find((p) => p.id === r.projectId).shortName}` });
    }
    if (r.status === "hoan_thanh") {
      const outAt = r.history.find((h) => h.action === "Xuất sử dụng").at.slice(0, 10);
      tx({ type: "xuat", projectId: r.projectId, materialId: l.materialId, qty: l.qty, date: outAt, requestId: r.id, taskId: r.taskId, byId: r.requesterId, note: `Xuất sử dụng theo đề xuất ${r.code}` });
    }
  });
});
stockTransactions.sort((a, b) => a.date.localeCompare(b.date));

// ---------- equipment ----------
const eqGroups = [
  { group: "Máy rải bê tông", n: 6, names: ["Máy rải bê tông 130-140CV", "Máy rải bê tông 250CV", "Máy rải bê tông 130CV"], brands: ["Wirtgen SP 64", "Gomaco GP-2600", "Vögele Super 1800"], fuel: 22, prefix: "" },
  { group: "Máy xúc", n: 10, names: ["Máy xúc đào 1,25m³", "Máy xúc đào 0,8m³", "Máy xúc lật 2,3m³"], brands: ["Komatsu PC200-8", "Hitachi ZX210", "Kobelco SK200", "Doosan DX225"], fuel: 16 },
  { group: "Máy ủi", n: 6, names: ["Máy ủi 140CV", "Máy ủi 110CV", "Máy ủi 180CV"], brands: ["Komatsu D65", "Caterpillar D6R", "Shantui SD16"], fuel: 18 },
  { group: "Máy lu rung", n: 6, names: ["Máy lu rung 25T", "Máy lu bánh lốp 16T", "Máy lu rung 12T"], brands: ["Sakai SV512", "Dynapac CA602", "XCMG XS263"], fuel: 12 },
  { group: "Máy tưới nước", n: 5, names: ["Máy tưới nước 5m³", "Máy tưới nước 8m³"], brands: ["Hyundai HD210", "Hino FG8J"], fuel: 9 },
  { group: "Máy cắt khe", n: 4, names: ["Máy cắt khe 13HP", "Máy cắt khe 18HP"], brands: ["Husqvarna FS524", "Norton CS1"], fuel: 2.5 },
  { group: "Ô tô tự đổ", n: 6, names: ["Ô tô tự đổ 15T", "Ô tô tự đổ 25T"], brands: ["Howo ZZ3257", "Hyundai HD270"], fuel: 14 },
  { group: "Cần trục tháp", n: 3, names: ["Cần trục tháp QTZ80", "Cần trục tháp QTZ125"], brands: ["Zoomlion TC6013", "Potain MC125"], fuel: 0 },
  { group: "Trạm trộn BTXM", n: 2, names: ["Trạm trộn bê tông 120m³/h", "Trạm trộn bê tông 90m³/h"], brands: ["Sicoma", "Liebherr Betomix"], fuel: 0 },
];
const activeProjects = projectDefs.filter((p) => p.status === "dang_thi_cong").map((p) => p.id);
const projectsForGroup = (g) => {
  const airport = activeProjects.filter((id) => projectDefs.find((p) => p.id === id).template === "airport");
  const building = activeProjects.filter((id) => projectDefs.find((p) => p.id === id).template === "building");
  if (["Máy rải bê tông", "Máy cắt khe", "Máy lu rung", "Máy tưới nước"].includes(g)) return airport.concat(["p01"]);
  if (["Cần trục tháp", "Trạm trộn BTXM"].includes(g)) return building;
  return activeProjects;
};
const equipment = [];
let opIdx = 0;
const unitCodes = { "d-acc24": "M24", "d-acc244": "M244", "d-acc245": "M245", "d-acc25": "M25", "d-tbcn": "M" };
eqGroups.forEach((g) => {
  for (let i = 0; i < g.n; i++) {
    const unit = pick(["d-acc24", "d-acc244", "d-acc245", "d-acc25"]);
    const ownership = rand() < 0.72 ? "so_huu" : "thue_ngoai";
    const r = rand();
    let status = r < 0.66 ? "hoat_dong" : r < 0.8 ? "nhan_roi" : r < 0.95 ? "bao_tri" : "ngung";
    const pool = projectsForGroup(g.group);
    let currentProjectId = status === "hoat_dong" || status === "bao_tri" ? pick(pool) : null;
    const totalHours = rint(1200, 9800);
    const interval = g.group === "Ô tô tự đổ" ? 500 : 250;
    let lastMaintenanceHours = totalHours - rint(20, interval + 40);
    if (status === "bao_tri") lastMaintenanceHours = totalHours - interval - rint(5, 30);
    const code = `${unitCodes[unit]}.${pad(rint(10, 240), 4)}`;
    const operatorId = currentProjectId ? `op${pad((opIdx++ % operatorNames.length) + 1, 2)}` : null;
    equipment.push({
      id: `eq-${pad(equipment.length + 1)}`, code, name: pick(g.names), group: g.group, ownership,
      plate: ["Ô tô tự đổ", "Máy tưới nước"].includes(g.group) ? `${pick(["29KT", "30H", "15C", "43C", "65C"])}-${rint(100, 999)}.${rint(10, 99)}` : `${pick(["QA", "XD", "KT"])} ${rint(1000, 9999)}`,
      brand: pick(g.brands), year: rint(2014, 2024), manageUnitId: unit, status, currentProjectId, operatorId,
      totalHours, fuelNorm: g.fuel, maintenanceInterval: interval, lastMaintenanceHours,
      rentalSupplier: ownership === "thue_ngoai" ? pick(["Công ty CP Cơ giới Hà Đông", "Công ty TNHH Thiết bị Nam Việt", "Công ty CP Máy xây dựng Miền Trung"]) : undefined,
      rentalRate: ownership === "thue_ngoai" ? rint(28, 75) * 100000 : undefined,
      maintenances: [
        { id: `mt-${equipment.length + 1}-1`, date: addDays(TODAY, -rint(60, 160)), type: "bao_duong", content: "Bảo dưỡng định kỳ cấp 1: thay dầu động cơ, lọc nhớt, lọc nhiên liệu", cost: rint(8, 25) * 1000000, hoursAt: lastMaintenanceHours - interval },
        { id: `mt-${equipment.length + 1}-2`, date: addDays(TODAY, -rint(5, 55)), type: rand() < 0.3 ? "sua_chua" : "bao_duong", content: pick(["Bảo dưỡng định kỳ cấp 2: kiểm tra hệ thống thủy lực", "Sửa chữa bơm thủy lực, thay gioăng xi lanh", "Thay xích, kiểm tra hệ thống di chuyển", "Bảo dưỡng định kỳ cấp 1"]), cost: rint(10, 80) * 1000000, hoursAt: lastMaintenanceHours },
      ],
    });
  }
});
// đảm bảo dữ liệu tham chiếu trang 20
const ensure = (i, o) => Object.assign(equipment[i], o);
ensure(0, { code: "M24.0092", name: "Máy rải bê tông 130-140CV", status: "hoat_dong", currentProjectId: "p01" });
ensure(6, { code: "M244.0183", name: "Máy xúc đào 1,25m³", status: "hoat_dong", currentProjectId: "p01" });
ensure(7, { code: "M244.0190", name: "Máy xúc đào 0,8m³", status: "hoat_dong", currentProjectId: "p01" });
ensure(16, { code: "M24.0171", name: "Máy ủi 140CV", status: "hoat_dong", currentProjectId: "p03" });
ensure(17, { code: "M25.0094", name: "Máy ủi 110CV", status: "bao_tri", currentProjectId: "p09" });
ensure(28, { code: "M25.0010", name: "Máy tưới nước 5m³", status: "hoat_dong", currentProjectId: "p02" });
ensure(29, { code: "M245.0147", name: "Máy tưới nước 8m³", status: "nhan_roi", currentProjectId: null, operatorId: null });
ensure(33, { code: "M245.0205", name: "Máy cắt khe 13HP", status: "hoat_dong", currentProjectId: "p04" });
ensure(5, { code: "M245.0012", name: "Máy rải bê tông 130CV", status: "ngung", currentProjectId: null, operatorId: null });
ensure(10, { code: "M244.0221", name: "Máy xúc đào 1,25m³", status: "nhan_roi", currentProjectId: null, operatorId: null, ownership: "so_huu" });
equipment.forEach((e) => {
  if (e.status === "hoat_dong" && !e.operatorId) e.operatorId = `op${pad((opIdx++ % operatorNames.length) + 1, 2)}`;
  if (e.status === "nhan_roi" || e.status === "ngung") { e.currentProjectId = null; e.operatorId = null; }
});
// unique codes
const seen = new Set();
equipment.forEach((e) => { while (seen.has(e.code)) e.code = e.code.replace(/\d{4}$/, pad(rint(10, 999), 4)); seen.add(e.code); });

// thông tin hồ sơ xe máy theo danh mục tính năng (ô tô / xe biển đỏ / máy thiết bị)
equipment.forEach((e, i) => {
  const vehicle = ["Ô tô tự đổ", "Máy tưới nước"].includes(e.group);
  e.kind = vehicle ? (i % 4 === 0 ? "xe_bien_do" : "o_to") : "may_thiet_bi";
  if (e.kind === "xe_bien_do") { e.plate = `${pick(["QA", "KT", "QB"])}-${rint(10, 99)}-${rint(10, 99)}`; e.vetcCode = `VETC${rint(100000, 999999)}`; }
  e.assetCode = `TS-${e.code.replace(".", "-")}`;
  e.chassisNo = `${e.brand.split(" ")[0].slice(0, 3).toUpperCase()}${rint(100000, 999999)}`;
  e.engineNo = `E${rint(1000000, 9999999)}`;
  e.qualityGrade = pick(["Cấp 1", "Cấp 2", "Cấp 2", "Cấp 3"]);
  e.decisionNo = e.ownership === "thue_ngoai" ? `HĐ thuê ${rint(10, 99)}/2026/HĐTB` : `QĐ ${rint(100, 999)}/QĐ-TBCN ngày ${pad(rint(1, 28), 2)}/${pad(rint(1, 12), 2)}/${rint(2019, 2025)}`;
  e.inspectionDue = vehicle || ["Cần trục tháp", "Máy lu rung"].includes(e.group) ? addDays(TODAY, rint(-20, 300)) : null;
  e.insuranceDue = vehicle ? addDays(TODAY, rint(-10, 330)) : null;
  e.ownerProof = e.ownership === "so_huu" || rand() < 0.75;
});
Object.assign(equipment[28], { inspectionDue: "2026-11-08", insuranceDue: "2026-12-01" });
equipment.forEach((e) => {
  e.images = e.group === "Máy rải bê tông" ? [{ id: `img-${e.id}`, name: "XCMG RP903.webp", type: "image/webp", size: 139374, url: "assets/samples/may-rai-xcmg.webp" }] : [];
  e.docFiles = [];
});

// ---------- equipment shifts (21 ngày gần nhất) ----------
const equipmentShifts = [];
let shSeq = 0;
const outputs = { "Máy xúc": "m³ đất đào", "Máy ủi": "m³ san gạt", "Máy lu rung": "m² lu lèn", "Máy rải bê tông": "m³ bê tông rải", "Máy tưới nước": "chuyến", "Máy cắt khe": "m khe cắt", "Ô tô tự đổ": "chuyến", "Cần trục tháp": "lượt cẩu", "Trạm trộn BTXM": "m³ bê tông" };
equipment.filter((e) => e.status === "hoat_dong").forEach((e) => {
  for (let k = 21; k >= 1; k--) {
    const date = addDays(TODAY, -k);
    if (d(date).getUTCDay() === 0) continue;
    if (rand() < 0.12) continue;
    const hours = Math.round((5 + rand() * 4) * 2) / 2;
    const fuel = Math.round(hours * e.fuelNorm * (0.88 + rand() * 0.28) * 10) / 10;
    const outUnit = outputs[e.group] || "giờ";
    equipmentShifts.push({
      id: `sh-${pad(++shSeq, 4)}`, equipmentId: e.id, projectId: e.currentProjectId, date, shift: rand() < 0.85 ? "Ca 1" : "Ca 2",
      operatorId: e.operatorId, hours, fuelLiters: fuel, output: `${Math.round(hours * rint(8, 40))} ${outUnit}`, note: "",
    });
  }
});
equipmentShifts.forEach((s) => {
  s.logged = true;
  const e = equipment.find((x) => x.id === s.equipmentId);
  s.km = e.kind === "may_thiet_bi" ? 0 : Math.round(s.hours * rint(6, 14));
});
// lịch phân ca tuần tới cho máy tại SB Gia Bình (chưa có nhật trình)
equipment.filter((e) => e.status === "hoat_dong" && e.currentProjectId === "p01").forEach((e, k) => {
  for (let n = 0; n <= 6; n++) {
    const date = addDays(TODAY, n);
    if (d(date).getUTCDay() === 0) continue;
    equipmentShifts.push({ id: `sh-${pad(++shSeq, 4)}`, equipmentId: e.id, projectId: "p01", date, shift: "Ca 1", operatorId: e.operatorId, hours: 0, fuelLiters: 0, output: "", note: "", km: 0, logged: false });
    if (k % 2 === 0) equipmentShifts.push({ id: `sh-${pad(++shSeq, 4)}`, equipmentId: e.id, projectId: "p01", date, shift: "Ca 2", operatorId: `op${pad(((k + n) % 24) + 1, 2)}`, hours: 0, fuelLiters: 0, output: "", note: "", km: 0, logged: false });
  }
});
// một số ca vượt định mức nhiên liệu
equipmentShifts.filter((x, i) => x.logged && i % 37 === 5).forEach((s) => {
  const e = equipment.find((x) => x.id === s.equipmentId);
  s.fuelLiters = Math.round(s.hours * e.fuelNorm * 1.32 * 10) / 10;
  s.note = "Tiêu hao nhiên liệu cao hơn định mức – cần kiểm tra";
});

// ---------- equipment assignments ----------
const equipmentAssignments = [];
let asSeq = 0;
// mọi thiết bị đang ở công trình đều có quyết định điều động (ngày máy về công trình)
equipment.filter((e) => e.currentProjectId && e !== equipment[16]).forEach((e) => {
  const proj = projectDefs.find((p) => p.id === e.currentProjectId);
  let start = addDays(TODAY, -rint(60, 320));
  if (start < proj.startDate) start = addDays(proj.startDate, rint(0, 20));
  if (start > addDays(TODAY, -25)) start = addDays(TODAY, -25);
  let end = addDays(start, rint(240, 420));
  if (end < addDays(TODAY, 30)) end = addDays(TODAY, rint(30, 120));
  equipmentAssignments.push({
    id: `as-${pad(++asSeq)}`, code: `QĐ-ĐĐ-2026-${pad(asSeq + 40)}`, equipmentId: e.id, fromProjectId: null, toProjectId: e.currentProjectId,
    operatorId: e.operatorId, startDate: start, endDate: end, status: "dang_dieu_dong", kind: "phan_bo",
    requesterId: projects.find((p) => p.id === e.currentProjectId).commanderId, reason: "Phục vụ thi công theo kế hoạch tháng", createdAt: addDays(start, -3),
  });
});
equipmentAssignments.push(
  { id: `as-${pad(++asSeq)}`, code: `QĐ-ĐĐ-2026-${pad(asSeq + 40)}`, equipmentId: equipment[10].id, fromProjectId: null, toProjectId: "p02", operatorId: null, startDate: "2026-11-18", endDate: "2027-01-31", status: "cho_duyet", requesterId: "u20", reason: "Bổ sung máy xúc đào khuôn sân đỗ khu vực mở rộng phía Bắc do tiến độ đang chậm", createdAt: "2026-11-12" },
  { id: `as-${pad(++asSeq)}`, code: `QĐ-ĐĐ-2026-${pad(asSeq + 40)}`, equipmentId: equipment[29].id, fromProjectId: null, toProjectId: "p01", operatorId: null, startDate: "2026-11-20", endDate: "2027-02-28", status: "cho_duyet", requesterId: "u04", reason: "Tưới nước bảo dưỡng bê tông và giảm bụi công trường", createdAt: "2026-11-13" },
  { id: `as-${pad(++asSeq)}`, code: `QĐ-ĐĐ-2026-${pad(asSeq + 40)}`, equipmentId: equipment[16].id, fromProjectId: "p11", toProjectId: "p03", operatorId: equipment[16].operatorId, startDate: "2026-08-25", endDate: "2027-03-31", status: "dang_dieu_dong", requesterId: "u21", reason: "Điều chuyển sau khi hoàn thành công trình Điện Biên", createdAt: "2026-08-20" },
  { id: `as-${pad(++asSeq)}`, code: `QĐ-ĐĐ-2026-${pad(asSeq + 40)}`, equipmentId: equipment[5].id, fromProjectId: "p11", toProjectId: "p11", operatorId: null, startDate: "2026-02-01", endDate: "2026-08-30", status: "hoan_thanh", requesterId: "u29", reason: "Rải bê tông sân đỗ ô tô", createdAt: "2026-01-25" },
);

// ---------- giờ máy tổng hợp theo tháng (từ khi máy về công trình đến trước 3 tuần ca máy chi tiết) ----------
const equipmentUsage = [];
const WIN_START = addDays(TODAY, -21);
const workingDaysBetween = (a, b) => { let n = 0; for (let x = a; x <= b; x = addDays(x, 1)) if (d(x).getUTCDay() !== 0) n++; return n; };
equipmentAssignments.filter((a) => a.status === "dang_dieu_dong" || a.status === "hoan_thanh").forEach((a) => {
  const e = equipment.find((x) => x.id === a.equipmentId);
  const to = minDate(a.status === "hoan_thanh" ? a.endDate : addDays(WIN_START, -1), addDays(WIN_START, -1));
  if (a.startDate > to) return;
  const eff = 0.62 + rand() * 0.3; // mức khai thác máy
  let cur = a.startDate;
  while (cur <= to) {
    const [y, m] = cur.split("-").map(Number);
    const monthEnd = fmt(new Date(Date.UTC(y, m, 0)));
    const segEnd = minDate(monthEnd, to);
    const wd = workingDaysBetween(cur, segEnd);
    if (wd > 0) {
      const hours = Math.round(wd * 8 * Math.min(0.98, eff * (0.9 + rand() * 0.2)));
      equipmentUsage.push({ id: `eu-${pad(equipmentUsage.length + 1, 4)}`, equipmentId: e.id, projectId: a.toProjectId, month: cur.slice(0, 7), workingDays: wd, hours, fuelLiters: Math.round(hours * e.fuelNorm * (0.95 + rand() * 0.12)) });
    }
    cur = addDays(monthEnd, 1);
  }
});

// ---------- acceptance records ----------
const acceptanceRecords = [];
const paymentRecords = [];
let acSeq = 0;
let paySeq = 0;
function addAcceptance(projectId, itemId, title, phase, lines, status, createdAt, acceptedAt, createdById, docs) {
  const id = `ac-${pad(++acSeq)}`;
  const history = [H(createdAt, createdById, "Lập hồ sơ nghiệm thu")];
  if (status !== "nhap") history.push(H(addDays(createdAt, 1), createdById, "Trình TVGS kiểm tra"));
  if (["cho_cdt", "da_nghiem_thu"].includes(status)) history.push(H(addDays(createdAt, 3), createdById, "TVGS xác nhận, trình Chủ đầu tư"));
  if (status === "da_nghiem_thu") history.push(H(acceptedAt, createdById, "Chủ đầu tư ký biên bản nghiệm thu"));
  acceptanceRecords.push({
    id, code: `BBNT-${projects.find((p) => p.id === projectId).code}-${pad(acSeq, 3)}`, projectId, itemId, title, phase, type: "giai_doan",
    createdAt, acceptedAt: status === "da_nghiem_thu" ? acceptedAt : null, createdById, status, lines, documents: docs, history, note: "",
  });
  return id;
}
const docSet = ["Biên bản nghiệm thu khối lượng.pdf", "Bảng tính khối lượng chi tiết.xlsx", "Nhật ký thi công (trích).pdf", "Hình ảnh hiện trường.zip", "Kết quả thí nghiệm vật liệu.pdf"];
// p01
const lt = (id, accRatio = 1) => {
  const t = constructionPlans.find((x) => x.id === id);
  return { taskId: id, executedQty: t.actualQty, acceptedQty: roundQty(t.actualQty * accRatio, t.unit) };
};
const ac1 = addAcceptance("p01", "i-p01-A", "Nghiệm thu khu phụ trợ sản xuất và tập kết thiết bị", "Đợt 1", [lt("t-p01-003"), lt("t-p01-004")], "da_nghiem_thu", "2026-07-06", "2026-07-15", "u05", docSet.slice(0, 4));
const ac2 = addAcceptance("p01", "i-p01-B", "Nghiệm thu móng CPĐD và BTXM M150 lòng đường CHC zone R2", "Đợt 2", [lt("t-p01-008"), lt("t-p01-009")], "da_nghiem_thu", "2026-09-18", "2026-09-28", "u07", docSet);
addAcceptance("p01", "i-p01-B", "Nghiệm thu móng CPĐD, BTXM M150 lòng đường CHC zone R3, R4A", "Đợt 3", [lt("t-p01-018"), lt("t-p01-019"), lt("t-p01-028"), lt("t-p01-029", 0.97)], "cho_cdt", "2026-10-12", null, "u07", docSet.slice(0, 3));
addAcceptance("p01", "i-p01-B", "Nghiệm thu BTXM M350 mặt đường CHC zone R4A", "Đợt 4", [lt("t-p01-030", 0.9)], "nhap", "2026-11-13", null, "u08", docSet.slice(0, 2));
// các dự án khác
projectDefs.filter((p) => p.template).forEach((def) => {
  const items = constructionItems.filter((i) => i.projectId === def.id);
  let phase = 0;
  items.forEach((it) => {
    const ts = constructionPlans.filter((t) => t.itemId === it.id && t.actualQty > 0);
    if (!ts.length) return;
    const done = ts.filter((t) => t.status === "hoan_thanh");
    const partial = ts.filter((t) => t.status !== "hoan_thanh");
    if (done.length) {
      phase++;
      const last = done.map((t) => t.actualEnd).sort().pop();
      const created = addDays(last, rint(3, 10));
      const accepted = addDays(created, rint(6, 15));
      const status = accepted <= TODAY ? "da_nghiem_thu" : created <= TODAY ? "cho_cdt" : "nhap";
      addAcceptance(def.id, it.id, `Nghiệm thu ${it.name.toLowerCase()}`, `Đợt ${phase}`, done.map((t) => ({ taskId: t.id, executedQty: t.actualQty, acceptedQty: roundQty(t.actualQty * (rand() < 0.3 ? 0.97 : 1), t.unit) })), status, minDate(created, TODAY), minDate(accepted, TODAY), def.commanderId, docSet.slice(0, rint(2, 5)));
    }
    if (partial.length && rand() < 0.55) {
      phase++;
      addAcceptance(def.id, it.id, `Nghiệm thu khối lượng hoàn thành ${it.name.toLowerCase()} (giai đoạn)`, `Đợt ${phase}`, partial.map((t) => ({ taskId: t.id, executedQty: t.actualQty, acceptedQty: roundQty(t.actualQty * (0.6 + rand() * 0.3), t.unit) })), pick(["da_nghiem_thu", "cho_tvgs", "cho_cdt"]), addDays(TODAY, -rint(10, 40)), addDays(TODAY, -rint(1, 8)), def.commanderId, docSet.slice(0, 3));
    }
  });
});
// thanh toán với CĐT
const acValue = (ac) => ac.lines.reduce((s, l) => s + l.acceptedQty * constructionPlans.find((t) => t.id === l.taskId).unitPrice, 0);
acceptanceRecords.filter((a) => a.status === "da_nghiem_thu").forEach((a, i) => {
  const amount = Math.round(acValue(a));
  if (!amount) return;
  const created = addDays(a.acceptedAt, rint(2, 6));
  const age = diffDays(created, TODAY);
  const status = age > 45 ? "da_thanh_toan" : age > 25 ? (i % 3 === 0 ? "thanh_toan_mot_phan" : "da_duyet") : age > 8 ? "da_trinh" : "lap_ho_so";
  const retention = Math.round(amount * 0.05);
  const paid = status === "da_thanh_toan" ? amount - retention : status === "thanh_toan_mot_phan" ? Math.round((amount - retention) * 0.6) : 0;
  const pr = projects.find((p) => p.id === a.projectId);
  const history = [H(created, "u15", "Lập hồ sơ thanh toán")];
  if (status !== "lap_ho_so") history.push(H(addDays(created, 2), "u14", "Trình Chủ đầu tư"));
  if (["da_duyet", "da_thanh_toan", "thanh_toan_mot_phan"].includes(status)) history.push(H(addDays(created, 15), "u14", "Chủ đầu tư phê duyệt giá trị thanh toán"));
  if (paid) history.push(H(addDays(created, 30), "u14", status === "da_thanh_toan" ? "Đã nhận thanh toán" : "Nhận thanh toán một phần"));
  paymentRecords.push({
    id: `pay-${pad(++paySeq)}`, code: `HSTT-${pr.code}-${pad(paySeq, 3)}`, direction: "thu_cdt", projectId: a.projectId, acceptanceIds: [a.id], supplierId: null,
    title: `Thanh toán ${a.phase.toLowerCase()} – ${a.title.replace("Nghiệm thu ", "")}`, amount, retention, paidAmount: paid,
    createdAt: created > TODAY ? TODAY : created, dueDate: addDays(created, 45), paidAt: paid ? addDays(created, 30) : null, status, createdById: "u15", history,
  });
});
// thanh toán cho NCC
mr.filter((r) => ["da_nhap_kho", "hoan_thanh"].includes(r.status)).forEach((r) => {
  const amount = r.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const paid = r.status === "hoan_thanh";
  const created = r.history.find((h) => h.action === "Nhập kho").at.slice(0, 10);
  paymentRecords.push({
    id: `pay-${pad(++paySeq)}`, code: `TTNCC-2026-${pad(paySeq, 3)}`, direction: "tra_ncc", projectId: r.projectId, acceptanceIds: [], supplierId: r.supplierId,
    title: `Thanh toán tiền vật tư theo ${r.code} – ${r.title}`, amount: Math.round(amount), retention: 0, paidAmount: paid ? Math.round(amount) : 0,
    createdAt: created, dueDate: addDays(created, 30), paidAt: paid ? addDays(created, 12) : null, status: paid ? "da_thanh_toan" : "da_duyet", createdById: "u15",
    history: [H(created, "u15", "Lập đề nghị thanh toán NCC"), H(addDays(created, 2), "u14", "Kế toán trưởng phê duyệt"), ...(paid ? [H(addDays(created, 12), "u14", "Đã chuyển khoản")] : [])],
  });
});
// công nợ NCC
suppliers.forEach((s) => {
  s.debt = paymentRecords.filter((p) => p.supplierId === s.id).reduce((x, p) => x + p.amount - p.paidAmount, 0);
});

// ---------- issues ----------
const issues = [
  ["p01", "BTXM M150 lòng đường CHC zone R4B chậm do CĐT cấp bê tông không đủ ca", "vat_tu", "cao", "dang_xu_ly", "u04", "u09", "2026-10-26", "2026-11-18"],
  ["p01", "BTN C19 tồn kho dưới mức tối thiểu, chưa đủ cho thảm lề zone R2", "vat_tu", "cao", "moi", "u10", "u11", "2026-11-12", "2026-11-20"],
  ["p01", "Mưa lớn kéo dài làm chậm thi công lề vật liệu CHC zone R4A", "thoi_tiet", "trung_binh", "dang_xu_ly", "u05", "u06", "2026-11-05", "2026-11-16"],
  ["p02", "Tiến độ bê tông mặt đường sân đỗ chậm 18 điểm % so với kế hoạch", "ky_thuat", "cao", "dang_xu_ly", "u01", "u20", "2026-11-01", "2026-11-30"],
  ["p02", "Máy rải bê tông hỏng bơm thủy lực, cần thuê máy thay thế", "thiet_bi", "cao", "dang_xu_ly", "u20", "u12", "2026-11-06", "2026-11-15"],
  ["p02", "Bê tông M350 tồn kho thấp, nhà cung cấp giao chậm", "vat_tu", "trung_binh", "moi", "u20", "u20", "2026-11-10", "2026-11-17"],
  ["p04", "Vướng mặt bằng khu vực cống hộp phía Đông do chưa di dời đường điện", "phap_ly", "trung_binh", "dang_xu_ly", "u22", "u03", "2026-10-20", "2026-11-20"],
  ["p07", "Công nhân không đeo dây an toàn khi thi công trên cao", "an_toan", "cao", "da_xu_ly", "u25", "u25", "2026-10-28", "2026-10-29"],
  ["p09", "Thiết kế điều chỉnh vị trí cầu thang bộ trục 5–6, chờ phê duyệt", "ky_thuat", "trung_binh", "moi", "u27", "u03", "2026-11-09", "2026-11-25"],
  ["p09", "Máy ủi 110CV đang bảo trì, thiếu máy san gạt mặt bằng", "thiet_bi", "thap", "dang_xu_ly", "u27", "u12", "2026-11-05", "2026-11-19"],
  ["p03", "Điều chỉnh biện pháp thi công đêm để không ảnh hưởng khai thác bay", "ky_thuat", "thap", "da_xu_ly", "u21", "u21", "2026-09-12", "2026-09-20"],
  ["p05", "Chờ phê duyệt phương án đảm bảo an toàn khai thác khi thi công đường lăn", "phap_ly", "trung_binh", "dang_xu_ly", "u23", "u03", "2026-11-02", "2026-11-22"],
].map(([projectId, title, category, severity, status, reportedById, assigneeId, createdAt, dueDate], i) => ({
  id: `is-${pad(i + 1)}`, code: `VĐ-${pad(i + 1, 4)}`, projectId, title, category, severity, status, reportedById, assigneeId, createdAt, dueDate,
  description: title + ". Đề nghị các bộ phận liên quan phối hợp xử lý dứt điểm, báo cáo kết quả về Ban chỉ huy công trường.",
}));

// ---------- notifications ----------
const notifications = [
  ["approval", "warning", "Đề xuất vật tư chờ phê duyệt", "ĐXVT-2026-101 – BTN C19 rải thảm lề CHC zone R2 (1.800 tấn) đang chờ bạn phê duyệt.", "p01", "/materials/requests/mr-001", "2026-11-12T09:15:00", false],
  ["task", "danger", "Công việc quá hạn", "[39] Thi công BTXM M150/25 dày 30cm – lòng đường CHC zone R4B đã quá hạn kế hoạch (28/10/2026).", "p01", "/construction/plan/p01/task/t-p01-039", "2026-11-12T07:30:00", false],
  ["equipment", "warning", "Đề nghị điều động thiết bị", "CHT Vũ Đình Khôi đề nghị điều động máy xúc đào đến công trình Sân đỗ máy bay Đà Nẵng.", "p02", "/equipment/dispatch", "2026-11-12T14:05:00", false],
  ["material", "danger", "Cảnh báo tồn kho thấp", "Bê tông thương phẩm M350 tại kho Sân đỗ máy bay Đà Nẵng dưới mức tồn kho tối thiểu.", "p02", "/materials/inventory", "2026-11-11T16:40:00", false],
  ["acceptance", "info", "Hồ sơ nghiệm thu chờ CĐT ký", "BBNT đợt 3 – móng CPĐD, BTXM M150 lòng đường CHC zone R3, R4A đã được TVGS xác nhận.", "p01", "/acceptance", "2026-11-10T10:20:00", true],
  ["payment", "success", "Đã nhận thanh toán", "Chủ đầu tư đã thanh toán hồ sơ đợt 2 – lòng đường CHC zone R2.", "p01", "/payments", "2026-11-05T15:00:00", true],
  ["task", "warning", "Nhật ký thi công chờ xác nhận", "Tổ BTXM mặt đường số 1 đã gửi nhật ký ngày 13/11/2026, chờ CHT xác nhận.", "p01", "/construction/logs", "2026-11-13T17:30:00", false],
  ["system", "info", "Cập nhật dữ liệu", "Dữ liệu tiến độ các công trường đã được đồng bộ lúc 08:30.", null, "/", "2026-11-14T08:30:00", true],
].map(([type, severity, title, message, projectId, link, createdAt, read], i) => ({ id: `nt-${pad(i + 1)}`, type, severity, title, message, projectId, link, createdAt, read }));

// ---------- phương án tổ chức thi công ----------
const V = (version, at, byId, note) => ({ version, at, byId, note });
const C = (n, byId, at, content) => ({ id: `cm-${n}`, byId, at, content });
const constructionMethods = [
  { id: "pa-001", code: "PA-GB-001", projectId: "p01", itemId: null, title: "Phương án tổng thể tổ chức thi công khu bay", status: "da_duyet", version: 3, createdById: "u05", updatedAt: "2026-06-10",
    summary: "Chia khu bay thành 4 mũi thi công (CHC R2–R4B, đường lăn T2–T4B, sân đỗ A2); bố trí 2 trạm trộn BTXM 120 m³/h, 3 máy rải ván khuôn trượt; thi công cuốn chiếu lòng đường → lề vật liệu.",
    files: ["PA tong the khu bay v3.pdf", "So do mat bang to chuc thi cong.dwg", "Tien do tong the.mpp"],
    versions: [V(1, "2026-04-20", "u05", "Lập phương án ban đầu"), V(2, "2026-05-08", "u05", "Điều chỉnh theo góp ý TVGS: bổ sung trạm trộn số 2"), V(3, "2026-06-10", "u04", "Cập nhật tiến độ bàn giao mặt bằng zone R4B")],
    comments: [C(1, "u03", "2026-05-02", "Đề nghị bổ sung phương án cấp BTXM khi trạm trộn số 1 bảo dưỡng."), C(2, "u04", "2026-05-08", "Đã bổ sung trạm trộn dự phòng 90 m³/h."), C(3, "u01", "2026-06-12", "Thống nhất phương án v3.")] },
  { id: "pa-002", code: "PA-GB-002", projectId: "p01", itemId: "i-p01-B", title: "Biện pháp thi công móng cấp phối đá dăm loại 1", status: "da_duyet", version: 2, createdById: "u06", updatedAt: "2026-06-15",
    summary: "Rải CPĐD bằng máy rải, lu lèn 3 giai đoạn (lu tĩnh 8T – lu rung 25T – lu bánh lốp 16T), kiểm tra độ chặt K ≥ 0,98 mỗi 800 m².",
    files: ["BPTC mong CPDD v2.pdf"], versions: [V(1, "2026-06-01", "u06", "Lập biện pháp"), V(2, "2026-06-15", "u06", "Bổ sung quy trình thí nghiệm độ chặt hiện trường")],
    comments: [C(4, "u05", "2026-06-10", "Cần quy định chiều dày rải tối đa mỗi lớp 18cm."), C(5, "u06", "2026-06-15", "Đã cập nhật.")] },
  { id: "pa-003", code: "PA-GB-003", projectId: "p01", itemId: "i-p01-B", title: "Biện pháp thi công BTXM M350 mặt đường bằng máy rải ván khuôn trượt", status: "cho_gop_y", version: 2, createdById: "u08", updatedAt: "2026-11-10",
    summary: "Đổ BTXM M350/45 dày 40cm theo làn rộng 7,5m; cắt khe co sau 6–12 giờ; bảo dưỡng bằng nhũ tương và nilon 14 ngày; đặt thanh truyền lực Ø32 bằng DBI.",
    files: ["BPTC BTXM M350 v2.pdf", "Ban ve bo tri khe.dwg"], versions: [V(1, "2026-08-05", "u08", "Lập biện pháp"), V(2, "2026-11-10", "u08", "Điều chỉnh thời điểm cắt khe theo nhiệt độ mùa đông")],
    comments: [C(6, "u05", "2026-11-11", "Đề nghị bổ sung biện pháp che chắn khi mưa trong lúc đổ bê tông."), C(7, "u03", "2026-11-12", "Phòng KHKT đang rà soát định mức nhân công cắt khe.")] },
  { id: "pa-004", code: "PA-GB-004", projectId: "p01", itemId: "i-p01-B", title: "Biện pháp thảm bê tông nhựa lề vật liệu", status: "du_thao", version: 1, createdById: "u30", updatedAt: "2026-11-13",
    summary: "Tưới nhũ tương dính bám 0,5 kg/m², thảm BTN C19 dày 8cm và C16 dày 7cm bằng máy rải, lu bánh lốp + lu thép; nhiệt độ rải ≥ 120°C.",
    files: ["BPTC tham BTN (du thao).docx"], versions: [V(1, "2026-11-13", "u30", "Lập dự thảo")], comments: [] },
  { id: "pa-005", code: "PA-GB-005", projectId: "p01", itemId: null, title: "Kế hoạch an toàn, vệ sinh lao động và bảo vệ môi trường", status: "da_duyet", version: 1, createdById: "u05", updatedAt: "2026-05-05",
    summary: "Tổ chức hệ thống quản lý ATVSLĐ, huấn luyện an toàn đầu vào, kiểm tra an toàn hằng ngày, phương án phòng chống cháy nổ khu trạm trộn.",
    files: ["KH ATVSLD.pdf"], versions: [V(1, "2026-05-05", "u05", "Phê duyệt")], comments: [C(8, "u04", "2026-05-05", "Triển khai cho toàn bộ tổ đội.")] },
  { id: "pa-006", code: "PA-DAD-001", projectId: "p02", itemId: null, title: "Phương án thi công sân đỗ trong điều kiện khai thác bay", status: "da_duyet", version: 2, createdById: "u20", updatedAt: "2025-10-02",
    summary: "Phân khu thi công theo ca đêm, rào chắn an toàn khu bay, phối hợp cảng vụ.", files: ["PA thi cong san do.pdf"], versions: [V(1, "2025-09-10", "u20", "Lập phương án"), V(2, "2025-10-02", "u20", "Cập nhật theo góp ý Cảng vụ")], comments: [] },
];

constructionMethods.forEach((m) => { m.files = m.files.map((f) => ATT(f)); });
constructionMethods[0].files.unshift(ATT("Mat bang to chuc thi cong giai doan 1.webp", "assets/samples/mat-bang-tctc.webp", 296958));

// ---------- nhân sự thi công ----------
const siteStaff = [];
const famN = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đỗ", "Bùi", "Ngô", "Dương", "Đặng", "Phan"];
const midN = ["Văn", "Văn", "Đức", "Minh", "Quang", "Thị", "Hữu", "Xuân"];
const lastN = ["An", "Bình", "Cường", "Dũng", "Hải", "Hiếu", "Hùng", "Khánh", "Lâm", "Long", "Nam", "Phong", "Quân", "Sơn", "Thắng", "Tú", "Việt", "Vinh"];
const towns = ["Bắc Ninh", "Bắc Giang", "Hải Dương", "Hưng Yên", "Thái Bình", "Nam Định", "Thanh Hóa", "Nghệ An", "Hà Nội", "Phú Thọ"];
const addStaff = (projectId, o) => siteStaff.push({
  id: `ns-${pad(siteStaff.length + 1)}`, code: `NS${pad(siteStaff.length + 1, 4)}`, projectId, phone: `09${rint(10000000, 99999999)}`, idNo: `0${rint(10, 99)}0${rint(10000000, 99999999)}`,
  birthYear: rint(1972, 2002), hometown: pick(towns), joinDate: addDays("2026-04-28", rint(0, 90)), status: "dang_lam", certificates: "", safetyCard: true, healthCheck: addDays(TODAY, -rint(20, 300)), ...o,
});
[["u04", "chi_huy", "Chỉ huy trưởng công trường", "Ban chỉ huy công trường"], ["u05", "chi_huy", "Phó chỉ huy trưởng kỹ thuật", "Ban chỉ huy công trường"], ["u07", "chi_huy", "Mũi trưởng thi công khu bay", "Mũi thi công khu bay"],
 ["u06", "can_bo_ky_thuat", "Tổ trưởng tổ móng CPĐD", "Tổ móng CPĐD số 1"], ["u09", "can_bo_ky_thuat", "Tổ trưởng tổ BTXM M150", "Tổ BTXM M150 số 1"], ["u08", "can_bo_ky_thuat", "Tổ trưởng tổ BTXM mặt đường", "Tổ BTXM mặt đường số 1"],
 ["u30", "can_bo_ky_thuat", "Tổ trưởng tổ thảm BTN", "Tổ thảm BTN"], ["u10", "can_bo_ky_thuat", "Cán bộ vật tư", "Ban chỉ huy công trường"], ["u13", "can_bo_ky_thuat", "Cán bộ xe máy", "Ban chỉ huy công trường"]]
  .forEach(([uid, type, position, team]) => addStaff("p01", { name: users.find((u) => u.id === uid).name, type, position, team, certificates: type === "chi_huy" ? "Chứng chỉ hành nghề giám sát hạng I" : "Kỹ sư cầu đường" }));
const teamsGB = [["Tổ móng CPĐD số 1", 7], ["Tổ móng CPĐD số 2", 6], ["Tổ BTXM M150 số 1", 7], ["Tổ BTXM M150 số 2", 6], ["Tổ BTXM mặt đường số 1", 9], ["Tổ BTXM mặt đường số 2", 8], ["Tổ thảm BTN", 6], ["Tổ phụ trợ", 4]];
teamsGB.forEach(([team, n]) => {
  for (let i = 0; i < n; i++) {
    const lao = i >= n - 2;
    addStaff("p01", { name: `${pick(famN)} ${pick(midN)} ${pick(lastN)}`, type: lao ? "lao_dong_pho_thong" : "cong_nhan", position: lao ? "Lao động phổ thông" : pick(["Thợ bê tông bậc 3,5/7", "Thợ vận hành trạm trộn", "Thợ cắt khe", "Thợ lu", "Thợ bê tông bậc 4/7"]), team,
      certificates: lao ? "" : "Thẻ an toàn nhóm 3", safetyCard: rand() > 0.06, status: rand() < 0.05 ? "da_nghi" : "dang_lam" });
  }
});
siteStaff[20].healthCheck = addDays(TODAY, -400);
siteStaff.forEach((x, i) => {
  const full = x.projectId === "p01" && i < 14;
  x.idFront = full ? ATT("CCCD mat truoc.svg", "assets/samples/cccd-truoc.svg", 3200) : null;
  x.idBack = full ? ATT("CCCD mat sau.svg", "assets/samples/cccd-sau.svg", 3100) : null;
  x.certFiles = full && x.type !== "lao_dong_pho_thong" ? [ATT("Chung chi.svg", "assets/samples/chung-chi.svg", 3000)] : [];
  x.safetyCardFile = x.safetyCard ? ATT("The ATLD.svg", "assets/samples/the-atld.svg", 3000) : null;
  x.healthFile = full ? ATT("Giay kham suc khoe.svg", "assets/samples/giay-ksk.svg", 3000) : null;
});

// ---------- hồ sơ thi công ----------
const docFolders = [];
const documents = [];
const F = (projectId, name, parentId = null) => { const id = `fd-${pad(docFolders.length + 1)}`; docFolders.push({ id, projectId, parentId, name, order: docFolders.length + 1 }); return id; };
const D = (projectId, folderId, name, byId, at, versions = 1, sizeKb = rint(180, 9800)) => documents.push({
  id: `doc-${pad(documents.length + 1, 4)}`, projectId, folderId, name, fileType: name.split(".").pop(), sizeKb, version: versions, uploadedById: byId, uploadedAt: at,
  versions: Array.from({ length: versions }, (_, i) => V(i + 1, addDays(at, -(versions - 1 - i) * 12), byId, i === 0 ? "Tải lên" : "Cập nhật phiên bản")),
});
{
  const pj = F("p01", "1. Hồ sơ pháp lý");
  D("p01", pj, "Hop dong thi cong 1504-2026.pdf", "u04", "2026-04-16"); D("p01", pj, "Bien ban ban giao mat bang zone R2-R4B.pdf", "u05", "2026-06-18", 2);
  const bv = F("p01", "2. Bản vẽ thiết kế thi công");
  const bv1 = F("p01", "Đường cất hạ cánh", bv); const bv2 = F("p01", "Đường lăn", bv); const bv3 = F("p01", "Sân đỗ máy bay", bv);
  D("p01", bv1, "BVTC CHC - mat bang tong the.dwg", "u05", "2026-05-20", 3); D("p01", bv1, "BVTC CHC - ket cau mat duong.pdf", "u05", "2026-05-20", 2); D("p01", bv1, "BVTC CHC - bo tri khe.dwg", "u08", "2026-08-02");
  D("p01", bv2, "BVTC duong lan T2-T4B.pdf", "u05", "2026-08-25", 2); D("p01", bv3, "BVTC san do A2.pdf", "u05", "2026-08-10");
  const bp = F("p01", "3. Biện pháp thi công");
  D("p01", bp, "BPTC mong CPDD v2.pdf", "u06", "2026-06-15", 2); D("p01", bp, "BPTC BTXM M350 v2.pdf", "u08", "2026-11-10", 2);
  const nk = F("p01", "4. Nhật ký thi công");
  ["06", "07", "08", "09", "10"].forEach((m) => D("p01", nk, `Nhat ky thi cong thang ${m}-2026.pdf`, "u05", `2026-${m}-28`));
  const tn = F("p01", "5. Kết quả thí nghiệm"); const tn1 = F("p01", "Thí nghiệm CPĐD", tn); const tn2 = F("p01", "Thí nghiệm BTXM", tn);
  D("p01", tn1, "KQ do chat K98 zone R2.pdf", "u06", "2026-09-06"); D("p01", tn1, "KQ do chat K98 zone R3.pdf", "u06", "2026-09-10"); D("p01", tn2, "KQ nen mau BTXM M350 dot 1-6.xlsx", "u08", "2026-11-05", 4); D("p01", tn2, "KQ keo uon BTXM M350.pdf", "u08", "2026-11-12");
  const nt = F("p01", "6. Biên bản nghiệm thu");
  D("p01", nt, "BBNT dot 1 - khu phu tro.pdf", "u05", "2026-07-15"); D("p01", nt, "BBNT dot 2 - long duong CHC R2.pdf", "u07", "2026-09-28"); D("p01", nt, "BBNT dot 3 - long duong R3 R4A (cho CDT ky).pdf", "u07", "2026-10-15");
  F("p01", "7. Hồ sơ hoàn công");
  const at = F("p01", "8. Hồ sơ ATVSLĐ"); const at1 = F("p01", "Kế hoạch ATVSLĐ", at); const at2 = F("p01", "Huấn luyện an toàn", at); const at3 = F("p01", "Kiểm tra an toàn định kỳ", at);
  D("p01", at1, "KH ATVSLD 2026.pdf", "u05", "2026-05-05"); D("p01", at2, "Danh sach huan luyen an toan dau vao.xlsx", "u05", "2026-05-12", 3); D("p01", at3, "BB kiem tra an toan thang 10.pdf", "u04", "2026-10-30"); D("p01", at3, "Anh hien truong kiem tra 10-2026.jpg", "u04", "2026-10-30");
  const p2 = F("p02", "1. Hồ sơ pháp lý"); D("p02", p2, "Hop dong 1508-2025.pdf", "u20", "2025-08-16"); F("p02", "2. Bản vẽ thiết kế thi công");
}

// ---------- nhân viên CMKT ----------
const operators = users.filter((u) => u.isOperator).map((u, i) => ({
  id: u.id, code: u.code, name: u.name, phone: u.phone, rank: pick(["Thượng sĩ", "Trung sĩ", "QNCN 3/10", "Công nhân viên quốc phòng", "Hợp đồng lao động"]),
  contractType: pick(["HĐLĐ không xác định thời hạn", "HĐLĐ 36 tháng", "HĐLĐ 12 tháng"]),
  licenses: [
    { id: `lc-${i}-1`, kind: "gplx", no: `${rint(100000, 999999)}${rint(100000, 999999)}`, name: pick(["C", "FC", "E", "D"]), military: i % 3 === 0, issueDate: addDays(TODAY, -rint(800, 3000)), expiry: i === 4 ? addDays(TODAY, -6) : i === 9 ? addDays(TODAY, 35) : addDays(TODAY, rint(200, 1500)), file: i < 8 ? ATT("GPLX.svg", "assets/samples/gplx.svg", 3000) : null },
    ...(i % 4 === 1 ? [{ id: `lc-${i}-2`, kind: "gplx", no: `${rint(100000, 999999)}${rint(100000, 999999)}`, name: "FC", military: false, issueDate: addDays(TODAY, -rint(400, 1500)), expiry: addDays(TODAY, rint(300, 1500)), file: null }] : []),
    { id: `lc-${i}-3`, kind: "chung_chi", no: `CC-${rint(1000, 9999)}`, name: pick(["Vận hành máy rải bê tông", "Vận hành máy xúc", "Vận hành máy lu", "Vận hành trạm trộn", "Vận hành máy ủi", "Vận hành cần trục"]), military: false, issueDate: addDays(TODAY, -rint(300, 2500)), expiry: i === 12 ? addDays(TODAY, 20) : null, file: i < 6 ? ATT("Chung chi van hanh.svg", "assets/samples/chung-chi.svg", 3000) : null },
    ...(i % 3 === 2 ? [{ id: `lc-${i}-4`, kind: "chung_chi", no: `CC-${rint(1000, 9999)}`, name: pick(["Vận hành máy lu", "Vận hành máy xúc", "Vận hành máy rải bê tông"]), military: false, issueDate: addDays(TODAY, -rint(300, 2000)), expiry: null, file: null }] : []),
  ],
  workerGrade: `${rint(3, 6)}/7`, salaryCoef: Math.round((2.6 + rand() * 2.4) * 100) / 100, idNo: `0${rint(10, 99)}0${rint(10000000, 99999999)}`, hometown: pick(towns),
  healthCheck: addDays(TODAY, -rint(30, 420)), safetyCard: rand() > 0.1, insurance24h: rand() > 0.15, yearsExp: rint(2, 22),
  note: "",
}));

// chứng chỉ vận hành khớp với nhóm XMTB người đó đang vận hành
const GROUP_CC = { "Máy rải bê tông": "Vận hành máy rải bê tông", "Máy xúc": "Vận hành máy xúc", "Máy ủi": "Vận hành máy ủi", "Máy lu rung": "Vận hành máy lu", "Trạm trộn BTXM": "Vận hành trạm trộn", "Cần trục tháp": "Vận hành cần trục" };
operators.forEach((o) => {
  equipment.filter((e) => e.operatorId === o.id).forEach((e) => {
    const cc = GROUP_CC[e.group];
    if (cc && !o.licenses.some((l) => l.name === cc)) o.licenses.push({ id: `lc-${o.id}-${e.id}`, kind: "chung_chi", no: `CC-${rint(1000, 9999)}`, name: cc, military: false, issueDate: addDays(TODAY, -rint(300, 2000)), expiry: null, file: null });
    if (!cc && !o.licenses.some((l) => l.kind === "gplx" && /^(C|D|E|FC)/.test(l.name) && (!l.expiry || l.expiry >= TODAY))) o.licenses.push({ id: `lc-${o.id}-${e.id}`, kind: "gplx", no: `${rint(100000, 999999)}${rint(100000, 999999)}`, name: "C", military: false, issueDate: addDays(TODAY, -rint(500, 2000)), expiry: addDays(TODAY, rint(400, 1500)), file: null });
  });
});

// ---------- kế hoạch bảo dưỡng, sửa chữa, thanh xử lý, sự cố ----------
const eqAt = (pid) => equipment.filter((e) => e.currentProjectId === pid);
const gbEq = eqAt("p01");
const maintenancePlans = equipment.filter((e) => e.status !== "ngung").slice(0, 18).map((e, i) => ({
  id: `kh-${pad(i + 1)}`, code: `KHBD-2026-${pad(i + 31)}`, equipmentId: e.id, type: ["dinh_ky", "thuong_xuyen", "dinh_ky", "dac_biet", "ra_tron"][i % 5],
  plannedDate: addDays(TODAY, rint(-20, 40)), content: ["Bảo dưỡng cấp 1: thay dầu động cơ, lọc nhớt, lọc nhiên liệu", "Kiểm tra trước ca: dầu, nước, lốp, phanh", "Bảo dưỡng cấp 2: kiểm tra hệ thống thủy lực, gầm", "Bảo dưỡng đặc biệt mùa mưa – vệ sinh, chống gỉ", "Bảo dưỡng rà trơn sau đại tu động cơ"][i % 5],
  materials: pick(["Dầu động cơ 15W40: 24 lít; lọc nhớt: 1", "Dầu thủy lực 46: 60 lít; lọc thủy lực: 2", "Mỡ bôi trơn: 5 kg"]), status: i < 5 ? "cho_duyet" : i < 12 ? "da_duyet" : "hoan_thanh",
  createdById: "u13", approvedById: i < 5 ? null : "u12", cost: rint(4, 38) * 1000000,
}));
const repairs = [
  ["eq-002", "vua", "Sửa chữa bơm thủy lực máy rải bê tông", "u13", "2026-11-20", "2026-11-06", "dang_sua", 86000000, "", "Biên bản kiểm tra trước sửa chữa"],
  [equipment[17].id, "nho", "Thay xích, con lăn máy ủi 110CV", "u13", "2026-11-18", "2026-11-05", "dang_sua", 42000000, "", "Biên bản kiểm tra; báo giá"],
  [gbEq[1]?.id ?? "eq-010", "nho", "Thay lốp trước, căn chỉnh phanh", "u13", "2026-11-25", "2026-11-12", "moi", 18000000, "", ""],
  [gbEq[2]?.id ?? "eq-011", "lon", "Đại tu động cơ máy xúc sau 9.000 giờ", "u12", "2026-12-20", "2026-10-28", "moi", 420000000, "", "Biên bản kiểm tra; tờ trình"],
  ["eq-020", "vua", "Sửa hộp số máy lu rung", "u13", "2026-10-30", "2026-10-10", "hoan_thanh", 65000000, "Đã thay bộ bánh răng, chạy thử đạt", "BB nghiệm thu sửa chữa; hóa đơn; thanh lý HĐ"],
  ["eq-031", "nho", "Hàn vá thùng xe tự đổ", "u13", "2026-10-15", "2026-10-08", "hoan_thanh", 9500000, "Hoàn thành, đưa vào sử dụng", "BB nghiệm thu sửa chữa"],
].map(([equipmentId, level, content, assigneeId, deadline, createdAt, status, cost, result, documents], i) => ({ id: `sc-${pad(i + 1)}`, code: `ĐNSC-2026-${pad(i + 21)}`, equipmentId, level, content, assigneeId, deadline, createdAt, status, cost, result, documents }));
const disposals = [
  [equipment[5].id, "Máy rải bê tông đã khấu hao hết, chi phí sửa chữa lớn hơn 60% giá trị còn lại", "ban_dau_gia", 380000000, "2026-12-15", "cho_duyet"],
  ["eq-045", "Trạm trộn cũ, công suất không đáp ứng yêu cầu", "thanh_ly", 950000000, "2027-01-20", "lap_ke_hoach"],
  ["eq-039", "Hư hỏng nặng do sự cố cháy hệ thống điện", "huy", 45000000, "2026-10-20", "hoan_thanh"],
].map(([equipmentId, reason, method, residualValue, plannedDate, status], i) => ({ id: `tl-${pad(i + 1)}`, code: `KHTL-2026-${pad(i + 5)}`, equipmentId, reason, method, residualValue, plannedDate, status, createdById: "u12" }));
const incidents = [
  [gbEq[0]?.id ?? "eq-001", gbEq[0]?.operatorId ?? null, "p01", "2026-11-09", "hu_hong", "trung_binh", "Vỡ ống thủy lực khi đang rải BTXM zone R4B, dừng máy 6 giờ", "Thay ống thủy lực dự phòng, điều máy rải số 2 hỗ trợ", "da_duyet", "dang_xu_ly", "11/11: đã thay ống, chờ chạy thử"],
  ["eq-030", "op05", "p02", "2026-10-21", "va_cham", "nhe", "Xe tưới nước va quệt rào chắn khu bay khi lùi", "Sửa rào chắn, nhắc nhở lái xe, bổ sung người cảnh giới", "da_duyet", "da_xu_ly", "Đã khắc phục 22/10"],
  ["eq-033", "op09", "p03", "2026-11-13", "tai_nan", "nghiem_trong", "Ô tô tự đổ lật khi đổ vật liệu tại mép taluy, lái xe bị thương nhẹ", "", "chua_lap", "moi", ""],
].map(([equipmentId, operatorId, projectId, date, type, severity, description, plan, planStatus, status, progress], i) => ({ id: `sk-${pad(i + 1)}`, code: `SC-2026-${pad(i + 11)}`, equipmentId, operatorId, projectId, date, type, severity, description, plan, planStatus, status, progress }));

// ---------- tuyến đường ----------
const routes = [
  { name: "Mỏ đá Kiện Khê → Công trường Gia Bình", from: "Mỏ đá Kiện Khê, Hà Nam", to: "Kho bãi CPĐD – SB Gia Bình", projectId: "p01", lengthKm: 96, avgMinutes: 150, stops: "Trạm cân QL1A; Trạm dừng nghỉ Đồng Văn", conditions: "QL1A – QL38, cấm tải giờ cao điểm 6h–8h, 16h–19h", points: [[20.55, 105.86], [20.66, 105.92], [20.87, 105.98], [21.02, 106.08], [21.06, 106.2], [21.08, 106.28]] },
  { name: "Trạm trộn BTXM → Mặt bằng CHC zone R2", from: "Trạm trộn BTXM số 1", to: "Zone R2", projectId: "p01", lengthKm: 3.2, avgMinutes: 12, stops: "", conditions: "Đường công vụ nội bộ, tốc độ tối đa 20 km/h", points: [[21.08, 106.28], [21.082, 106.285], [21.085, 106.29], [21.087, 106.296]] },
  { name: "Trạm BTN Quế Võ → Công trường Gia Bình", from: "Trạm BTN Kinh Bắc – KCN Quế Võ", to: "Lề vật liệu CHC", projectId: "p01", lengthKm: 28, avgMinutes: 45, stops: "", conditions: "Xe phủ bạt giữ nhiệt, nhiệt độ BTN đến công trường ≥ 120°C", points: [[21.14, 106.17], [21.12, 106.21], [21.1, 106.25], [21.08, 106.28]] },
  { name: "Kho TCT Hà Nội → Sân bay Gia Bình (điều động máy)", from: "Kho thiết bị TCT – Gia Lâm", to: "SB Gia Bình", projectId: null, lengthKm: 42, avgMinutes: 90, stops: "Trạm thu phí QL5", conditions: "Vận chuyển máy siêu trường siêu trọng ban đêm, có xe dẫn đường", points: [[21.03, 105.9], [21.02, 106.0], [21.05, 106.12], [21.08, 106.28]] },
].map((r, i) => ({ id: `td-${pad(i + 1)}`, code: `TD-${pad(i + 1, 3)}`, ...r }));

// ---------- kiểm kê ----------
const stockOf = (pid, mid) => stockTransactions.filter((t) => t.projectId === pid && t.materialId === mid).reduce((s, t) => s + (t.type === "nhap" ? t.qty : -t.qty), 0);
const stocktakes = [
  { id: "kk-001", code: "KK-GB-2026-10", projectId: "p01", date: "2026-10-31", byId: "u10", status: "da_xu_ly", note: "Kiểm kê định kỳ tháng 10", lines: ["m23", "m25", "m31"].map((mid) => ({ materialId: mid, bookQty: 0, actualQty: 0 })) },
  { id: "kk-002", code: "KK-GB-2026-11", projectId: "p01", date: "2026-11-14", byId: "u10", status: "nhap", note: "Kiểm kê giữa tháng 11 trước đợt thảm BTN", lines: [] },
];
// phân loại phiếu nhập / xuất
stockTransactions.forEach((t, i) => {
  t.subType = t.type === "nhap" ? (i % 17 === 3 ? "dieu_chuyen" : i % 29 === 7 ? "tra_lai" : "ncc") : i % 23 === 5 ? "dieu_chuyen" : "thi_cong";
  t.docQty = t.qty;
  t.confirmed = true;
});
// 2 phiếu nhập mới về kho SB Gia Bình đang chờ xác nhận (lệch chứng từ 1 dòng)
[["VL027", 420, 432], ["VL023", 600, 600]].forEach(([code, qty, docQty], k) => {
  stockTransactions.push({ id: `tx-${pad(++txSeq, 4)}`, code: `PNK-${pad(txSeq, 4)}`, voucherCode: `PNK-${pad(txSeq, 4)}`, type: "nhap", subType: "ncc", projectId: "p01", materialId: mat(code).id, qty, docQty, confirmed: false, date: addDays(TODAY, -k), requestId: null, taskId: null, supplierId: k === 0 ? "s09" : "s06", byId: "u10", note: k === 0 ? "Giao BTN C19 theo ĐH-KB-2026-0412 (đợt 1)" : "Giao matit chèn khe – chờ kiểm tra chất lượng" });
});
{
  const lines = inventory.filter((i) => i.projectId === "p01").map((i) => ({ materialId: i.materialId, bookQty: roundQty(stockOf("p01", i.materialId), "m³") }));
  stocktakes[1].lines = lines.map((l, k) => ({ ...l, actualQty: k === 2 ? roundQty(l.bookQty * 0.97, "m³") : k === 5 ? roundQty(l.bookQty - 1, "m³") : l.bookQty }));
  stocktakes[0].lines = lines.slice(0, 4).map((l) => ({ ...l, actualQty: l.bookQty }));
}

// ---------- lịch sử đăng nhập ----------
const loginHistory = [];
users.filter((u) => u.isDemoAccount || ["u05", "u11", "u13", "u20"].includes(u.id)).forEach((u, i) => {
  for (let k = 0; k < 6; k++) loginHistory.push({ id: `lh-${pad(loginHistory.length + 1, 4)}`, userId: u.id, at: `${addDays(TODAY, -rint(0, 20))}T${pad(rint(6, 21), 2)}:${pad(rint(0, 59), 2)}:00`, ip: `10.20.${rint(1, 30)}.${rint(2, 250)}`, device: pick(["Chrome / Windows", "Safari / iPhone", "Chrome / Android", "Edge / Windows"]), result: (i + k) % 11 === 4 ? "that_bai" : "thanh_cong" });
});
loginHistory.sort((a, b) => b.at.localeCompare(a.at));

// chất lượng / nghiệm thu nội bộ công việc đã hoàn thành của SB Gia Bình
constructionPlans.filter((t) => t.projectId === "p01" && !t.isGroup && t.status === "hoan_thanh").forEach((t) => { t.quality = { result: "dat", byId: "u05", at: addDays(t.actualEnd, 1), note: "Đạt yêu cầu kỹ thuật, đủ hồ sơ thí nghiệm" }; });

// ---------- write ----------
const files = {
  "projects.json": projects,
  "users.json": users,
  "departments.json": departments,
  "construction-items.json": constructionItems,
  "construction-plans.json": constructionPlans,
  "construction-logs.json": constructionLogs,
  "materials.json": materials,
  "suppliers.json": suppliers,
  "material-requests.json": mr,
  "inventory.json": inventory,
  "stock-transactions.json": stockTransactions,
  "equipment.json": equipment,
  "equipment-assignments.json": equipmentAssignments,
  "equipment-shifts.json": equipmentShifts,
  "equipment-usage.json": equipmentUsage,
  "acceptance-records.json": acceptanceRecords,
  "payment-records.json": paymentRecords,
  "notifications.json": notifications,
  "issues.json": issues,
  "construction-methods.json": constructionMethods,
  "site-staff.json": siteStaff,
  "doc-folders.json": docFolders,
  "documents.json": documents,
  "operators.json": operators,
  "maintenance-plans.json": maintenancePlans,
  "repairs.json": repairs,
  "disposals.json": disposals,
  "incidents.json": incidents,
  "routes.json": routes,
  "stocktakes.json": stocktakes,
  "contracts.json": contracts,
  "login-history.json": loginHistory,
};
for (const dir of OUT_DIRS) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + "\n");
}
console.log(Object.entries(files).map(([k, v]) => `${k}: ${v.length}`).join("\n"));
projects.forEach((p) => console.log(p.id, p.shortName, (p.contractValue / 1e9).toFixed(1), "tỷ", "actual", (projectProgress(p.id) * 100).toFixed(1) + "%", "planned",
  (() => { const ts = constructionPlans.filter((t) => t.projectId === p.id && !t.isGroup); const tot = ts.reduce((s, t) => s + t.contractQty * t.unitPrice, 0); return tot ? (ts.reduce((s, t) => s + plannedPct(t) * t.contractQty * t.unitPrice, 0) / tot * 100).toFixed(1) + "%" : "-"; })()));
