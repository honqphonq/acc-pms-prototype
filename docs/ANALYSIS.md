# Phân tích nghiệp vụ & thiết kế prototype

**Hệ thống quản lý dự án thi công – TCT Xây dựng Công trình Hàng không ACC**
Nguồn: tài liệu *"Đề xuất giải pháp – Hệ thống quản lý dự án thi công cho TCT Xây dựng Công trình Hàng không ACC"* (Viettel Solutions, 11/2026, 24 trang).

> Ký hiệu: **[TL p.X]** = nội dung xác nhận từ tài liệu, trang X. **[ĐX]** = đề xuất / giả định của prototype, *chưa được ACC xác nhận*.

---

## 1. Tóm tắt tài liệu

| Trang | Nội dung | Ý nghĩa cho prototype |
|---|---|---|
| 4 | Mô hình tổ chức: Chủ tịch → Ban TGĐ → Cơ quan TCT (Văn phòng, P. Thiết bị – Công nghệ, P. Tài chính – Kế toán, P. Kế hoạch – Kỹ thuật, P. Kinh tế – Kỹ thuật) và Các công ty con → Công trường → Ban chỉ huy công trường (BP Kỹ thuật, Vật tư, Hồ sơ, Kế toán, ATLĐ-VSMT, Xe máy) | Vai trò người dùng, `departments.json`, phân quyền |
| 5 | Hạn chế quản lý tiến độ: thiếu công cụ phân giao kế hoạch tổng thể → chi tiết; thiếu sở cứ đánh giá (ảnh hiện trường, nhật ký); cập nhật phụ thuộc báo cáo thủ công; chưa có cảnh báo chậm tiến độ, dự báo | Kế hoạch dạng cây + Gantt, nhật ký có ảnh, cảnh báo quá hạn/chậm |
| 6 | Hạn chế vật tư: chưa liên kết nhu cầu → kế hoạch cung ứng; thiếu cảnh báo thiếu hụt / vượt định mức; khó kiểm soát tồn kho và tiêu hao thực tế | Nhu cầu & tồn kho, định mức, cảnh báo, sổ nhập–xuất |
| 7 | Hạn chế thiết bị: thiết bị sở hữu + thuê ngoài cần quản lý thống nhất; chưa tổng hợp giờ hoạt động, ca máy, nhiên liệu, định mức; quyết định điều động thủ công | Danh sách XMTB, điều động, ca máy & nhiên liệu |
| 8 | Hạn chế thanh toán & báo cáo: BP Kế toán cần đối chiếu KL thực tế – KL nghiệm thu; dữ liệu phân tán; lãnh đạo thiếu công cụ giám sát thời gian thực | Đối chiếu khối lượng, hồ sơ nghiệm thu – thanh toán, dashboard |
| 9 | 4 mục tiêu: số hóa & tập trung dữ liệu; nâng cao giám sát; tối ưu nghiệm thu – thanh quyết toán; hỗ trợ điều hành | Định hướng toàn bộ prototype |
| 11 | QT quản lý dự án tổng thể (TCT ↔ CHT); QT tổ chức & theo dõi thi công (CHT ↔ Tổ trưởng/mũi trưởng) | Luồng phê duyệt nhận thi công; luồng giao việc → báo cáo KL → xác nhận → tổng hợp |
| 12 | QT cung ứng vật tư (Công trường ↔ CHT ↔ BP Vật tư); QT phân công xe – máy (6 bước) | Luồng đề xuất vật tư; luồng điều động & ca máy |
| 13 | Danh mục chức năng 7 nhóm | Sitemap |
| 14–20 | Giao diện tham khảo: Dashboard tổng quan, Dashboard dự án, Bảng kế hoạch thi công, Cập nhật tiến độ (web + mobile), Báo cáo giá trị thực hiện, Đề xuất vật tư, Danh sách xe máy | Bố cục, màu sắc, số liệu mẫu |

## 2. Vai trò người dùng

