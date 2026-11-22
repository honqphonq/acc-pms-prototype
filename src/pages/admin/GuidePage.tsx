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
    no: 1, title: "Ban lãnh đạo giám sát dự án", role: "lanh_dao", userId: "u01", goal: "Nắm tình hình các dự án, phát hiện dự án/hạng mục chậm tiến độ và các cảnh báo.",
    steps: [
      { text: "Mở Trang chủ – xem chỉ số tổng hợp, tỷ lệ đúng / nguy cơ / chậm tiến độ, tình trạng máy móc thiết bị", to: "/" },
      { text: "Mở dự án Sân bay Gia Bình (Chậm tiến độ – BTXM M150 lòng đường CHC zone R4B quá hạn 17 ngày)", to: "/projects/p01" },
      { text: "Xem Tiến độ thi công dạng Gantt theo mẫu tiến độ tổng thể: thanh tổng hợp, liên kết công việc, đường “Hôm nay”", to: "/construction/plan/p01" },
      { text: "Bấm công việc [39] để xem chi tiết, liên kết công việc liền trước / kế tiếp và lịch sử nhật ký", to: "/construction/plan/p01/task/t-p01-039" },
    ],
  },
  {
    no: 2, title: "Cập nhật tiến độ thi công", role: "to_truong", userId: "u08", goal: "Tổ trưởng cập nhật khối lượng thực hiện, ảnh hiện trường; tiến độ tự động tính lại trên Gantt và Trang chủ.",
    steps: [
      { text: "Mở Tiến độ thi công SB Gia Bình → hạng mục B. Kết cấu đường cất hạ cánh → Lòng đường CHC zone R2", to: "/construction/plan/p01" },
      { text: "Mở công việc [10] Thi công BTXM M350/45 dày 40cm (đang 88%)", to: "/construction/plan/p01/task/t-p01-010" },
      { text: "Nhập 600 m³ thực hiện trong ngày, nội dung, nhân công, ảnh hiện trường → Lưu: lũy kế 88% → 91,7%; lịch sử cập nhật theo ngày sửa / xóa được" },
      { text: "Đổi vai trò Chỉ huy trưởng → đánh giá chất lượng / nghiệm thu nội bộ công việc ngay trên màn hình chi tiết" },
      { text: "Quay lại Gantt: thanh công việc, nhóm và tổng tiến độ được tính lại", to: "/construction/plan/p01" },
    ],
  },
  {
    no: 3, title: "Quản lý vật tư vật liệu", role: "bp_vat_tu", userId: "u10", goal: "Mỗi dự án là một kho: tồn kho, định mức, cảnh báo sắp hết → đề xuất → nhập / xuất kho (phiếu nhiều dòng) → kiểm kê.",
    steps: [
      { text: "Quản lý vật tư vật liệu → chọn kho Sân bay Gia Bình: BTN C19, matit dưới tồn tối thiểu; nilon sắp hết", to: "/materials/stock/p01" },
      { text: "Bấm “Đề xuất mua” ở dòng BTN C19: gợi ý vật tư kèm định mức, tồn kho, đơn giá → Gửi" },
      { text: "CHT phê duyệt đề xuất “BTN C19 rải thảm lề CHC zone R2”", to: "/materials/stock/p01?tab=de_xuat" },
      { text: "Tab Phiếu nhập: mở phiếu chờ xác nhận, đối chiếu chứng từ (lệch 12 tấn) → Xác nhận nhập kho", to: "/materials/stock/p01?tab=nhap" },
      { text: "Thao tác ▾ → Xuất kho / Điều chuyển kho (phiếu nhiều dòng); bấm một vật tư để xem thẻ kho" },
      { text: "Thao tác ▾ → Kiểm kê: ghi nhận chênh lệch, điều chỉnh tồn kho" },
    ],
  },
  {
    no: 4, title: "Quản lý xe máy thiết bị", role: "phong_thiet_bi", userId: "u12", goal: "Danh mục XMTB có hình ảnh, điều động về dự án, phân ca – nhật trình, bảo dưỡng và cảnh báo hồ sơ.",
    steps: [
      { text: "Danh mục XMTB: lọc ô tô / xe biển đỏ / máy thiết bị, nguồn gốc sở hữu / thuê ngoài; mở máy rải bê tông xem hình ảnh", to: "/equipment/list" },
      { text: "Điều động XMTB ngay trên Danh mục XMTB (một hoặc nhiều máy, có hiệu lực ngay); thu hồi về kho TCT", to: "/equipment/list" },
      { text: "Phân ca và nhật trình: xếp nhân viên CMKT cho từng ca, nhập nhật trình cuối ca (giờ máy, km, nhiên liệu)", to: "/equipment/shifts" },
      { text: "Bảo dưỡng: khối Cảnh báo XMTB – đến hạn bảo dưỡng, hết hạn kiểm định / bảo hiểm, thiếu CM chủ sở hữu", to: "/equipment/maintenance" },
      { text: "Nhân viên CMKT: lọc theo giấy phép & chứng chỉ còn hạn", to: "/equipment/operators" },
    ],
  },
  {
    no: 5, title: "Phương án, hồ sơ & nhân sự thi công", role: "phong_ktkt", userId: "u03", goal: "Góp ý, điều chỉnh phương án tổ chức thi công; quản lý hồ sơ thi công nhiều cấp và nhân sự công trường.",
    steps: [
      { text: "Phương án tổ chức thi công SB Gia Bình: mở “Biện pháp thi công BTXM M350…” → góp ý → phê duyệt", to: "/construction/methods" },
      { text: "Điều chỉnh phương án → hệ thống tạo phiên bản mới, lưu lịch sử phiên bản" },
      { text: "Hồ sơ thi công: thư mục nhiều cấp (bản vẽ, thí nghiệm, nghiệm thu, ATVSLĐ); tải lên, cập nhật phiên bản", to: "/construction/documents" },
      { text: "Nhân sự thi công: lọc theo tổ đội, cảnh báo thiếu thẻ an toàn / quá hạn khám sức khỏe", to: "/construction/staff" },
    ],
  },
];

const ASSUMPTIONS = [
  "Ngày dữ liệu demo cố định 14/11/2026 để kịch bản trình diễn luôn nhất quán.",
  "Dự án Sân bay Gia Bình dùng tiến độ thi công chi tiết thật (100 dòng, 28/04/2026 – 25/04/2027); khối lượng thực hiện, đơn giá là giả lập. Các dự án khác là dữ liệu minh họa rút gọn.",
  "Phân hệ Tài chính kế toán (dự toán, chi phí, thanh toán CĐT, giá trị khối lượng, công nợ) sẽ triển khai ở phiên bản tiếp theo.",
  "File đính kèm (ảnh, PDF) được lưu ngay trên trình duyệt để xem trước; prototype không có máy chủ lưu file.",
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
