import { HealthDate, healthState } from "@/components/common/HealthDate";
import { useDb } from "@/hooks/useDb";
import { StatusBadge } from "@/components/common/StatusBadge";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { STAFF_STATUS, STAFF_TYPE, projectOptions, toOptions } from "@/utils/labels";
import { AttachmentList } from "@/components/common/Attachments";
import { StaffFiles } from "./StaffFiles";
import type { SiteStaff, StaffDocKey } from "@/types";
import { cn } from "@/utils/cn";

const healthLate = (s: SiteStaff) => healthState(s.healthCheck) === "late";

/** 7 loại giấy tờ nhân sự – tick Có / Không */
export const STAFF_DOCS: { key: StaffDocKey; label: string; short: string }[] = [
  { key: "cccd", label: "CCCD", short: "CCCD" },
  { key: "syll", label: "Sơ yếu lý lịch", short: "SYLL" },
  { key: "ksk", label: "Giấy khám sức khỏe", short: "Khám SK" },
  { key: "the_at", label: "Thẻ an toàn lao động", short: "Thẻ ATLĐ" },
  { key: "hdld", label: "Hợp đồng lao động", short: "HĐLĐ" },
  { key: "chung_chi", label: "Chứng chỉ nghề / hành nghề", short: "Chứng chỉ" },
  { key: "bao_hiem", label: "Bảo hiểm (BHXH / tai nạn)", short: "Bảo hiểm" },
];
type DocState = "co" | "khong" | "het_han";
const docState = (s: SiteStaff, k: StaffDocKey): DocState => (!s.docs?.[k] ? "khong" : k === "ksk" && healthLate(s) ? "het_han" : "co");
const DOC_LABEL: Record<DocState, string> = { co: "Có", khong: "Không", het_han: "Hết hạn" };
const DocCell = ({ v }: { v: DocState }) => <span className={cn("text-[13px]", v === "co" ? "font-medium text-success-fg" : v === "het_han" ? "font-medium text-amber-600" : "text-rose-600")}>{DOC_LABEL[v]}</span>;
const docOptions = [{ value: "co", label: "Có" }, { value: "khong", label: "Không" }];

