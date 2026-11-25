import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Lightbulb, PlayCircle, RefreshCcw, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useDb } from "@/hooks/useDb";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { ROLE_LABELS } from "@/utils/constants";
import type { RoleKey } from "@/types";

interface Step { text: string; to?: string }
interface Scenario { no: number; title: string; role: RoleKey; userId: string; goal: string; steps: Step[] }

const SCENARIOS: Scenario[] = [
  {
    no: 1, title: "Ban lãnh đạo giám sát dự án", role: "lanh_dao", userId: "u01", goal: "Nắm tình hình các dự án, dự án đúng / chậm tiến độ, lãi – lỗ theo hợp đồng, chi phí, nghiệm thu và máy móc thiết bị.",
    steps: [
      { text: "Trang chủ: trạng thái dự án (Chưa bắt đầu / Đúng tiến độ / Chậm tiến độ), biểu đồ Hợp đồng – Chi phí – Nghiệm thu theo dự án (xếp theo lãi), số lượng XMTB theo loại", to: "/" },
      { text: "Danh sách dự án: bấm thanh tiến độ để xem % hoàn thành, % kế hoạch đến hôm nay và lý do trạng thái", to: "/projects" },
      { text: "Tiến độ Gantt SB Gia Bình kiểu Tracking Gantt: kế hoạch xám mờ, thực tế đè lên (đậm = đã làm, xanh = đúng / đỏ = chậm); di chuột xem kế hoạch đến hôm nay, chậm bao nhiêu, năng suất cần để kịp hạn", to: "/construction/plan/p01" },
      { text: "Công việc điều hành: mở CV-003 đang “Chờ review” → Đạt hoặc Yêu cầu làm lại", to: "/directives?id=cv03" },
    ],
  },
  {
    no: 2, title: "Cập nhật tiến độ thi công", role: "to_truong", userId: "u08", goal: "Tổ trưởng cập nhật khối lượng thực hiện, ảnh hiện trường; tiến độ tự động tính lại trên Gantt và Trang chủ.",
    steps: [
      { text: "Mở công việc [10] Thi công BTXM M350/45 dày 40cm (đang 88%)", to: "/construction/plan/p01/task/t-p01-010" },
      { text: "Nhập khối lượng thực hiện trong ngày, nội dung, nhân công, ảnh → Lưu: Lịch sử hoạt động ghi lại lần cập nhật" },
      { text: "Quay lại Gantt: % công việc, nhóm (trung bình cộng các việc con) và tổng tiến độ được tính lại", to: "/construction/plan/p01" },
    ],
  },
  {
    no: 3, title: "Quản lý vật tư vật liệu", role: "bp_vat_tu", userId: "u10", goal: "Mỗi dự án là một kho: tồn kho, định mức, cảnh báo sắp hết → đề xuất → nhập / xuất kho (phiếu nhiều dòng) → kiểm kê.",
    steps: [
      { text: "Quản lý vật tư vật liệu → chọn kho Sân bay Gia Bình: BTN C19, matit dưới tồn tối thiểu; nilon sắp hết", to: "/materials/stock/p01" },
      { text: "CHT phê duyệt đề xuất “BTN C19 rải thảm lề CHC zone R2”", to: "/materials/stock/p01?tab=de_xuat" },
      { text: "Tab Phiếu nhập: mở phiếu chờ xác nhận, đối chiếu chứng từ → Xác nhận nhập kho", to: "/materials/stock/p01?tab=nhap" },
    ],
  },
  {
    no: 4, title: "Quản lý xe máy thiết bị", role: "phong_thiet_bi", userId: "u12", goal: "Danh mục XMTB có hình ảnh, người sử dụng, giá mua / đơn giá thuê; điều động; phân ca – nhật trình; bảo dưỡng.",
    steps: [
      { text: "Danh mục XMTB: sắp xếp Mới cập nhật / Tên A → Z; cột Người sử dụng, Giá mua / Đơn giá thuê", to: "/equipment/list" },
      { text: "Tick nhiều máy → Điều động: chọn dự án và người sử dụng cho từng máy, có hiệu lực ngay", to: "/equipment/list" },
      { text: "Phân ca: Cấu hình ca (ca mẫu dùng chung), Phân ca hàng loạt, Nhập nhật trình theo ngày (tổ trưởng nhập hộ, Lưu tất cả)", to: "/equipment/shifts" },
      { text: "Sửa chữa / Bảo dưỡng / Sự cố: tạo và giao việc → người được giao Tiếp nhận → Cập nhật kết quả, chi phí, biên bản; chi tiết có lịch sử hoạt động", to: "/equipment/repairs" },
      { text: "Bảo dưỡng: cảnh báo đến hạn theo giờ máy / km hoặc theo tháng", to: "/equipment/maintenance" },
    ],
  },
  {
    no: 5, title: "Phương án, hồ sơ & nhân sự thi công", role: "phong_ktkt", userId: "u03", goal: "Tải phương án, góp ý, lưu lịch sử các lần thay đổi file (không phê duyệt trên phần mềm); hồ sơ và nhân sự công trường.",
    steps: [
      { text: "Phương án TCTC: mở phương án → Tải bản mới (bản cũ tự lưu) · góp ý · thêm người theo dõi · lịch sử hoạt động", to: "/construction/methods" },
      { text: "Hồ sơ thi công: thư mục nhiều cấp, tải lên tài liệu", to: "/construction/documents" },
      { text: "Nhân sự thi công: lọc theo loại chức danh, giấy tờ Có / Không", to: "/construction/staff" },
    ],
  },
  {
    no: 6, title: "Tài chính kế toán", role: "ke_toan", userId: "u14", goal: "Nhập tay / import số liệu từ phần mềm kế toán; tự tính, đối chiếu và báo cáo.",
    steps: [
      { text: "Dự toán thi công: STT 1 / 1.1 / 1.1.1 (hạng mục → phần → công tác), KL × đơn giá = thành tiền, Tổng dự toán; import Excel có kiểm tra lỗi", to: "/finance/estimate" },
      { text: "Chi phí tập hợp: chứng từ theo tháng, 4 khoản mục NVLTT / NCTT / CPMTC / CPSXC, cộng tháng & lũy kế, tổng chi phí so với tổng dự toán; xuất Excel đúng mẫu SXKD", to: "/finance/costs" },
      { text: "Hồ sơ thanh toán với CĐT: tạm ứng / thanh toán, ghi nhận đã thu, còn phải thu theo hợp đồng", to: "/finance/payments" },
      { text: "Giá trị khối lượng thi công: KL thực tế × đơn giá HĐ theo kỳ, chốt kỳ, đối chiếu thực hiện – nghiệm thu – thanh toán", to: "/finance/value" },
      { text: "Công nợ thầu phụ, NCC: Giá trị HĐ · Giá trị thực hiện · Đã thanh toán · Công nợ còn lại; tab Danh mục NCC và thầu phụ", to: "/finance/debts" },
    ],
  },
];

