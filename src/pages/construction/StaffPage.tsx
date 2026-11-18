import { useDb } from "@/hooks/useDb";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { DEMO_TODAY, diffDays } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { STAFF_STATUS, STAFF_TYPE, projectOptions, toOptions } from "@/utils/labels";
import type { SiteStaff } from "@/types";

const healthLate = (s: SiteStaff) => !s.healthCheck || diffDays(s.healthCheck, DEMO_TODAY) > 365;

export default function StaffPage() {
  const { db } = useDb();
  const teams = [...new Set(db.siteStaff.map((s) => s.team))].sort().map((t) => ({ value: t, label: t }));
  return (
    <RegistryPage<SiteStaff>
      title="Nhân sự thi công" entityLabel="nhân sự" addLabel="Thêm nhân sự" codePrefix="NS" collection="siteStaff"
      description="Danh sách chỉ huy, cán bộ kỹ thuật, công nhân và lao động phổ thông tại công trường; hồ sơ nhân sự và các yêu cầu ATVSLĐ."
      searchText={(s) => `${s.code} ${s.name} ${s.position} ${s.team} ${s.phone}`}
      filters={[
        { label: "Tất cả công trình", options: projectOptions, test: (s, v) => s.projectId === v, initial: "p01" },
        { label: "Tất cả loại nhân sự", options: toOptions(STAFF_TYPE), test: (s, v) => s.type === v },
        { label: "Tất cả tổ đội", options: teams, test: (s, v) => s.team === v },
      ]}
      kpis={(rows) => {
        const r = rows.filter((x) => x.projectId === "p01" && x.status === "dang_lam");
        return [
          { label: "Nhân sự đang làm việc (SB Gia Bình)", value: r.length, tone: "navy", sub: `${r.filter((x) => x.type === "chi_huy" || x.type === "can_bo_ky_thuat").length} chỉ huy & cán bộ kỹ thuật` },
          { label: "Công nhân / lao động phổ thông", value: `${r.filter((x) => x.type === "cong_nhan").length} / ${r.filter((x) => x.type === "lao_dong_pho_thong").length}`, tone: "info" },
          { label: "Chưa có thẻ an toàn", value: r.filter((x) => !x.safetyCard).length, tone: "danger", sub: "Yêu cầu ATVSLĐ" },
          { label: "Quá hạn khám sức khỏe", value: r.filter(healthLate).length, tone: "warning", sub: "Khám định kỳ 12 tháng" },
        ];
      }}
      newRecord={() => ({ projectId: "p01", type: "cong_nhan", status: "dang_lam", joinDate: DEMO_TODAY, safetyCard: false, certificates: "", healthCheck: null, birthYear: 1990 })}
      rowClassName={(s) => (s.status === "da_nghi" ? "opacity-60" : undefined)}
      columns={[
        { key: "n", header: "Họ và tên", sortValue: (s) => s.name, cell: (s) => <div><div className="font-medium text-slate-800">{s.name}</div><div className="text-[11px] text-slate-400">{s.code} · {s.phone}</div></div> },
        { key: "t", header: "Loại", sortValue: (s) => s.type, cell: (s) => <StatusBadge map={STAFF_TYPE} value={s.type} dot={false} /> },
        { key: "p", header: "Chức danh / nghề", cell: (s) => <span className="text-xs">{s.position}</span> },
        { key: "team", header: "Tổ đội", sortValue: (s) => s.team, cell: (s) => <span className="whitespace-nowrap text-xs">{s.team}</span> },
        { key: "j", header: "Ngày vào", sortValue: (s) => s.joinDate, cell: (s) => <span className="text-xs">{fmtDate(s.joinDate)}</span> },
        { key: "at", header: "ATVSLĐ", cell: (s) => <div className="flex flex-wrap gap-1">{s.safetyCard ? <Badge tone="success">Thẻ AT</Badge> : <Badge tone="danger">Thiếu thẻ AT</Badge>}{healthLate(s) && <Badge tone="warning">Quá hạn KSK</Badge>}</div> },
        { key: "s", header: "Trạng thái", cell: (s) => <StatusBadge map={STAFF_STATUS} value={s.status} /> },
      ]}
      fields={[
        { key: "name", label: "Họ và tên", required: true },
        { key: "projectId", label: "Công trình", type: "select", options: projectOptions, required: true },
        { key: "type", label: "Loại nhân sự", type: "select", options: toOptions(STAFF_TYPE) },
        { key: "position", label: "Chức danh / nghề nghiệp" },
        { key: "team", label: "Tổ đội" },
        { key: "phone", label: "Số điện thoại" },
        { key: "idNo", label: "Số CCCD" },
        { key: "birthYear", label: "Năm sinh", type: "number" },
        { key: "hometown", label: "Quê quán" },
        { key: "joinDate", label: "Ngày vào công trường", type: "date" },
        { key: "certificates", label: "Chứng chỉ / bằng cấp" },
        { key: "healthCheck", label: "Ngày khám sức khỏe gần nhất", type: "date" },
        { key: "safetyCard", label: "Thẻ an toàn lao động", type: "checkbox" },
        { key: "status", label: "Trạng thái", type: "select", options: toOptions(STAFF_STATUS) },
      ]}
    />
  );
}