| Vai trò | Đơn vị (TL p.4) | Tham gia quy trình | Tài khoản demo |
|---|---|---|---|
| Lãnh đạo TCT | Ban TGĐ | Giám sát, phê duyệt nhận thi công, ban hành quyết định | Nguyễn Văn Hùng |
| Phòng KH-KT | Cơ quan TCT | Kế hoạch, tiến độ, nghiệm thu | Lê Thanh Thiện |
| Chỉ huy trưởng (CHT) | Ban chỉ huy công trường | Lập & phân giao kế hoạch, xác nhận KL, phê duyệt đề xuất vật tư [TL p.11–12] | Trần Quốc Hải |
| Tổ trưởng / mũi trưởng | Tổ đội | Tiếp nhận việc, báo cáo kết quả & KL [TL p.11] | Hoàng Quang Huy |
| BP Vật tư | BCH công trường | Tổng hợp nhu cầu, kiểm tra tồn, chọn NCC, mua hàng, nhập kho [TL p.12] | Chu Anh Tài |
| Phòng Thiết bị / BP Xe máy | Cơ quan TCT / BCH | Kiểm tra sẵn sàng, phân công lái xe/thợ vận hành, điều động [TL p.12] | Phạm Văn Vinh |
| Tài chính – Kế toán | P. TCKT / BP Kế toán | Đối chiếu KL, thanh toán [TL p.8] | Hoàng Thị Bích |
| Quản trị hệ thống | Văn phòng | Người dùng, vai trò, quyền [TL p.13] | Đặng Minh Quân |

Ma trận quyền chi tiết: `src/utils/permissions.ts` **[ĐX]**.

## 3. Module & quan hệ

```
                   ┌──────────── Dashboard / Báo cáo / Cảnh báo ◄──────────────┐
                   │ (chỉ đọc – tính lại từ dữ liệu gốc)                        │
Quản lý dự án ──► Hạng mục ──► Kế hoạch (đầu việc) ──► Nhật ký thi công (KL) ───┤
     │                              │  ▲                     │                   │
     │                              │  └── xuất vật tư theo đầu việc            │
     │                              ▼                         ▼                   │
     │                Vật tư: định mức → đề xuất → duyệt → NCC → nhập → xuất ───┤
     │                                                                          │
     ├──► Xe máy thiết bị: điều động → ca máy, nhiên liệu → bảo dưỡng ──────────┤
     │                                                                          │
     └──► Nghiệm thu (KL thực hiện → KL nghiệm thu) ──► Thanh toán CĐT ─────────┘
                    Nhập kho theo đề xuất ──► Đề nghị thanh toán NCC (công nợ)
```

Các khóa liên kết: `projectId`, `itemId`, `taskId`, `materialId`, `supplierId`, `equipmentId`, `acceptanceIds`, `requestId`, `userId`.

## 4. Sitemap & danh sách màn hình

| Nhóm (TL p.13) | Màn hình | Route |
|---|---|---|
| Đăng nhập | Chọn vai trò demo | `/login` |
| Dashboard, báo cáo | Dashboard tổng quan [TL p.14] | `/` |
| Quản lý công trình | Danh sách dự án (bảng/thẻ), tạo/sửa/xóa, phê duyệt nhận thi công | `/projects` |
| | Dashboard dự án + 8 tab [TL p.15] | `/projects/:id` |
| | Kế hoạch thi công: bảng cây, Gantt, giao việc, drawer chi tiết [TL p.16] | `/construction/plan/:projectId` |
| | Cập nhật tiến độ / khối lượng (modal) [TL p.17] | trong kế hoạch, dự án, nhật ký |
| | Nhật ký thi công | `/construction/logs` |
| | Báo cáo giá trị thực hiện [TL p.18] | `/construction/value-report` |
| Quản lý vật tư vật liệu | Nhu cầu & tồn kho, định mức | `/materials/inventory` |
| | Danh sách đề xuất (tab trạng thái) [TL p.19] | `/materials/requests` |
| | Thêm/sửa đề xuất (cảnh báo định mức) [TL p.19] | `/materials/requests/new`, `/:id/edit` |
| | Chi tiết đề xuất + quy trình | `/materials/requests/:id` |
| | Nhập – xuất kho | `/materials/transactions` |
| | Danh mục vật tư · Nhà cung cấp | `/materials/catalog`, `/materials/suppliers` |
| Quản lý xe máy thiết bị | Danh sách xe máy [TL p.20] | `/equipment/list` |
| | Chi tiết thiết bị | `/equipment/:id` |
| | Điều động · Ca máy & nhiên liệu · Bảo dưỡng sửa chữa | `/equipment/dispatch`, `/shifts`, `/maintenance` |
| Quản lý tài chính | Hồ sơ nghiệm thu · chi tiết | `/acceptance`, `/acceptance/:id` |
| | Đối chiếu khối lượng | `/acceptance/reconcile` |
| | Hồ sơ thanh toán (CĐT / NCC) · Thanh quyết toán | `/payments`, `/payments/settlement` |
| Dashboard, báo cáo | Báo cáo (6 loại) · Cảnh báo & vấn đề phát sinh | `/reports`, `/alerts` |
| Quản trị hệ thống | Người dùng, vai trò & quyền, cơ cấu tổ chức, dữ liệu demo | `/admin` |
| — | Hướng dẫn trình diễn | `/guide` |

