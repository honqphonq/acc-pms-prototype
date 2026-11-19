import { useDb } from "@/hooks/useDb";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { DEMO_TODAY, diffDays } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { STAFF_STATUS, STAFF_TYPE, projectOptions, toOptions } from "@/utils/labels";
import { Tip } from "@/components/ui/tooltip";
import { FileCheck2, FileWarning } from "lucide-react";
import { AttachmentList } from "@/components/common/Attachments";
import { StaffFiles } from "./StaffFiles";
import type { SiteStaff } from "@/types";

const healthLate = (s: SiteStaff) => !s.healthCheck || diffDays(s.healthCheck, DEMO_TODAY) > 365;
const hasSafety = (s: SiteStaff) => !!s.safetyCardFile || (s.safetyCard && s.safetyCardFile === undefined);
const missingDocs = (s: SiteStaff) => [!(s.idFront && s.idBack) && "CCCD 2 mặt", !s.certFiles?.length && s.type !== "lao_dong_pho_thong" && "Chứng chỉ", !hasSafety(s) && "Thẻ ATLĐ", !s.healthFile && "Giấy KSK"].filter(Boolean) as string[];

export default function StaffPage() {
  const { db } = useDb();
  const teams = [...new Set(db.siteStaff.map((s) => s.team))].sort().map((t) => ({ value: t, label: t }));
  return (
    <RegistryPage<SiteStaff>
      title="Nhân sự thi công" entityLabel="nhân sự" addLabel="Thêm nhân sự" codePrefix="NS" collection="siteStaff"
      description="Danh sách chỉ huy, cán bộ kỹ thuật, công nhân và lao động phổ thông tại công trường; hồ sơ nhân sự và các yêu cầu ATVSLĐ."
      searchText={(s) => `${s.code} ${s.name} ${s.position} ${s.team} ${s.phone}`}
      filters={[
        { label: "Tất cả dự án", options: projectOptions, test: (s, v) => s.projectId === v, initial: new URLSearchParams(window.location.search).get("project") ?? "p01" },
        { label: "Tất cả loại nhân sự", options: toOptions(STAFF_TYPE), test: (s, v) => s.type === v },
        { label: "Tất cả tổ đội", options: teams, test: (s, v) => s.team === v },
      ]}
      kpis={(rows) => {
        const r = rows.filter((x) => x.projectId === "p01" && x.status === "dang_lam");
        return [
          { label: "Nhân sự đang làm việc (SB Gia Bình)", value: r.length, tone: "navy", sub: `${r.filter((x) => x.type === "chi_huy" || x.type === "can_bo_ky_thuat").length} chỉ huy & cán bộ kỹ thuật` },
          { label: "Công nhân / lao động phổ thông", value: `${r.filter((x) => x.type === "cong_nhan").length} / ${r.filter((x) => x.type === "lao_dong_pho_thong").length}`, tone: "info" },
          { label: "Chưa có thẻ an toàn", value: r.filter((x) => !hasSafety(x)).length, tone: "danger", sub: "Yêu cầu ATVSLĐ" },
          { label: "Quá hạn khám sức khỏe", value: r.filter(healthLate).length, tone: "warning", sub: "Khám định kỳ 12 tháng" },
        ];
      }}
      newRecord={() => ({ projectId: "p01", type: "cong_nhan", status: "dang_lam", joinDate: DEMO_TODAY, safetyCard: false, certificates: "", healthCheck: null, birthYear: 1990, idFront: null, idBack: null, certFiles: [], safetyCardFile: null, healthFile: null })}
      rowClassName={(s) => (s.status === "da_nghi" ? "opacity-60" : undefined)}
      columns={[
        { key: "n", header: "Họ và tên", sortValue: (s) => s.name, cell: (s) => <div><div className="font-medium text-slate-800">{s.name}</div><div className="text-[11px] text-slate-400">{s.code} · {s.phone}</div></div> },
        { key: "t", header: "Loại", sortValue: (s) => s.type, cell: (s) => <StatusBadge map={STAFF_TYPE} value={s.type} dot={false} /> },
        { key: "p", header: "Chức danh / nghề", cell: (s) => <span className="text-xs">{s.position}</span> },
        { key: "team", header: "Tổ đội", sortValue: (s) => s.team, cell: (s) => <span className="whitespace-nowrap text-xs">{s.team}</span> },
        { key: "j", header: "Ngày vào", sortValue: (s) => s.joinDate, cell: (s) => <span className="text-xs">{fmtDate(s.joinDate)}</span> },
        { key: "at", header: "ATVSLĐ", filterValue: (s) => (hasSafety(s) ? "Có thẻ AT" : "Thiếu thẻ AT"), cell: (s) => <div className="flex flex-wrap gap-1">{hasSafety(s) ? <Badge tone="success">Thẻ AT</Badge> : <Badge tone="danger">Thiếu thẻ AT</Badge>}{healthLate(s) && <Badge tone="warning">Quá hạn KSK</Badge>}</div> },
        { key: "doc", header: "Hồ sơ", filterValue: (s) => (missingDocs(s).length ? "Còn thiếu" : "Đủ hồ sơ"), cell: (s) => { const m = missingDocs(s); return <Tip content={m.length ? `Còn thiếu: ${m.join(", ")}` : "Đủ CCCD 2 mặt, chứng chỉ, thẻ ATLĐ, giấy KSK"}><span className={m.length ? "inline-flex items-center gap-1 text-[12.5px] font-medium text-amber-700" : "inline-flex items-center gap-1 text-[12.5px] font-medium text-success-fg"}>{m.length ? <FileWarning className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}{m.length ? `Thiếu ${m.length}` : "Đủ"}</span></Tip>; } },
        { key: "s", header: "Trạng thái", cell: (s) => <StatusBadge map={STAFF_STATUS} value={s.status} /> },
      ]}
      detail={(s) => (
        <section className="space-y-3">
          <h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">Hồ sơ đính kèm</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {([["CCCD mặt trước", s.idFront], ["CCCD mặt sau", s.idBack], ["Thẻ an toàn lao động", s.safetyCardFile], ["Giấy khám sức khỏe", s.healthFile]] as const).map(([l, f]) => <div key={l}><div className="mb-1 text-[12px] text-slate-500">{l}</div><AttachmentList files={f ? [f] : []} empty="Chưa có" /></div>)}
          </div>
          <div><div className="mb-1 text-[12px] text-slate-500">Chứng chỉ / bằng cấp</div><AttachmentList files={s.certFiles ?? []} empty="Chưa có" /></div>
        </section>
      )}
      fields={[
        { key: "name", label: "Họ và tên", required: true },
        { key: "projectId", label: "Dự án", type: "select", options: projectOptions, required: true },
        { key: "type", label: "Loại nhân sự", type: "select", options: toOptions(STAFF_TYPE) },
        { key: "position", label: "Chức danh / nghề nghiệp" },
        { key: "team", label: "Tổ đội" },
        { key: "phone", label: "Số điện thoại" },
        { key: "idNo", label: "Số CCCD" },
        { key: "birthYear", label: "Năm sinh", type: "number" },
        { key: "hometown", label: "Quê quán" },
        { key: "joinDate", label: "Ngày vào công trường", type: "date" },
        { key: "certificates", label: "Chứng chỉ / bằng cấp (tên)" },
        { key: "healthCheck", label: "Ngày khám sức khỏe gần nhất", type: "date" },
        { key: "idFront", label: "Hồ sơ đính kèm", type: "custom", render: (_v, _set, row, patch) => <StaffFiles row={row as unknown as SiteStaff} patch={patch} />, hideInDetail: true },
        { key: "status", label: "Trạng thái", type: "select", options: toOptions(STAFF_STATUS) },
      ]}
    />
  );
}
