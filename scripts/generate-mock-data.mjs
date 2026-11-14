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
  { id: "d-hdtv", code: "HĐTV", name: "Chủ tịch Tổng công ty", type: "ban_lanh_dao", parentId: null, head: "Nguyễn Đức Toàn" },
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
  { id: "u01", code: "NV001", name: "Nguyễn Văn Hùng", role: "lanh_dao", title: "Phó Tổng Giám đốc", departmentId: "d-btgd", isDemoAccount: true },
  { id: "u02", code: "NV002", name: "Nguyễn Đức Toàn", role: "lanh_dao", title: "Tổng Giám đốc", departmentId: "d-btgd" },
  { id: "u03", code: "NV003", name: "Lê Thanh Thiện", role: "phong_ktkt", title: "Trưởng phòng Kế hoạch - Kỹ thuật", departmentId: "d-khkt", isDemoAccount: true },
  { id: "u04", code: "NV004", name: "Trần Quốc Hải", role: "chi_huy_truong", title: "Chỉ huy trưởng công trường", departmentId: "d-acc244", isDemoAccount: true },
  { id: "u05", code: "NV005", name: "Lê Thị Mai", role: "chi_huy_truong", title: "Phó chỉ huy trưởng kỹ thuật", departmentId: "d-acc244" },
  { id: "u06", code: "NV006", name: "Phạm Văn Long", role: "to_truong", title: "Tổ trưởng tổ đất số 1", departmentId: "d-acc244", team: "Tổ đất số 1" },
  { id: "u07", code: "NV007", name: "Nguyễn Minh Anh", role: "to_truong", title: "Mũi trưởng phần móng", departmentId: "d-acc244", team: "Mũi thi công móng" },
  { id: "u08", code: "NV008", name: "Hoàng Quang Huy", role: "to_truong", title: "Tổ trưởng tổ bê tông số 2", departmentId: "d-acc244", team: "Tổ bê tông số 2", isDemoAccount: true },
  { id: "u09", code: "NV009", name: "Đỗ Thanh Tùng", role: "to_truong", title: "Tổ trưởng tổ nề số 1", departmentId: "d-acc244", team: "Tổ nề số 1" },
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
    id: "p01", code: "ACC244-LHP", shortName: "Trường Lê Hồng Phong", name: "Dự án Xây dựng Trường Đào tạo cán bộ Lê Hồng Phong TP Hà Nội",
    category: "dan_dung", location: "Hà Nội", unitId: "d-acc244", commanderId: "u04",
    investor: "Ban Quản lý dự án đầu tư xây dựng công trình dân dụng và công nghiệp thành phố Hà Nội",
    contractor: "Tổng công ty ACC – Công ty ĐTXL ACC – Công ty CP ACC 244",
    packageName: "Gói thầu số 06: Thi công xây dựng công trình và lắp đặt thiết bị", contractNo: "0610/2025/HĐXD-XLTB", contractDate: "2025-10-06",
    startDate: "2026-06-01", endDate: "2027-12-31", budget: 540e9, status: "dang_thi_cong", costRatio: 0.91,
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

