import { useLocation, useNavigate } from "react-router-dom";
import { Calculator, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";

const INFO: Record<string, { title: string; items: string[] }> = {
  estimate: { title: "Dự toán thi công", items: ["Lập dự toán thi công theo hạng mục, công việc", "Định mức vật tư, nhân công, ca máy từ dự toán", "Liên kết định mức với đề xuất vật tư và tồn kho"] },
  costs: { title: "Chi phí tập hợp", items: ["Tập hợp chi phí vật tư, nhân công, ca máy, chi phí chung theo công trình", "So sánh chi phí thực tế với dự toán", "Cảnh báo vượt chi phí"] },
  payments: { title: "Hồ sơ thanh toán với Chủ đầu tư", items: ["Lập hồ sơ thanh toán từ khối lượng đã nghiệm thu", "Theo dõi trình, duyệt, thanh toán và giữ lại bảo hành", "Thu hồi tạm ứng"] },
  value: { title: "Giá trị khối lượng thi công", items: ["Giá trị thực hiện theo kỳ từ khối lượng cập nhật tại công trường", "Đối chiếu khối lượng thực hiện – nghiệm thu – thanh toán", "Báo cáo sản lượng theo đơn vị, công trình"] },
  debts: { title: "Công nợ thầu phụ, nhà cung cấp", items: ["Công nợ phải trả nhà cung cấp vật tư, thầu phụ", "Lịch thanh toán, tuổi nợ", "Đối chiếu công nợ định kỳ"] },
};

/** Phân hệ tài chính kế toán sẽ triển khai ở phiên bản tiếp theo */
export default function ComingSoonPage() {
  const key = useLocation().pathname.split("/").pop() ?? "";
  const navigate = useNavigate();
  const info = INFO[key] ?? { title: "Tài chính kế toán", items: [] };
  return (
    <div>
      <PageHeader title={info.title} description="Phân hệ Tài chính kế toán – đang hoàn thiện, sẽ triển khai ở phiên bản tiếp theo của prototype." />
      <Card className="flex flex-col items-center px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Calculator className="h-7 w-7" /></span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Chức năng sắp có</h2>
        <p className="mt-1 max-w-lg text-sm text-slate-500">Các nghiệp vụ dự kiến của màn hình này:</p>
        <ul className="mt-4 space-y-2 text-left text-[13.5px] text-slate-700">{info.items.map((i) => <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{i}</li>)}</ul>
        <div className="mt-6 flex gap-2"><Button variant="outline" onClick={() => navigate("/materials/stock")}>Quản lý vật tư</Button><Button variant="outline" onClick={() => navigate("/materials/inventory")}>Tồn kho và kiểm kê</Button></div>
      </Card>
    </div>
  );
}
