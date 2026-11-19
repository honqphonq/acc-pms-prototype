# ACC PMS – Prototype Hệ thống quản lý dự án thi công

High-fidelity interactive prototype cho **Tổng công ty Xây dựng Công trình Hàng không ACC**, xây dựng theo tài liệu *"Đề xuất giải pháp – Hệ thống quản lý dự án thi công"* (Viettel Solutions, 11/2026).

**Cập nhật 18/11/2026:** menu và phân rã chức năng theo *Danh mục tính năng phần mềm quản lý thi công xây dựng – ACC*; dự án demo chính là **Cảng HKQT Gia Bình – GĐ 1.1** với tiến độ thi công chi tiết thật (`scripts/data/gia-binh-schedule.json`, 100 dòng). Phân hệ kế toán (dự toán, chi phí, thanh toán CĐT, giá trị KL, công nợ) để ở trạng thái *Sắp có*.

> Đây là prototype **phục vụ trình diễn giải pháp**, không phải sản phẩm vận hành. Toàn bộ chạy ở trình duyệt – không backend, không API, không database. Dữ liệu là giả lập.

## Cài đặt & chạy

Yêu cầu: Node.js ≥ 18.

```bash
npm install
```

```bash
npm run dev
```

Mở http://localhost:5173 → chọn một vai trò demo → **Đăng nhập**.

Build bản production (thư mục `dist/`, có thể đặt trên bất kỳ web server tĩnh nào):

```bash
npm run build
```

```bash
npm run preview
```

> Khi triển khai `dist/` lên web server, cấu hình fallback mọi đường dẫn về `index.html` (SPA).

## Tài khoản demo (chọn trên màn hình đăng nhập)

| Vai trò | Người dùng | Màn hình bắt đầu |
|---|---|---|
| Lãnh đạo Tổng công ty | Nguyễn Đức Toàn | Dashboard tổng quan |
| Phòng Kế hoạch - Kỹ thuật | Lê Thanh Thiện | Tiến độ thi công SB Gia Bình |
| Chỉ huy trưởng công trường | Trần Quốc Hải | Dự án Sân bay Gia Bình |
| Tổ trưởng / Mũi trưởng | Hoàng Quang Huy | Tiến độ thi công SB Gia Bình |
| Bộ phận Vật tư | Chu Anh Tài | Đề xuất vật tư |
| Phòng Thiết bị / BP Xe máy | Phạm Văn Vinh | Danh mục xe máy thiết bị |
| Tài chính - Kế toán | Hoàng Thị Bích | Tồn kho và kiểm kê |
| Quản trị hệ thống | Đặng Minh Quân | Quản trị (toàn quyền) |

Đổi vai trò bất kỳ lúc nào: menu người dùng (góc trên phải) → **Đổi vai trò demo**, hoặc trang **Hướng dẫn demo** → nút *Bắt đầu với vai trò…*.

## Kịch bản trình diễn

Trang **Hướng dẫn demo** (`/guide`) liệt kê từng bước, có link trực tiếp:

1. **Ban lãnh đạo giám sát dự án** – Trang chủ → Sân bay Gia Bình (chậm tiến độ) → Gantt tiến độ tổng thể → công việc [39] quá hạn.
2. **Cập nhật tiến độ thi công** – Tiến độ SB Gia Bình → công việc [10] BTXM M350 zone R2 → nhập 600 m³ → 88% → 91,7%; CHT đánh giá chất lượng / nghiệm thu nội bộ.
3. **Quản lý vật tư** – Tồn kho → đề xuất vật tư (gợi ý vật tư kèm định mức, tồn kho, đơn giá) → CHT phê duyệt → đặt hàng → nhập kho (đối chiếu, xác nhận) → xuất kho → kiểm kê.
4. **Quản lý xe máy thiết bị** – Danh mục (ô tô / xe biển đỏ / máy thiết bị, cảnh báo kiểm định, bảo hiểm) → phân bổ điều động, thu hồi → bảo dưỡng → sửa chữa → sự cố → nhân viên CMKT.
5. **Phương án, hồ sơ & nhân sự thi công** – góp ý, điều chỉnh phương án (lịch sử phiên bản) → hồ sơ thi công nhiều cấp → nhân sự thi công.