// --- p01 handcrafted plan (tham chiếu trang 16-17 tài liệu) ---
function addLhp() {
  const pid = "p01";
  const items = [
    { id: "i-p01-1", code: "1.1.1", name: "Công tác chuẩn bị và san lấp mặt bằng", managerId: "u05" },
    { id: "i-p01-2", code: "1.1.2", name: "Phần móng", managerId: "u07" },
    { id: "i-p01-3", code: "1.1.3", name: "Phần thân – Nhà hành chính A", managerId: "u05" },
    { id: "i-p01-4", code: "1.1.4", name: "Hoàn thiện và hạ tầng kỹ thuật", managerId: "u04" },
  ];
  items.forEach((it, i) => constructionItems.push({ ...it, projectId: pid, order: i + 1 }));
  const t = (o) => ({
    projectId: pid, parentId: null, isGroup: false, actualStart: null, actualEnd: null, note: "", ...o,
  });
  const rows = [
    t({ id: "t-p01-001", itemId: "i-p01-1", code: "1.1.1.1", name: "Giải phóng mặt bằng", assigneeId: "u05", team: "Tổ đất số 1", unit: "m²", contractQty: 52000, unitPrice: 98000, actualQty: 52000, plannedStart: "2026-06-01", plannedEnd: "2026-06-15", actualStart: "2026-06-01", actualEnd: "2026-06-16" }),
    t({ id: "t-p01-002", itemId: "i-p01-1", code: "1.1.1.2", name: "Xây dựng lán trại, hàng rào tạm", assigneeId: "u06", team: "Tổ nề số 1", unit: "gói", contractQty: 1, unitPrice: 1240000000, actualQty: 1, plannedStart: "2026-06-16", plannedEnd: "2026-06-25", actualStart: "2026-06-17", actualEnd: "2026-06-27" }),
    t({ id: "t-p01-003", itemId: "i-p01-1", code: "1.1.1.3", name: "San lấp mặt bằng", assigneeId: "u06", team: "Tổ đất số 1", unit: "m³", contractQty: 20000, unitPrice: 120000, actualQty: 20000, plannedStart: "2026-06-26", plannedEnd: "2026-07-15", actualStart: "2026-06-28", actualEnd: "2026-07-18" }),
    t({ id: "t-p01-004", itemId: "i-p01-2", code: "1.1.2.1", name: "Ép cọc", assigneeId: "u07", team: "Tổ cọc", unit: "m", contractQty: 96500, unitPrice: 1420000, actualQty: 96500, plannedStart: "2026-07-16", plannedEnd: "2026-08-14", actualStart: "2026-07-20", actualEnd: "2026-08-21" }),
    t({ id: "t-p01-005", itemId: "i-p01-2", code: "1.1.2.2", name: "Đài móng, giằng móng và tường móng", assigneeId: "u07", team: "Mũi thi công móng", unit: "", contractQty: 0, unitPrice: 0, actualQty: 0, plannedStart: "2026-08-17", plannedEnd: "2026-10-28", actualStart: "2026-08-24", isGroup: true }),
    t({ id: "t-p01-006", itemId: "i-p01-2", parentId: "t-p01-005", code: "1.1.2.2.1", name: "Đào đất hố móng", assigneeId: "u06", team: "Tổ đất số 1", unit: "m³", contractQty: 58000, unitPrice: 118000, actualQty: 58000, plannedStart: "2026-08-17", plannedEnd: "2026-08-28", actualStart: "2026-08-24", actualEnd: "2026-09-05" }),
    t({ id: "t-p01-007", itemId: "i-p01-2", parentId: "t-p01-005", code: "1.1.2.2.2", name: "Đổ bê tông lót móng", assigneeId: "u06", team: "Tổ bê tông số 1", unit: "m³", contractQty: 1200, unitPrice: 1890000, actualQty: 1200, plannedStart: "2026-08-29", plannedEnd: "2026-09-03", actualStart: "2026-09-06", actualEnd: "2026-09-10" }),
    t({ id: "t-p01-008", itemId: "i-p01-2", parentId: "t-p01-005", code: "1.1.2.2.3", name: "Gia công, lắp dựng cốt thép đài móng", assigneeId: "u08", team: "Tổ cốt thép", unit: "tấn", contractQty: 1100, unitPrice: 26800000, actualQty: 1100, plannedStart: "2026-09-04", plannedEnd: "2026-09-23", actualStart: "2026-09-11", actualEnd: "2026-10-07" }),
    t({ id: "t-p01-009", itemId: "i-p01-2", parentId: "t-p01-005", code: "1.1.2.2.4", name: "Đổ bê tông đài móng, giằng móng", assigneeId: "u08", team: "Tổ bê tông số 2", unit: "m³", contractQty: 420, unitPrice: 2350000, actualQty: 336, plannedStart: "2026-09-24", plannedEnd: "2026-10-08", actualStart: "2026-10-08", note: "Đã đổ xong bê tông giằng móng trục A–C, đang tưới nước bảo dưỡng." }),
    t({ id: "t-p01-010", itemId: "i-p01-2", parentId: "t-p01-005", code: "1.1.2.2.5", name: "Xây tường móng, lấp đất hố móng", assigneeId: "u09", team: "Tổ nề số 1", unit: "m³", contractQty: 2600, unitPrice: 480000, actualQty: 1560, plannedStart: "2026-10-09", plannedEnd: "2026-10-28", actualStart: "2026-10-22" }),
    t({ id: "t-p01-011", itemId: "i-p01-2", code: "1.1.2.3", name: "Nghiệm thu phần móng", assigneeId: "u04", team: "Ban chỉ huy công trường", unit: "lần", contractQty: 1, unitPrice: 0, actualQty: 0, plannedStart: "2026-10-29", plannedEnd: "2026-11-02" }),
    t({ id: "t-p01-012", itemId: "i-p01-3", code: "1.1.3.1", name: "Thi công cột, dầm, sàn tầng 1", assigneeId: "u08", team: "Tổ bê tông số 2", unit: "m³", contractQty: 3200, unitPrice: 3150000, actualQty: 704, plannedStart: "2026-11-03", plannedEnd: "2026-12-12", actualStart: "2026-11-05" }),
    t({ id: "t-p01-013", itemId: "i-p01-3", code: "1.1.3.2", name: "Thi công cột, dầm, sàn tầng 2", assigneeId: "u08", team: "Tổ bê tông số 2", unit: "m³", contractQty: 3200, unitPrice: 3150000, actualQty: 0, plannedStart: "2026-12-13", plannedEnd: "2027-01-21" }),
    t({ id: "t-p01-014", itemId: "i-p01-3", code: "1.1.3.3", name: "Thi công cột, dầm, sàn tầng 3", assigneeId: "u08", team: "Tổ bê tông số 2", unit: "m³", contractQty: 3200, unitPrice: 3150000, actualQty: 0, plannedStart: "2027-01-22", plannedEnd: "2027-03-02" }),
    t({ id: "t-p01-015", itemId: "i-p01-4", code: "1.1.4.1", name: "Xây trát, ốp lát hoàn thiện", assigneeId: "u09", team: "Tổ nề số 1", unit: "m² sàn", contractQty: 100000, unitPrice: 1650000, actualQty: 0, plannedStart: "2027-03-03", plannedEnd: "2027-10-31" }),
    t({ id: "t-p01-016", itemId: "i-p01-4", code: "1.1.4.2", name: "Hệ thống điện, nước, điều hòa thông gió", assigneeId: "u05", team: "Tổ điện nước", unit: "m² sàn", contractQty: 100000, unitPrice: 1280000, actualQty: 0, plannedStart: "2027-04-01", plannedEnd: "2027-11-30" }),
    t({ id: "t-p01-017", itemId: "i-p01-4", code: "1.1.4.3", name: "Hệ thống PCCC, thông tin liên lạc", assigneeId: "u05", team: "Tổ điện nước", unit: "m² sàn", contractQty: 100000, unitPrice: 452000, actualQty: 0, plannedStart: "2027-06-01", plannedEnd: "2027-12-15" }),
    t({ id: "t-p01-018", itemId: "i-p01-4", code: "1.1.4.4", name: "Hạ tầng kỹ thuật ngoài nhà, sân đường", assigneeId: "u06", team: "Tổ đất số 1", unit: "m² sàn", contractQty: 100000, unitPrice: 550000, actualQty: 0, plannedStart: "2027-08-01", plannedEnd: "2027-12-31" }),
  ];
  rows.forEach((r, i) => {
    r.order = i + 1;
    r.status = r.isGroup ? "dang_thuc_hien" : r.actualQty >= r.contractQty && r.contractQty > 0 ? "hoan_thanh" : r.actualQty > 0 || r.actualStart ? "dang_thuc_hien" : "chua_thuc_hien";
    constructionPlans.push(r);
  });
}
addLhp();

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
        task.actualEnd = minDate(addDays(plannedEnd, def.ratio < 0.97 ? rint(3, 20) : rint(-3, 4)), addDays(TODAY, -1));
        if (task.actualEnd < task.actualStart) task.actualEnd = addDays(task.actualStart, 1);
      }
      constructionPlans.push(task);
    });
  });
}

