# ACC PMS – Prototype Hệ thống quản lý dự án thi công

High-fidelity interactive prototype cho **Tổng công ty Xây dựng Công trình Hàng không ACC**, xây dựng theo tài liệu *"Đề xuất giải pháp – Hệ thống quản lý dự án thi công"* (Viettel Solutions, 11/2026).

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
| Lãnh đạo Tổng công ty | Nguyễn Văn Hùng | Dashboard tổng quan |
| Phòng Kế hoạch - Kỹ thuật | Lê Thanh Thiện | Kế hoạch thi công |
| Chỉ huy trưởng công trường | Trần Quốc Hải | Dự án Trường Lê Hồng Phong |
| Tổ trưởng / Mũi trưởng | Hoàng Quang Huy | Kế hoạch thi công |
| Bộ phận Vật tư | Chu Anh Tài | Đề xuất vật tư |
| Phòng Thiết bị / BP Xe máy | Phạm Văn Vinh | Danh sách xe máy |
| Tài chính - Kế toán | Hoàng Thị Bích | Đối chiếu khối lượng |
| Quản trị hệ thống | Đặng Minh Quân | Quản trị (toàn quyền) |

Đổi vai trò bất kỳ lúc nào: menu người dùng (góc trên phải) → **Đổi vai trò demo**, hoặc trang **Hướng dẫn demo** → nút *Bắt đầu với vai trò…*.

## Kịch bản trình diễn

Trang **Hướng dẫn demo** (`/guide`) liệt kê từng bước, có link trực tiếp:

1. **Ban lãnh đạo giám sát dự án** – Dashboard → dự án chậm tiến độ → hạng mục, công việc quá hạn → cảnh báo.
2. **Quản lý kế hoạch thi công** – Kế hoạch dự án Lê Hồng Phong → công việc 1.1.2.2.4 → *Cập nhật khối lượng* 24 m³ → tiến độ 80% → 85,7%, dự án và dashboard tự tính lại → CHT xác nhận nhật ký.
3. **Quản lý vật tư** – Nhu cầu & tồn kho → tạo đề xuất (cảnh báo vượt định mức) → CHT phê duyệt (*Chờ duyệt → Đã phê duyệt*) → chọn NCC, đặt hàng → nhập kho → xuất sử dụng → tồn kho cập nhật.
4. **Quản lý thiết bị** – Danh sách xe máy → lọc nhàn rỗi → điều động đến công trình → ca máy, nhiên liệu.
5. **Nghiệm thu và thanh toán** – Đối chiếu khối lượng → lập hồ sơ nghiệm thu → TVGS → CĐT ký → lập hồ sơ thanh toán → ghi nhận thanh toán → thanh quyết toán.

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