## Reset dữ liệu demo

Mọi thao tác (tạo, sửa, xóa, phê duyệt, cập nhật tiến độ…) được lưu trong `localStorage` của trình duyệt. Để khôi phục dữ liệu gốc từ các file JSON:

- Menu người dùng → **Khôi phục dữ liệu demo**, hoặc
- **Quản trị hệ thống → Dữ liệu demo → Reset dữ liệu demo**, hoặc
- **Hướng dẫn demo → Reset dữ liệu demo**.

(Cách thủ công: DevTools → Application → Local Storage → xóa các khóa bắt đầu bằng `acc-pms:v1:`.)

## Công nghệ

React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui (Radix UI) · Lucide React · Recharts · React Router · JSON mock data · localStorage.

## Cấu trúc mã nguồn

```
src/
  components/
    ui/          # shadcn/ui primitives: button, card, badge, dialog, sheet (drawer), tabs, table, ...
    common/      # DataTable (search/filter/sort/paging), KpiCard, StatusBadge, EmptyState,
                 # ConfirmProvider, Stepper/Timeline, SitePhoto, FormField, ...
    layout/      # Sidebar (thu gọn được), Header (breadcrumb, tìm kiếm, thông báo, user menu)
  layouts/       # AppLayout
  routes/        # Khai báo route (lazy-load theo trang)
  pages/
    auth/ dashboard/ projects/ construction/ materials/ equipment/ acceptance/ payments/ reports/ admin/
  hooks/         # useDb (store + localStorage), useAuth, useTableState, useQueryParam, ...
  services/
    seed.ts        # nạp JSON gốc
    storage.ts     # đọc/ghi localStorage, reset
    selectors.ts   # business logic tính toán: tiến độ, giá trị, tồn kho, cảnh báo, đối chiếu...
    actions.ts     # nghiệp vụ (hàm thuần): phê duyệt, cập nhật KL, nhập/xuất kho, điều động, nghiệm thu...
  data/          # *.json – dữ liệu demo (không hardcode trong component)
  types/         # kiểu dữ liệu domain
  utils/         # định dạng số/ngày, nhãn trạng thái, phân quyền, xuất CSV
public/
  mock-data/     # bản sao JSON (tham khảo/tích hợp ngoài)
  assets/
scripts/generate-mock-data.mjs   # sinh dữ liệu demo nhất quán (seed cố định)
docs/ANALYSIS.md                 # phân tích nghiệp vụ, sitemap, ma trận chức năng, giả định
```

### Nguyên tắc nhất quán dữ liệu

Dashboard, trang dự án, báo cáo **không lưu số tổng hợp** – mọi chỉ số được tính lại từ dữ liệu gốc (`services/selectors.ts`):

- Khối lượng thực hiện của đầu việc = tổng khối lượng các nhật ký thi công → tiến độ đầu việc → hạng mục → dự án → toàn TCT.
- Tồn kho = tổng phiếu nhập − tổng phiếu xuất.
- Giá trị nghiệm thu = KL nghiệm thu × đơn giá đầu việc; công nợ NCC = đề nghị thanh toán − đã trả.

Vì vậy một thao tác ở bất kỳ màn hình nào đều phản ánh ngay ở mọi nơi khác.

### Sinh lại dữ liệu demo

```bash
npm run gen:data
```

## Giả định

Các nội dung tài liệu chưa mô tả chi tiết được mô phỏng theo giả định hợp lý và **được đánh dấu "Đề xuất"** trong giao diện. Danh sách đầy đủ: `docs/ANALYSIS.md` (mục 8) và trang *Hướng dẫn demo*.