projectDefs.forEach((def) => {
  genPlan(def);
  const memberPool = [def.commanderId, ...constructionPlans.filter((t) => t.projectId === def.id).map((t) => t.assigneeId)];
  if (def.id === "p01") memberPool.push("u05", "u06", "u07", "u08", "u09", "u10", "u11", "u13", "u15");
  const tasks = constructionPlans.filter((t) => t.projectId === def.id && !t.isGroup);
  const contractValue = def.id === "p01" || tasks.length ? tasks.reduce((s, t) => s + t.contractQty * t.unitPrice, 0) : def.value;
  projects.push({
    id: def.id, code: def.code, name: def.name, shortName: def.shortName, category: def.category, location: def.location,
    investor: def.investor, contractor: def.contractor, unitId: def.unitId, commanderId: def.commanderId,
    packageName: def.packageName, contractNo: def.contractNo, contractDate: def.contractDate,
    startDate: def.startDate, endDate: def.endDate, contractValue, budget: def.budget, costRatio: def.costRatio,
    status: def.status, settlementStatus: def.settlement || "chua_quyet_toan",
    memberIds: [...new Set(memberPool)], description: descriptions[def.category], approvalStatus: def.approval || "da_duyet",
  });
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
  const n = INT_UNITS.has(t.unit) ? Math.min(t.actualQty, 2) : Math.min(8, Math.max(1, Math.ceil(span / 6)));
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
// Nhật ký mẫu chi tiết cho đầu việc 1.1.2.2.4 (theo màn hình tham chiếu trang 17)
constructionLogs
  .filter((l) => l.taskId === "t-p01-009")
  .forEach((l, i, arr) => {
    if (i === arr.length - 1) {
      l.content = "Đã đổ xong bê tông giằng móng trục A–C, đang tưới nước bảo dưỡng. Đã lấy 3 tổ mẫu M300 gửi thí nghiệm.";
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
].map(([code, name, taxCode, address, contact, materialGroups, rating], i) => ({
  id: `s${pad(i + 1, 2)}`, code, name, taxCode, address, contact, phone: `024${pad(3800000 + i * 12345, 7)}`, materialGroups, rating, debt: 0,
}));
const supplierFor = (m) => suppliers.find((s) => s.materialGroups.includes(m.group)) || suppliers[2];

// ---------- inventory & stock transactions ----------
const inventory = [];
const stockTransactions = [];
let txSeq = 0;
const projectMaterials = {
  p01: [["VL001", 1800], ["VL002", 620], ["VL003", 480], ["VL005", 3200], ["VL007", 4800], ["VL010", 21000], ["VL012", 1500], ["VL013", 1200000], ["VL014", 9000], ["VL015", 18000], ["VL016", 2400], ["VL017", 96500]],
  airport: [["VL001", 2400], ["VL004", 380], ["VL005", 2600], ["VL007", 4200], ["VL011", 52000], ["VL018", 64000], ["VL019", 120], ["VL020", 18000], ["VL021", 6200], ["VL023", 14000], ["VL025", 160000]],
  building: [["VL001", 900], ["VL002", 260], ["VL003", 210], ["VL005", 1600], ["VL007", 2400], ["VL010", 9000], ["VL013", 600000], ["VL014", 4200], ["VL015", 8000], ["VL017", 24000]],
};
function projectProgress(pid) {
  const ts = constructionPlans.filter((t) => t.projectId === pid && !t.isGroup);
  const total = ts.reduce((s, t) => s + t.contractQty * t.unitPrice, 0);
  return total ? ts.reduce((s, t) => s + t.actualQty * t.unitPrice, 0) / total : 0;
}
const tx = (o) => stockTransactions.push({ id: `tx-${pad(++txSeq, 4)}`, code: `${o.type === "nhap" ? "PNK" : "PXK"}-${pad(txSeq, 4)}`, requestId: null, taskId: null, supplierId: null, note: "", ...o });
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
    const special = (def.id === "p01" && code === "VL015") || (def.id === "p02" && code === "VL023") || (def.id === "p07" && code === "VL013") || (def.id === "p09" && code === "VL010");
    if (special) consumeFactor = 0.93 / Math.max(prog, 0.05);
    const issued = roundQty(Math.min(normQty * 1.02, normQty * prog * consumeFactor), m.unit);
    let onHand = roundQty(normQty * (0.03 + rand() * 0.06), m.unit);
    const minStock = roundQty(normQty * 0.04, m.unit);
    const shortage = (def.id === "p01" && (code === "VL002" || code === "VL010")) || (def.id === "p02" && code === "VL011") || (def.id === "p04" && code === "VL004") || (def.id === "p09" && code === "VL010");
    if (shortage) onHand = roundQty(minStock * 0.35, m.unit);
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
MR({ title: "Thép Ø16 cột tầng trệt", projectId: "p01", itemId: "i-p01-3", taskId: "t-p01-012", requesterId: "u10", createdAt: "2026-11-12", neededDate: "2026-11-18", status: "cho_duyet", starred: true, lines: [["VL002", 12.5]], note: "Phục vụ thi công cột trục A–D tầng 1", history: [H("2026-11-12", "u10", "Tạo đề xuất"), H("2026-11-12", "u10", "Gửi phê duyệt")] });
MR({ title: "Bê tông thương phẩm M300 cột tầng trệt", projectId: "p01", itemId: "i-p01-3", taskId: "t-p01-012", requesterId: "u10", createdAt: "2026-11-11", neededDate: "2026-11-17", status: "cho_duyet", lines: [["VL010", 38]], history: [H("2026-11-11", "u10", "Tạo đề xuất"), H("2026-11-11", "u10", "Gửi phê duyệt")] });
MR({ title: "Cát vàng, đá 1x2 lấp hố móng", projectId: "p01", itemId: "i-p01-2", taskId: "t-p01-010", requesterId: "u11", createdAt: "2026-11-02", neededDate: "2026-11-08", status: "cho_duyet", starred: true, lines: [["VL005", 45], ["VL007", 60]], history: [H("2026-11-02", "u11", "Tạo đề xuất"), H("2026-11-02", "u11", "Gửi phê duyệt")] });
MR({ title: "Ống PVC thoát nước ngầm", projectId: "p01", itemId: "i-p01-4", taskId: null, requesterId: "u10", createdAt: "2026-10-28", neededDate: "2026-11-05", status: "cho_duyet", lines: [["VL016", 120]], history: [H("2026-10-28", "u10", "Tạo đề xuất"), H("2026-10-28", "u10", "Gửi phê duyệt")] });
MR({ title: "Điều chuyển cốp pha sang tầng 2", type: "dieu_chuyen", projectId: "p01", itemId: "i-p01-3", taskId: "t-p01-013", requesterId: "u13", createdAt: "2026-11-08", neededDate: "2026-12-10", status: "tra_lai", lines: [["VL014", 300]], history: [H("2026-11-08", "u13", "Tạo đề xuất"), H("2026-11-08", "u13", "Gửi phê duyệt"), H("2026-11-09", "u04", "Trả lại", "Bổ sung kế hoạch luân chuyển ván khuôn và biên bản kiểm tra chất lượng cốp pha")] });
MR({ title: "Gạch không nung xây tường bao", projectId: "p01", itemId: "i-p01-4", taskId: "t-p01-015", requesterId: "u10", createdAt: "2026-11-13", neededDate: "2027-02-20", status: "nhap", lines: [["VL013", 45000]], history: [H("2026-11-13", "u10", "Tạo đề xuất (lưu nháp)")] });
MR({ title: "Ván khuôn phủ phim sàn tầng trệt", projectId: "p01", itemId: "i-p01-3", taskId: "t-p01-012", requesterId: "u10", createdAt: "2026-11-04", neededDate: "2026-11-15", status: "da_duyet", lines: [["VL014", 850]], history: [H("2026-11-04", "u10", "Tạo đề xuất"), H("2026-11-04", "u10", "Gửi phê duyệt"), H("2026-11-05", "u04", "Phê duyệt", "Đồng ý, ưu tiên NCC có sẵn hàng")] });
MR({ title: "Tạm ứng mua thép móng đợt 2", type: "tam_ung", projectId: "p01", itemId: "i-p01-2", taskId: "t-p01-008", requesterId: "u11", createdAt: "2026-10-20", neededDate: "2026-11-16", status: "dat_hang", starred: true, supplierId: "s02", orderNo: "ĐH-VH-2026-0412", orderDate: "2026-10-24", expectedDelivery: "2026-11-16", lines: [["VL002", 20], ["VL003", 8]], history: [H("2026-10-20", "u11", "Tạo đề xuất"), H("2026-10-20", "u11", "Gửi phê duyệt"), H("2026-10-21", "u04", "Phê duyệt"), H("2026-10-23", "u11", "Tổng hợp nhu cầu, kiểm tra tồn kho", "Tồn kho không đủ đáp ứng"), H("2026-10-24", "u11", "Chọn nhà cung cấp & đặt hàng", "Công ty CP Thép Việt Hưng – ĐH-VH-2026-0412")] });
MR({ title: "Dây thép buộc, con kê bê tông", projectId: "p01", itemId: "i-p01-3", taskId: "t-p01-012", requesterId: "u10", createdAt: "2026-10-25", neededDate: "2026-11-03", status: "da_nhap_kho", supplierId: "s02", orderNo: "ĐH-VH-2026-0398", orderDate: "2026-10-27", expectedDelivery: "2026-11-02", lines: [["VL015", 600]], history: [H("2026-10-25", "u10", "Tạo đề xuất"), H("2026-10-25", "u10", "Gửi phê duyệt"), H("2026-10-26", "u04", "Phê duyệt"), H("2026-10-27", "u11", "Chọn nhà cung cấp & đặt hàng"), H("2026-11-02", "u10", "Nhập kho", "PNK theo đề xuất")] });
MR({ title: "Xi măng PCB40 xây hộc móng", projectId: "p01", itemId: "i-p01-2", taskId: "t-p01-010", requesterId: "u10", createdAt: "2026-10-12", neededDate: "2026-10-20", status: "hoan_thanh", supplierId: "s03", orderNo: "ĐH-MP-2026-1120", orderDate: "2026-10-14", expectedDelivery: "2026-10-19", lines: [["VL001", 35]], history: [H("2026-10-12", "u10", "Tạo đề xuất"), H("2026-10-12", "u10", "Gửi phê duyệt"), H("2026-10-13", "u04", "Phê duyệt"), H("2026-10-14", "u11", "Chọn nhà cung cấp & đặt hàng"), H("2026-10-19", "u10", "Nhập kho"), H("2026-10-22", "u10", "Xuất sử dụng", "Xuất cho tổ nề số 1")] });
MR({ title: "Thép Ø12 đài móng, giằng móng", projectId: "p01", itemId: "i-p01-2", taskId: "t-p01-008", requesterId: "u11", createdAt: "2026-09-02", neededDate: "2026-09-08", status: "hoan_thanh", supplierId: "s02", orderNo: "ĐH-VH-2026-0301", orderDate: "2026-09-03", expectedDelivery: "2026-09-08", lines: [["VL003", 18]], history: [H("2026-09-02", "u11", "Tạo đề xuất"), H("2026-09-02", "u11", "Gửi phê duyệt"), H("2026-09-02", "u04", "Phê duyệt"), H("2026-09-03", "u11", "Chọn nhà cung cấp & đặt hàng"), H("2026-09-08", "u10", "Nhập kho"), H("2026-09-12", "u10", "Xuất sử dụng")] });
MR({ title: "Bê tông M250 bổ sung giằng móng", projectId: "p01", itemId: "i-p01-2", taskId: "t-p01-009", requesterId: "u10", createdAt: "2026-10-30", neededDate: "2026-11-04", status: "tu_choi", lines: [["VL012", 120]], history: [H("2026-10-30", "u10", "Tạo đề xuất"), H("2026-10-30", "u10", "Gửi phê duyệt"), H("2026-10-31", "u04", "Từ chối", "Khối lượng đề xuất vượt định mức còn lại của công việc, đề nghị rà soát lại")] });
MR({ title: "Bê tông M350 mặt đường sân đỗ đợt 5", projectId: "p02", itemId: "i-p02-4", taskId: "t-p02-008", requesterId: "u20", approverId: "u20", createdAt: "2026-11-10", neededDate: "2026-11-20", status: "cho_duyet", starred: true, lines: [["VL011", 1800]], history: [H("2026-11-10", "u20", "Tạo đề xuất"), H("2026-11-10", "u20", "Gửi phê duyệt")] });
MR({ title: "Matit chèn khe co giãn", projectId: "p02", itemId: "i-p02-4", taskId: "t-p02-009", requesterId: "u20", approverId: "u20", createdAt: "2026-10-26", neededDate: "2026-11-12", status: "dat_hang", supplierId: "s06", orderNo: "ĐH-HN-2026-0087", orderDate: "2026-10-29", expectedDelivery: "2026-11-12", lines: [["VL023", 2500]], history: [H("2026-10-26", "u20", "Tạo đề xuất"), H("2026-10-26", "u20", "Gửi phê duyệt"), H("2026-10-27", "u20", "Phê duyệt"), H("2026-10-29", "u20", "Chọn nhà cung cấp & đặt hàng")] });
MR({ title: "Cấp phối đá dăm loại I móng đường lăn", projectId: "p03", itemId: "i-p03-3", taskId: "t-p03-006", requesterId: "u21", approverId: "u21", createdAt: "2026-11-06", neededDate: "2026-11-25", status: "da_duyet", lines: [["VL018", 4200]], history: [H("2026-11-06", "u21", "Tạo đề xuất"), H("2026-11-06", "u21", "Gửi phê duyệt"), H("2026-11-07", "u21", "Phê duyệt")] });
MR({ title: "Thép Ø25 cống hộp BTCT", projectId: "p04", itemId: "i-p04-5", taskId: "t-p04-010", requesterId: "u22", approverId: "u22", createdAt: "2026-11-09", neededDate: "2026-11-19", status: "cho_duyet", lines: [["VL004", 46]], history: [H("2026-11-09", "u22", "Tạo đề xuất"), H("2026-11-09", "u22", "Gửi phê duyệt")] });
MR({ title: "Xi măng PCB40 xây tường kho", projectId: "p06", itemId: "i-p06-3", taskId: null, requesterId: "u24", approverId: "u24", createdAt: "2026-09-15", neededDate: "2026-09-25", status: "hoan_thanh", supplierId: "s03", orderNo: "ĐH-MP-2026-0955", orderDate: "2026-09-17", expectedDelivery: "2026-09-24", lines: [["VL001", 120]], history: [H("2026-09-15", "u24", "Tạo đề xuất"), H("2026-09-15", "u24", "Gửi phê duyệt"), H("2026-09-16", "u24", "Phê duyệt"), H("2026-09-17", "u24", "Chọn nhà cung cấp & đặt hàng"), H("2026-09-24", "u24", "Nhập kho"), H("2026-09-26", "u24", "Xuất sử dụng")] });
MR({ title: "Gạch không nung nhà ở học viên", projectId: "p07", itemId: "i-p07-3", taskId: null, requesterId: "u25", approverId: "u25", createdAt: "2026-10-18", neededDate: "2026-11-01", status: "da_nhap_kho", supplierId: "s03", orderNo: "ĐH-MP-2026-1188", orderDate: "2026-10-20", expectedDelivery: "2026-10-31", lines: [["VL013", 120000]], history: [H("2026-10-18", "u25", "Tạo đề xuất"), H("2026-10-18", "u25", "Gửi phê duyệt"), H("2026-10-19", "u25", "Phê duyệt"), H("2026-10-20", "u25", "Chọn nhà cung cấp & đặt hàng"), H("2026-10-31", "u25", "Nhập kho")] });
MR({ title: "Bê tông M300 sàn tầng 3 nhà làm việc", projectId: "p09", itemId: "i-p09-3", taskId: "t-p09-006", requesterId: "u27", approverId: "u27", createdAt: "2026-11-11", neededDate: "2026-11-21", status: "cho_duyet", lines: [["VL010", 210]], history: [H("2026-11-11", "u27", "Tạo đề xuất"), H("2026-11-11", "u27", "Gửi phê duyệt")] });
MR({ title: "Sơn kẻ vạch nhiệt dẻo đường lăn", projectId: "p05", itemId: "i-p05-5", taskId: null, requesterId: "u23", approverId: "u23", createdAt: "2026-11-13", neededDate: "2027-01-15", status: "nhap", lines: [["VL020", 3500]], history: [H("2026-11-13", "u23", "Tạo đề xuất (lưu nháp)")] });
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
  const building = activeProjects.filter((id) => projectDefs.find((p) => p.id === id).template === "building" || id === "p01");
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
// một số ca vượt định mức nhiên liệu
equipmentShifts.filter((_, i) => i % 37 === 5).forEach((s) => {
  const e = equipment.find((x) => x.id === s.equipmentId);
  s.fuelLiters = Math.round(s.hours * e.fuelNorm * 1.32 * 10) / 10;
  s.note = "Tiêu hao nhiên liệu cao hơn định mức – cần kiểm tra";
});

// ---------- equipment assignments ----------
const equipmentAssignments = [];
let asSeq = 0;
equipment.filter((e) => e.currentProjectId).forEach((e, i) => {
  if (i % 2 === 1) return;
  const start = addDays(TODAY, -rint(25, 120));
  equipmentAssignments.push({
    id: `as-${pad(++asSeq)}`, code: `QĐ-ĐĐ-2026-${pad(asSeq + 40)}`, equipmentId: e.id, fromProjectId: null, toProjectId: e.currentProjectId,
    operatorId: e.operatorId, startDate: start, endDate: addDays(start, rint(90, 200)), status: "dang_dieu_dong",
    requesterId: projects.find((p) => p.id === e.currentProjectId).commanderId, reason: "Phục vụ thi công theo kế hoạch tháng", createdAt: addDays(start, -3),
  });
});
equipmentAssignments.push(
  { id: `as-${pad(++asSeq)}`, code: `QĐ-ĐĐ-2026-${pad(asSeq + 40)}`, equipmentId: equipment[10].id, fromProjectId: null, toProjectId: "p02", operatorId: null, startDate: "2026-11-18", endDate: "2027-01-31", status: "cho_duyet", requesterId: "u20", reason: "Bổ sung máy xúc đào khuôn sân đỗ khu vực mở rộng phía Bắc do tiến độ đang chậm", createdAt: "2026-11-12" },
  { id: `as-${pad(++asSeq)}`, code: `QĐ-ĐĐ-2026-${pad(asSeq + 40)}`, equipmentId: equipment[29].id, fromProjectId: null, toProjectId: "p01", operatorId: null, startDate: "2026-11-20", endDate: "2027-02-28", status: "cho_duyet", requesterId: "u04", reason: "Tưới nước bảo dưỡng bê tông và giảm bụi công trường", createdAt: "2026-11-13" },
  { id: `as-${pad(++asSeq)}`, code: `QĐ-ĐĐ-2026-${pad(asSeq + 40)}`, equipmentId: equipment[16].id, fromProjectId: "p11", toProjectId: "p03", operatorId: equipment[16].operatorId, startDate: "2026-08-25", endDate: "2027-03-31", status: "dang_dieu_dong", requesterId: "u21", reason: "Điều chuyển sau khi hoàn thành công trình Điện Biên", createdAt: "2026-08-20" },
  { id: `as-${pad(++asSeq)}`, code: `QĐ-ĐĐ-2026-${pad(asSeq + 40)}`, equipmentId: equipment[5].id, fromProjectId: "p11", toProjectId: "p11", operatorId: null, startDate: "2026-02-01", endDate: "2026-08-30", status: "hoan_thanh", requesterId: "u29", reason: "Rải bê tông sân đỗ ô tô", createdAt: "2026-01-25" },
);

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
const ac1 = addAcceptance("p01", "i-p01-1", "Nghiệm thu công tác chuẩn bị và san lấp mặt bằng", "Đợt 1", [lt("t-p01-001"), lt("t-p01-002"), lt("t-p01-003")], "da_nghiem_thu", "2026-07-20", "2026-07-28", "u05", docSet.slice(0, 4));
const ac2 = addAcceptance("p01", "i-p01-2", "Nghiệm thu thi công ép cọc", "Đợt 2", [lt("t-p01-004")], "da_nghiem_thu", "2026-08-24", "2026-09-04", "u07", docSet);
addAcceptance("p01", "i-p01-2", "Nghiệm thu đào đất, bê tông lót và cốt thép đài móng", "Đợt 3", [lt("t-p01-006"), lt("t-p01-007"), lt("t-p01-008", 0.97)], "cho_cdt", "2026-10-12", null, "u07", docSet.slice(0, 3));
addAcceptance("p01", "i-p01-2", "Nghiệm thu bê tông đài móng, giằng móng (phần đã thi công)", "Đợt 4", [lt("t-p01-009", 0.9)], "nhap", "2026-11-13", null, "u08", docSet.slice(0, 2));
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
  ["p01", "Chậm nghiệm thu phần móng do thiếu kết quả thí nghiệm nén mẫu bê tông", "ky_thuat", "cao", "dang_xu_ly", "u04", "u07", "2026-11-03", "2026-11-18"],
  ["p01", "Thiếu thép Ø16 cho cột tầng 1, tồn kho dưới mức tối thiểu", "vat_tu", "cao", "moi", "u10", "u11", "2026-11-12", "2026-11-16"],
  ["p01", "Mưa lớn kéo dài làm ngập hố móng trục E–H", "thoi_tiet", "trung_binh", "da_xu_ly", "u05", "u06", "2026-10-15", "2026-10-18"],
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
  ["approval", "warning", "Đề xuất vật tư chờ phê duyệt", "ĐXVT-2026-101 – Thép Ø16 cột tầng trệt (12,5 tấn) đang chờ bạn phê duyệt.", "p01", "/materials/requests/mr-001", "2026-11-12T09:15:00", false],
  ["task", "danger", "Công việc quá hạn", "1.1.2.2.4 Đổ bê tông đài móng, giằng móng đã quá hạn kế hoạch (08/10/2026).", "p01", "/construction/plan/p01", "2026-11-12T07:30:00", false],
  ["equipment", "warning", "Đề nghị điều động thiết bị", "CHT Vũ Đình Khôi đề nghị điều động máy xúc đào đến công trình Sân đỗ máy bay Đà Nẵng.", "p02", "/equipment/dispatch", "2026-11-12T14:05:00", false],
  ["material", "danger", "Cảnh báo tồn kho thấp", "Bê tông thương phẩm M350 tại kho Sân đỗ máy bay Đà Nẵng dưới mức tồn kho tối thiểu.", "p02", "/materials/inventory", "2026-11-11T16:40:00", false],
  ["acceptance", "info", "Hồ sơ nghiệm thu chờ CĐT ký", "BBNT đợt 3 – đào đất, bê tông lót và cốt thép đài móng đã được TVGS xác nhận.", "p01", "/acceptance", "2026-11-10T10:20:00", true],
  ["payment", "success", "Đã nhận thanh toán", "Chủ đầu tư đã thanh toán hồ sơ đợt 2 – thi công ép cọc.", "p01", "/payments", "2026-11-05T15:00:00", true],
  ["task", "warning", "Nhật ký thi công chờ xác nhận", "Tổ bê tông số 2 đã gửi nhật ký ngày 13/11/2026, chờ CHT xác nhận.", "p01", "/construction/logs", "2026-11-13T17:30:00", false],
  ["system", "info", "Cập nhật dữ liệu", "Dữ liệu tiến độ các công trường đã được đồng bộ lúc 08:30.", null, "/", "2026-11-14T08:30:00", true],
].map(([type, severity, title, message, projectId, link, createdAt, read], i) => ({ id: `nt-${pad(i + 1)}`, type, severity, title, message, projectId, link, createdAt, read }));

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
  "acceptance-records.json": acceptanceRecords,
  "payment-records.json": paymentRecords,
  "notifications.json": notifications,
  "issues.json": issues,
};
for (const dir of OUT_DIRS) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + "\n");
}
console.log(Object.entries(files).map(([k, v]) => `${k}: ${v.length}`).join("\n"));
projects.forEach((p) => console.log(p.id, p.shortName, (p.contractValue / 1e9).toFixed(1), "tỷ", "actual", (projectProgress(p.id) * 100).toFixed(1) + "%", "planned",
  (() => { const ts = constructionPlans.filter((t) => t.projectId === p.id && !t.isGroup); const tot = ts.reduce((s, t) => s + t.contractQty * t.unitPrice, 0); return tot ? (ts.reduce((s, t) => s + plannedPct(t) * t.contractQty * t.unitPrice, 0) / tot * 100).toFixed(1) + "%" : "-"; })()));
