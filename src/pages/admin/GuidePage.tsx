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
    no: 1, title: "Ban lãnh đạo giám sát dự án", role: "lanh_dao", userId: "u01", goal: "Nắm tình hình toàn bộ dự án, phát hiện dự án/hạng mục chậm tiến độ và các cảnh báo.",
    steps: [
      { text: "Mở Dashboard tổng quan – xem chỉ số tổng hợp, tiến độ tổng thể, tỷ lệ đúng / nguy cơ / chậm tiến độ, tình trạng máy móc thiết bị", to: "/" },
      { text: "Trong khối “Dự án cần xử lý”, chọn “Sân đỗ máy bay Đà Nẵng” (Chậm tiến độ – có công việc quá hạn 32 ngày)", to: "/projects/p02" },
      { text: "Xem tiến độ tổng thể, biểu đồ lũy kế, danh sách công việc chậm / quá hạn của dự án", to: "/projects/p02" },
      { text: "Mở dự án Trường Lê Hồng Phong → tab Hạng mục: phát hiện “Phần móng” có công việc quá hạn", to: "/projects/p01" },
      { text: "Xem trang Cảnh báo & vấn đề phát sinh: tiến độ, thiếu vật tư, thiết bị không sẵn sàng", to: "/alerts" },
    ],
  },
  {
    no: 2, title: "Quản lý kế hoạch thi công", role: "to_truong", userId: "u08", goal: "Cập nhật khối lượng thực hiện, ghi nhật ký và quan sát tiến độ tự động cập nhật.",
    steps: [
      { text: "Mở Kế hoạch thi công dự án Trường Lê Hồng Phong (bảng kế hoạch dạng cây hoặc Gantt)", to: "/construction/plan/p01" },
      { text: "Mở hạng mục “Phần móng” → nhóm “Đài móng, giằng móng và tường móng” → công việc 1.1.2.2.4", to: "/construction/plan/p01/task/t-p01-009" },
      { text: "Màn hình chi tiết công việc: nhập 24 m³ thực hiện hôm nay, ghi nội dung, nhân công, đính kèm ảnh hiện trường" },
      { text: "Lưu cập nhật → tiến độ công việc 80% → 85,7%; tiến độ hạng mục, dự án và Dashboard được tính lại" },
      { text: "Đổi vai trò Chỉ huy trưởng để xác nhận nhật ký thi công", to: "/construction/logs?project=p01" },
      { text: "Xem Báo cáo giá trị thực hiện – giá trị tăng tương ứng", to: "/construction/value-report?project=p01" },
    ],
  },
  {
    no: 3, title: "Quản lý vật tư", role: "bp_vat_tu", userId: "u10", goal: "Đi trọn quy trình: Nhu cầu → Đề xuất → Phê duyệt → Chọn NCC → Mua hàng → Nhập kho → Xuất sử dụng.",
    steps: [
      { text: "Xem Nhu cầu & tồn kho công trình Lê Hồng Phong: thép Ø16, bê tông M300 đang dưới tồn tối thiểu", to: "/materials/inventory?project=p01" },
      { text: "Tạo đề xuất vật tư mới (hệ thống cảnh báo nếu vượt 90% định mức còn lại) → Gửi", to: "/materials/requests/new?project=p01" },
      { text: "Đổi vai trò Chỉ huy trưởng → mở đề xuất → Phê duyệt: trạng thái “Chờ duyệt” → “Đã phê duyệt”", to: "/materials/requests?tab=cho_duyet" },
      { text: "Đổi lại BP Vật tư → “Hết hàng: chọn NCC & đặt hàng” → trạng thái “Đang đặt hàng”" },
      { text: "“Xác nhận nhập kho” → tồn kho tăng, đề nghị thanh toán NCC được tạo tự động" },
      { text: "“Xuất sử dụng” → đề xuất hoàn thành; kiểm tra lại tồn kho sau thao tác", to: "/materials/inventory?project=p01" },
    ],
  },
  {
    no: 4, title: "Quản lý thiết bị", role: "phong_thiet_bi", userId: "u12", goal: "Theo dõi tình trạng thiết bị và điều động thiết bị đến công trình.",
    steps: [
      { text: "Xem danh sách xe máy thiết bị, lọc theo nhóm máy / trạng thái", to: "/equipment/list" },
      { text: "Lọc trạng thái “Nhàn rỗi” – chọn máy xúc đào M244.0221 (sẵn sàng điều động)", to: "/equipment/list?status=nhan_roi" },
      { text: "Bấm “Điều động” → chọn công trình Sân đỗ máy bay Đà Nẵng, phân công người vận hành → Điều động" },
      { text: "Hoặc duyệt đề nghị điều động đang chờ trên màn Điều động thiết bị", to: "/equipment/dispatch" },
      { text: "Theo dõi ca máy, giờ máy, nhiên liệu so với định mức", to: "/equipment/shifts" },
    ],
  },
  {
    no: 5, title: "Nghiệm thu và thanh toán", role: "ke_toan", userId: "u14", goal: "Đối chiếu khối lượng thực hiện – nghiệm thu, lập hồ sơ nghiệm thu và theo dõi thanh toán.",
    steps: [
      { text: "Mở Đối chiếu khối lượng dự án Lê Hồng Phong: thực hiện / đã NT / chờ NT / chênh lệch", to: "/acceptance/reconcile?project=p01" },
      { text: "Bấm “Lập hồ sơ nghiệm thu” cho phần chênh lệch → hồ sơ ở trạng thái Đang lập" },
      { text: "Trình TVGS → TVGS xác nhận → CĐT ký biên bản (đổi vai trò Lãnh đạo / Phòng KHKT để xác nhận)", to: "/acceptance?project=p01" },
      { text: "Lập hồ sơ thanh toán từ hồ sơ đã nghiệm thu, ghi nhận phê duyệt và thanh toán", to: "/payments" },
      { text: "Xem tình hình thanh quyết toán & thu hồi vốn các dự án", to: "/payments/settlement" },
    ],
  },
];