const ASSUMPTIONS = [
  "Ngày dữ liệu demo cố định 14/11/2026 để kịch bản trình diễn luôn nhất quán.",
  "Dự án Sân bay Gia Bình dùng tiến độ thi công chi tiết thật (28/04/2026 – 25/04/2027); khối lượng thực hiện là giả lập. Các dự án khác là dữ liệu minh họa rút gọn.",
  "Tiến độ không quy ra tiền: % công việc = KL lũy kế ÷ KL hợp đồng; % nhóm, hạng mục, dự án = trung bình cộng các việc con. % kế hoạch đến hôm nay nội suy theo ngày của từng công việc.",
  "Trạng thái dự án: Chưa bắt đầu (chưa khởi công); chưa qua 1/3 thời gian thi công = Đúng tiến độ; sau đó % hoàn thành ≥ % kế hoạch = Đúng tiến độ, thấp hơn = Chậm tiến độ (cách đo đang chờ ACC xác nhận).",
  "Kế hoạch tiến độ chỉ Chỉ huy trưởng được điều chỉnh. Trạng thái công việc so với mốc kế hoạch (KL hợp đồng ÷ số ngày × số ngày đã qua tính từ ngày bắt đầu kế hoạch), không phụ thuộc ngày bắt đầu thực tế; thiếu dù ít cũng là chậm.",
  "Phân hệ kế toán không thay phần mềm kế toán: số liệu được nhập tay hoặc import Excel theo file mẫu.",
  "Lãi / lỗ trên Trang chủ = giá trị nghiệm thu − chi phí thực hiện, lũy kế từ khởi công đến nay.",
  "File đính kèm (ảnh, PDF) được lưu ngay trên trình duyệt để xem trước; prototype không có máy chủ lưu file.",
  "Cảnh báo vật tư: tồn < tồn tối thiểu = thiếu hụt; tiêu hao ≥ 90% định mức = sắp vượt; > 100% = vượt định mức.",
];