## 5. Ma trận chức năng × thao tác

| Chức năng | Xem/lọc/tìm/sắp xếp/phân trang | Tạo | Sửa | Xóa | Đổi trạng thái / quy trình |
|---|---|---|---|---|---|
| Dự án | ✔ | ✔ | ✔ | ✔ (cascade) | Phê duyệt / từ chối nhận thi công; trạng thái quyết toán |
| Hạng mục / công việc | ✔ (cây, Gantt) | ✔ | ✔ (giao lại) | ✔ | Cập nhật KL → tự đổi trạng thái công việc |
| Nhật ký thi công | ✔ | ✔ (nháp/gửi) | — | ✔ (trừ KL) | CHT xác nhận |
| Đề xuất vật tư | ✔ (10 tab) | ✔ | ✔ (nháp/trả lại) | ✔ | Gửi → duyệt/từ chối/trả lại → xuất từ kho hoặc đặt hàng → nhập kho → xuất |
| Kho | ✔ | Phiếu nhập/xuất | Định mức, tồn tối thiểu | — | — |
| Danh mục vật tư, NCC | ✔ | ✔ | ✔ | ✔ (có ràng buộc) | — |
| Thiết bị | ✔ | ✔ | ✔ | ✔ | Điều động / duyệt / thu hồi; bảo trì |
| Ca máy | ✔ | ✔ | — | ✔ | — |
| Nghiệm thu | ✔ | ✔ | ✔ (KL khi đang lập) | ✔ | Trình TVGS → TVGS xác nhận → CĐT ký / trả lại |
| Thanh toán | ✔ | ✔ | — | ✔ | Trình → duyệt → thanh toán một phần / đủ |
| Vấn đề phát sinh | ✔ | ✔ | ✔ | ✔ | Mới → Đang xử lý → Đã xử lý |
| Người dùng | ✔ | ✔ | ✔ | ✔ | — |

## 6. Luồng nghiệp vụ được mô phỏng

1. **QT quản lý dự án tổng thể [TL p.11]**: Thông tin gói thầu / HĐ → Đơn xin nhận thi công (tạo dự án, `approvalStatus = cho_duyet`) → TCT phê duyệt / từ chối → ban hành quyết định phân giao → lập kế hoạch nội bộ → tổ chức thi công → theo dõi tổng hợp báo cáo.
2. **QT tổ chức & theo dõi thi công [TL p.11]**: CHT phân giao kế hoạch chi tiết (giao việc, tổ đội, thời gian) → Tổ trưởng tiếp nhận → báo cáo kết quả, ghi nhận KL thực hiện (modal p.17) → CHT xác nhận nhật ký → tổng hợp tiến độ, KL, nhân công (dashboard, báo cáo).
3. **QT cung ứng vật tư [TL p.12]**: Công trường đề xuất → CHT phê duyệt (đồng ý / từ chối) → BP Vật tư tổng hợp, kiểm tra tồn kho → *còn hàng*: xuất sử dụng; *hết hàng*: lựa chọn NCC → mua hàng → nhập kho → xuất sử dụng.
4. **QT phân công xe – máy [TL p.12]**: B1 yêu cầu sử dụng thiết bị → B2 phân công lái xe/thợ vận hành → B3 ca làm việc → B4 vận hành, giám sát giờ máy/nhiên liệu → B5 chấm công → B6 báo cáo.
5. **Nghiệm thu – thanh toán [TL p.8, ĐX về các bước]**: KL thực hiện (nhật ký) → lập hồ sơ nghiệm thu → TVGS → CĐT ký → hồ sơ thanh toán (giữ lại 5%) → ghi nhận thanh toán → thanh quyết toán.