export default function StaffPage() {
  const { db } = useDb();
  const teams = [...new Set(db.siteStaff.map((s) => s.team))].sort().map((t) => ({ value: t, label: t }));
  return (
    <RegistryPage<SiteStaff>
      title="Nhân sự thi công" entityLabel="nhân sự" addLabel="Thêm nhân sự" codePrefix="NS" collection="siteStaff"
      searchText={(s) => `${s.code} ${s.name} ${s.position} ${s.team} ${s.phone}`}
      filters={[
        { label: "Tất cả dự án", options: projectOptions, test: (s, v) => s.projectId === v, initial: new URLSearchParams(window.location.search).get("project") ?? "p01" },
        { label: "Loại chức danh", options: toOptions(STAFF_TYPE), test: (s, v) => s.type === v },
        { label: "Tổ đội", options: teams, test: (s, v) => s.team === v },
        { label: "Trạng thái", options: toOptions(STAFF_STATUS), test: (s, v) => s.status === v },
        ...STAFF_DOCS.map((d) => ({ label: d.label, options: docOptions, test: (s: SiteStaff, v: string) => (v === "co" ? docState(s, d.key) === "co" : docState(s, d.key) !== "co") })),
      ]}
      inlineFilters={1}
      newRecord={() => ({ projectId: "p01", type: "cong_nhan", status: "dang_lam", joinDate: DEMO_TODAY, safetyCard: false, certificates: "", healthCheck: null, birthYear: 1990, idFront: null, idBack: null, certFiles: [], safetyCardFile: null, healthFile: null, docs: {} })}
      rowClassName={(s) => (s.status === "da_nghi" ? "opacity-60" : undefined)}
      columns={[
        { key: "n", header: "Họ và tên", sticky: true, sortValue: (s) => s.name, cell: (s) => <span className="whitespace-nowrap font-medium text-slate-800">{s.name}</span> },
        { key: "code", header: "Mã", sortValue: (s) => s.code, cell: (s) => <span className="whitespace-nowrap text-slate-600">{s.code}</span> },
        { key: "ph", header: "Điện thoại", cell: (s) => <span className="whitespace-nowrap">{s.phone}</span> },
        { key: "t", header: "Loại chức danh", sortValue: (s) => s.type, filterValue: (s) => STAFF_TYPE[s.type]?.label ?? s.type, cell: (s) => <StatusBadge map={STAFF_TYPE} value={s.type} dot={false} /> },
        { key: "p", header: "Chức danh", cell: (s) => <span className="whitespace-nowrap">{s.position}</span> },
        { key: "team", header: "Tổ đội", sortValue: (s) => s.team, cell: (s) => <span className="whitespace-nowrap">{s.team}</span> },
        { key: "j", header: "Ngày vào", sortValue: (s) => s.joinDate, cell: (s) => <span className="whitespace-nowrap">{fmtDate(s.joinDate)}</span> },
        { key: "s", header: "Trạng thái", filterValue: (s) => STAFF_STATUS[s.status]?.label ?? s.status, cell: (s) => <StatusBadge map={STAFF_STATUS} value={s.status} /> },
        ...STAFF_DOCS.map((d) => ({ key: "doc-" + d.key, header: d.short, align: "center" as const, filterValue: (s: SiteStaff) => DOC_LABEL[docState(s, d.key)], cell: (s: SiteStaff) => <DocCell v={docState(s, d.key)} /> })),
        { key: "ksk-date", header: "Ngày khám SK", sortValue: (s) => s.healthCheck ?? "", filterValue: (s) => ({ late: "Quá hạn", soon: "Sắp đến hạn", ok: "Còn hạn", none: "Chưa có" })[healthState(s.healthCheck)], cell: (s) => <HealthDate date={s.healthCheck} /> },
        { key: "sum", header: "Hồ sơ đã nộp", filter: false, cell: (s) => <span className="block max-w-[260px] truncate text-[12.5px] text-slate-600" title={STAFF_DOCS.filter((d) => s.docs?.[d.key]).map((d) => d.short).join(", ")}>{STAFF_DOCS.filter((d) => s.docs?.[d.key]).map((d) => d.short).join(", ") || "—"}</span> },
      ]}
      detail={(s) => (
        <section className="space-y-3">
          <h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">Giấy tờ đã nộp</h4>
          <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">{STAFF_DOCS.map((d) => <div key={d.key} className="flex justify-between border-b border-dashed py-1 text-[13px]"><span className="text-slate-600">{d.label}</span><DocCell v={docState(s, d.key)} /></div>)}</div>
          <h4 className="pt-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">File đính kèm</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {([["CCCD mặt trước", s.idFront], ["CCCD mặt sau", s.idBack], ["Thẻ an toàn lao động", s.safetyCardFile], ["Giấy khám sức khỏe", s.healthFile]] as const).map(([l, f]) => <div key={l}><div className="mb-1 text-[12px] text-slate-500">{l}</div><AttachmentList files={f ? [f] : []} empty="Chưa có" /></div>)}
          </div>
          <div><div className="mb-1 text-[12px] text-slate-500">Chứng chỉ / bằng cấp</div><AttachmentList files={s.certFiles ?? []} empty="Chưa có" /></div>
        </section>
      )}
      fields={[
        { key: "name", label: "Họ và tên", required: true },
        { key: "projectId", label: "Dự án", type: "select", options: projectOptions, required: true },
        { key: "type", label: "Loại chức danh", type: "select", options: toOptions(STAFF_TYPE) },
        { key: "position", label: "Chức danh" },
        { key: "team", label: "Tổ đội" },
        { key: "phone", label: "Số điện thoại" },
        { key: "idNo", label: "Số CCCD" },
        { key: "birthYear", label: "Năm sinh", type: "number" },
        { key: "hometown", label: "Quê quán" },
        { key: "joinDate", label: "Ngày vào công trường", type: "date" },
        { key: "certificates", label: "Chứng chỉ / bằng cấp (tên)" },
        { key: "healthCheck", label: "Ngày khám sức khỏe gần nhất", type: "date" },
        { key: "docs", label: "Giấy tờ đã nộp", type: "custom", hideInDetail: true, render: (v, set) => { const d = (v ?? {}) as Partial<Record<StaffDocKey, boolean>>; return <div className="grid gap-x-4 gap-y-1.5 rounded-md border p-3 sm:grid-cols-2">{STAFF_DOCS.map((x) => <label key={x.key} className="flex cursor-pointer items-center gap-2 text-[13px]"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={!!d[x.key]} onChange={(e) => set({ ...d, [x.key]: e.target.checked })} />{x.label}</label>)}</div>; } },
        { key: "idFront", label: "Hồ sơ đính kèm", type: "custom", render: (_v, _set, row, patch) => <StaffFiles row={row as unknown as SiteStaff} patch={patch} />, hideInDetail: true },
        { key: "status", label: "Trạng thái", type: "select", options: toOptions(STAFF_STATUS) },
      ]}
    />
  );
}