export default function GuidePage() {
  const { login, user } = useAuth();
  const { db, resetDemo } = useDb();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const start = (s: Scenario) => {
    login(s.userId);
    toast.success(`Đã chuyển sang vai trò: ${ROLE_LABELS[s.role]}`, { description: db.users.find((u) => u.id === s.userId)?.name });
    navigate(s.steps[0].to ?? "/");
  };
  return (
    <div>
      <PageHeader title="Hướng dẫn trình diễn" description="5 kịch bản nghiệp vụ trên dữ liệu dự án Sân bay Gia Bình: giám sát → cập nhật tiến độ → vật tư → xe máy thiết bị → phương án, hồ sơ & nhân sự thi công."
        actions={<Button variant="outline" onClick={async () => { if (await confirm({ title: "Khôi phục dữ liệu demo trước khi trình diễn?", destructive: true, confirmText: "Khôi phục" })) { resetDemo(); toast.success("Đã khôi phục dữ liệu ban đầu"); } }}><RefreshCcw /> Reset dữ liệu demo</Button>} />
      <div className="grid gap-4 xl:grid-cols-2">
        {SCENARIOS.map((s) => (
          <Card key={s.no} className="flex flex-col">
            <CardHeader className="items-start">
              <div>
                <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{s.no}</span><span className="text-[15px] font-semibold text-slate-900">{s.title}</span></div>
                <p className="mt-1.5 text-xs text-slate-500">{s.goal}</p>
              </div>
              <Badge tone={user?.id === s.userId ? "success" : "outline"} className="shrink-0"><UserCog className="h-3 w-3" />{ROLE_LABELS[s.role]}</Badge>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <ol className="flex-1 space-y-2">
                {s.steps.map((st, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="flex-1">{st.text}{st.to && <Link to={st.to} className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">mở <ArrowRight className="h-3 w-3" /></Link>}</span>
                  </li>
                ))}
              </ol>
              <Button className="mt-4 w-fit" onClick={() => start(s)}><PlayCircle /> Bắt đầu với vai trò {ROLE_LABELS[s.role]}</Button>
            </CardContent>
          </Card>
        ))}
        <Card className="border-dashed border-amber-300 bg-amber-50/40">
          <CardHeader><CardTitle className="flex items-center gap-2 text-amber-800"><Lightbulb className="h-4 w-4" /> Giả định của prototype (chưa phải yêu cầu chính thức)</CardTitle></CardHeader>
          <CardContent><ul className="list-disc space-y-1.5 pl-5 text-[13px] text-slate-700">{ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}</ul><p className="mt-3 text-xs text-slate-500">Chi tiết phân tích nghiệp vụ, sitemap và ma trận chức năng: xem <code>docs/ANALYSIS.md</code> trong mã nguồn.</p></CardContent>
        </Card>
      </div>
    </div>
  );
}