## 7. Dữ liệu JSON (`src/data/`, bản sao `public/mock-data/`)

| File | Bản ghi | Ghi chú |
|---|---|---|
| projects.json | 11 | 3 loại công trình; 1 chờ duyệt, 1 hoàn thành |
| users.json | 67 | 8 tài khoản demo, CHT, kỹ sư, 24 công nhân vận hành |
| departments.json | 14 | Theo sơ đồ tổ chức trang 4 |
| construction-items.json | 47 | Hạng mục |
| construction-plans.json | 120 | Đầu việc (dự án Lê Hồng Phong theo đúng trang 16–18) |
| construction-logs.json | ~600 | Tổng KL nhật ký = KL thực hiện của từng đầu việc |
| materials.json / suppliers.json | 25 / 8 | |
| material-requests.json | 20 | Đủ mọi trạng thái quy trình |
| inventory.json / stock-transactions.json | 107 / ~580 | Tồn kho tính từ phiếu nhập – xuất |
| equipment.json / equipment-assignments.json / equipment-shifts.json | 48 / 23 / ~480 | |
| acceptance-records.json / payment-records.json | 40 / 33 | |
| notifications.json / issues.json | 8 / 12 | |

Dữ liệu được sinh bởi `scripts/generate-mock-data.mjs` (seed cố định) – chạy `npm run gen:data` để tái tạo.

## 8. Giả định (Assumptions) [ĐX]

1. Ngày dữ liệu cố định **14/11/2026**.
2. Tiến độ = bình quân gia quyền theo giá trị (KL × đơn giá); tiến độ kế hoạch nội suy tuyến tính theo thời gian từng công việc. (Tài liệu p.16 hiển thị % nhưng không nêu công thức.)
3. Trạng thái tiến độ dự án xác định theo thời hạn công việc: có công việc quá hạn > 14 ngày = chậm tiến độ; quá hạn ≤ 14 ngày hoặc công việc đang làm chậm hơn tiến độ thời gian kế hoạch > 15% = có nguy cơ chậm; còn lại = đúng tiến độ.
4. Vật tư: nhu cầu còn lại = định mức − đã xuất − tồn − đang đề xuất; cảnh báo ≥ 90% định mức (tham chiếu dòng cảnh báo đỏ trang 19); tồn < tồn tối thiểu = thiếu hụt.
5. Thiết bị: hiệu suất = giờ máy / (18 ngày × 8 giờ) trong 3 tuần; nhiên liệu > 108% định mức → cảnh báo; bảo dưỡng theo chu kỳ giờ máy.
6. Chi phí thực hiện = giá trị thực hiện × hệ số chi phí dự án (chưa có phân hệ chi phí).
7. Các bước nghiệm thu (TVGS, CĐT) và tỷ lệ giữ lại 5% là mô phỏng hợp lý, tài liệu chưa mô tả chi tiết.
8. Ảnh hiện trường, file hồ sơ là minh họa; xác thực là chọn vai trò demo.
9. Chức năng "Tài liệu", "Trao đổi" thấy trên sidebar mẫu (p.14) và các danh mục phụ (định mức nhiên liệu, cây đơn vị, ca làm việc, sự cố tai nạn, thanh xử lý) chưa xây dựng màn hình riêng – nằm ngoài các luồng trọng tâm.