const ASSUMPTIONS = [
  "Ngày dữ liệu demo cố định 14/11/2026 để kịch bản trình diễn luôn nhất quán.",
  "Tiến độ = bình quân gia quyền theo giá trị (khối lượng × đơn giá); tiến độ kế hoạch nội suy tuyến tính theo thời gian của từng công việc.",
  "Trạng thái tiến độ dự án theo thời hạn công việc: có việc quá hạn > 14 ngày = chậm tiến độ; quá hạn ≤ 14 ngày hoặc đang làm chậm hơn kế hoạch thời gian (> 15%) = có nguy cơ chậm; còn lại = đúng tiến độ.",
  "Cảnh báo vật tư: tồn < tồn tối thiểu = thiếu hụt; tiêu hao ≥ 90% định mức = sắp vượt; > 100% = vượt định mức.",
  "Giờ máy tính lũy kế từ khi máy được điều động về công trình; hiệu suất = giờ máy thực tế ÷ (số ngày làm việc tại công trình × 8 giờ/ca). Cảnh báo nhiên liệu xét trên ca máy 3 tuần gần nhất (vượt 8% định mức).",
  "Chi phí thực hiện ước tính = giá trị thực hiện × hệ số chi phí của dự án (chưa có phân hệ kế toán chi phí).",
  "Quy trình nghiệm thu: Đang lập → TVGS xác nhận → CĐT ký; thanh toán giữ lại 5% bảo hành – đề xuất mô phỏng, cần xác nhận với ACC.",
  "Hình ảnh hiện trường, tài liệu đính kèm là minh họa; prototype không lưu file thật.",
  "Ma trận phân quyền theo vai trò là đề xuất dựa trên mô hình tổ chức trang 4 của tài liệu.",
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
      <PageHeader title="Hướng dẫn trình diễn" description="5 kịch bản nghiệp vụ xuyên suốt: lập kế hoạch → tổ chức thi công → cung ứng vật tư → điều động thiết bị → nghiệm thu, thanh toán."
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
