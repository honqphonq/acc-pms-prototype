import { HealthDate, healthState } from "@/components/common/HealthDate";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useDb } from "@/hooks/useDb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tip } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { AttachmentList, SingleFileSlot } from "@/components/common/Attachments";
import { DEMO_TODAY, diffDays } from "@/utils/date";
import { fmtDate, fmtNumber } from "@/utils/format";
import { genId } from "@/utils/id";
import { cn } from "@/utils/cn";
import type { Operator, OperatorLicense } from "@/types";

const lstate = (l: OperatorLicense) => { if (!l.expiry) return "ok"; const d = diffDays(DEMO_TODAY, l.expiry); return d < 0 ? "het_han" : d <= 60 ? "sap_het" : "ok"; };
const lname = (l: OperatorLicense) => (l.kind === "gplx" ? `GPLX ${l.name}${l.military ? " (QS)" : ""}` : l.name.replace(/^Vận hành /, ""));

const YN = (v: boolean) => <span className={v ? "font-medium text-success-fg" : "text-rose-600"}>{v ? "Có" : "Không"}</span>;

/** Bảng con: giấy phép lái xe & chứng chỉ vận hành (nhiều dòng) */
function LicenseEditor({ value, onChange }: { value: OperatorLicense[]; onChange: (v: OperatorLicense[]) => void }) {
  const set = (i: number, c: Partial<OperatorLicense>) => onChange(value.map((x, k) => (k === i ? { ...x, ...c } : x)));
  return (
    <div className="rounded-lg border">
      <table className="w-full text-[13px]">
        <thead className="bg-slate-50 text-left text-[11.5px] font-bold uppercase text-slate-700"><tr><th className="px-2 py-2">Loại</th><th>Hạng / nội dung</th><th>Số</th><th>QS/DS</th><th>Ngày cấp</th><th>Hết hạn</th><th>File</th><th /></tr></thead>
        <tbody>
          {value.map((l, i) => (
            <tr key={l.id} className="border-t align-top">
              <td className="px-2 py-1.5"><Select className="w-32" value={l.kind} onChange={(e) => set(i, { kind: e.target.value as OperatorLicense["kind"] })} options={[{ value: "gplx", label: "GPLX" }, { value: "chung_chi", label: "Chứng chỉ VH" }]} /></td>
              <td className="py-1.5 pr-1"><Input className="h-9 min-w-[140px]" value={l.name} placeholder={l.kind === "gplx" ? "C, FC, E…" : "Vận hành máy lu…"} onChange={(e) => set(i, { name: e.target.value })} /></td>
              <td className="py-1.5 pr-1"><Input className="h-9 w-28" value={l.no} onChange={(e) => set(i, { no: e.target.value })} /></td>
              <td className="py-1.5 pr-1">{l.kind === "gplx" ? <Select className="w-24" value={l.military ? "qs" : "ds"} onChange={(e) => set(i, { military: e.target.value === "qs" })} options={[{ value: "ds", label: "Dân sự" }, { value: "qs", label: "Quân sự" }]} /> : <span className="text-slate-300">—</span>}</td>
              <td className="py-1.5 pr-1"><Input type="date" className="h-9 w-36" value={l.issueDate} onChange={(e) => set(i, { issueDate: e.target.value })} /></td>
              <td className="py-1.5 pr-1"><Input type="date" className="h-9 w-36" value={l.expiry ?? ""} onChange={(e) => set(i, { expiry: e.target.value || null })} /></td>
              <td className="w-28 py-1.5 pr-1"><SingleFileSlot label="" value={l.file} onChange={(f) => set(i, { file: f })} /></td>
              <td className="py-1.5 pr-1"><Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => onChange(value.filter((_, k) => k !== i))}><Trash2 /></Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 border-t p-2">
        <Button size="xs" variant="soft" onClick={() => onChange([...value, { id: genId("lc"), kind: "gplx", no: "", name: "", military: false, issueDate: DEMO_TODAY, expiry: null, file: null }])}><Plus /> Thêm GPLX</Button>
        <Button size="xs" variant="soft" onClick={() => onChange([...value, { id: genId("lc"), kind: "chung_chi", no: "", name: "Vận hành ", military: false, issueDate: DEMO_TODAY, expiry: null, file: null }])}><Plus /> Thêm chứng chỉ vận hành</Button>
      </div>
    </div>
  );
}

/** Lọc nhiều giấy phép / chứng chỉ cùng lúc, tùy chọn chỉ lấy giấy tờ còn hạn */
function LicenseFilter({ all, value, valid, onChange }: { all: string[]; value: string[]; valid: boolean; onChange: (v: string[], valid: boolean) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-10", value.length && "border-primary/50 bg-primary-soft text-primary")}>Giấy phép & chứng chỉ{value.length ? ` (${value.length})` : ""}</Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3 text-[13px]">
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {all.map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-slate-50">
              <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={value.includes(o)} onChange={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o], valid)} />{o}
            </label>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 border-t pt-2"><input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={valid} onChange={(e) => onChange(value, e.target.checked)} />Chỉ lấy giấy tờ còn hạn</label>
        <p className="mt-1 text-[11.5px] text-slate-500">Nhân viên phải có <b>tất cả</b> giấy tờ đã chọn.</p>
        <Button size="xs" variant="ghost" className="mt-1" disabled={!value.length && !valid} onClick={() => onChange([], false)}>Xóa lọc</Button>
      </PopoverContent>
    </Popover>
  );
}

export default function OperatorsPage() {
  const { db } = useDb();
  const [lic, setLic] = useState<string[]>([]);
  const [valid, setValid] = useState(false);
  const allNames = [...new Set(db.operators.flatMap((o) => (o.licenses ?? []).map(lname)))].sort((a, b) => a.localeCompare(b, "vi"));
  const rows = db.operators.filter((o) => !lic.length || lic.every((n) => (o.licenses ?? []).some((l) => lname(l) === n && (!valid || lstate(l) !== "het_han"))));
  return (
    <RegistryPage<Operator>
      title="Nhân viên CMKT" entityLabel="nhân viên CMKT" addLabel="Thêm nhân viên CMKT" codePrefix="CN" collection="operators" rows={rows}
      searchText={(o) => `${o.code} ${o.name} ${(o.licenses ?? []).map(lname).join(" ")}`}
      headerExtra={<LicenseFilter all={allNames} value={lic} valid={valid} onChange={(v, ok) => { setLic(v); setValid(ok); }} />}
      newRecord={() => ({ licenses: [], yearsExp: 1, safetyCard: false, insurance24h: false, salaryCoef: 2.67, workerGrade: "3/7", healthCheck: DEMO_TODAY, note: "" })}
      columns={[
        { key: "n", header: "Họ và tên", sticky: true, sortValue: (o) => o.name, cell: (o) => <span className="whitespace-nowrap font-semibold">{o.name}</span> },
        { key: "code", header: "Mã", sortValue: (o) => o.code, cell: (o) => <span className="whitespace-nowrap text-slate-600">{o.code}</span> },
        { key: "rank", header: "Cấp bậc hiện hưởng", sortValue: (o) => o.rank, cell: (o) => <span className="whitespace-nowrap">{o.rank || "—"}</span> },
        { key: "g", header: "Bậc thợ", sortValue: (o) => o.workerGrade, cell: (o) => <span className="whitespace-nowrap">{o.workerGrade}</span> },
        { key: "y", header: "Số năm KN", align: "right", sortValue: (o) => o.yearsExp, filterValue: (o) => String(o.yearsExp), cell: (o) => o.yearsExp },
        {
          key: "lic", header: "Giấy phép & chứng chỉ", filter: false, cell: (o) => (
            <div className="flex min-w-[260px] max-w-[420px] flex-wrap gap-1">
              {(o.licenses ?? []).map((l) => { const st = lstate(l); return (
                <Tip key={l.id} content={<div>{l.kind === "gplx" ? "Giấy phép lái xe" : "Chứng chỉ vận hành"} {l.name}<div>Số: {l.no || "—"}</div><div>{l.expiry ? `Hết hạn: ${fmtDate(l.expiry)}` : "Không thời hạn"}</div></div>}>
                  <span className={cn("rounded px-1.5 py-0.5 text-[12px] font-medium", st === "het_han" ? "bg-rose-100 text-rose-700" : st === "sap_het" ? "bg-amber-100 text-amber-800" : l.kind === "gplx" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-700")}>{lname(l)}</span>
                </Tip>
              ); })}
              {!(o.licenses ?? []).length && <span className="text-slate-400">Chưa có</span>}
            </div>
          ),
        },
        { key: "id", header: "CCCD / CMQĐ", cell: (o) => <span className="whitespace-nowrap">{o.idNo || "—"}</span> },
        { key: "hd", header: "Hợp đồng lao động", cell: (o) => <span className="whitespace-nowrap">{o.contractType || "—"}</span> },
        { key: "hs", header: "Hệ số lương", align: "right", sortValue: (o) => o.salaryCoef, cell: (o) => fmtNumber(o.salaryCoef, 2) },
        { key: "ksk", header: "Ngày khám SK", sortValue: (o) => o.healthCheck ?? "", filterValue: (o) => ({ late: "Quá hạn", soon: "Sắp đến hạn", ok: "Còn hạn", none: "Chưa có" })[healthState(o.healthCheck)], cell: (o) => <HealthDate date={o.healthCheck} /> },
        { key: "at", header: "Thẻ ATLĐ", align: "center", filterValue: (o) => (o.safetyCard ? "Có" : "Không"), cell: (o) => YN(o.safetyCard) },
        { key: "bh", header: "Thẻ BH TNLĐ", align: "center", filterValue: (o) => (o.insurance24h ? "Có" : "Không"), cell: (o) => YN(o.insurance24h) },
        { key: "hk", header: "Hộ khẩu", cell: (o) => <span className="whitespace-nowrap">{o.hometown || "—"}</span> },
        { key: "p", header: "Điện thoại", cell: (o) => <span className="whitespace-nowrap">{o.phone}</span> },
        { key: "note", header: "Ghi chú", filter: false, cell: (o) => <span className="block max-w-[220px] truncate text-slate-600" title={o.note}>{o.note || "—"}</span> },
      ]}
      fields={[
        { key: "name", label: "Họ và tên", required: true },
        { key: "phone", label: "Số điện thoại" },
        { key: "rank", label: "Cấp bậc hiện hưởng" },
        { key: "contractType", label: "Hợp đồng lao động" },
        { key: "idNo", label: "CCCD / CMQĐ" },
        { key: "hometown", label: "Hộ khẩu thường trú" },
        { key: "workerGrade", label: "Bậc thợ" },
        { key: "salaryCoef", label: "Hệ số lương", type: "number" },
        { key: "yearsExp", label: "Số năm kinh nghiệm", type: "number" },
        { key: "healthCheck", label: "Ngày khám sức khỏe", type: "date" },
        { key: "safetyCard", label: "Thẻ ATLĐ", type: "checkbox" },
        { key: "insurance24h", label: "Thẻ BH TNLĐ", type: "checkbox" },
        { key: "licenses", label: "Giấy phép lái xe & chứng chỉ vận hành", type: "custom", render: (v, set) => <LicenseEditor value={(v as OperatorLicense[]) ?? []} onChange={set} /> },
        { key: "note", label: "Ghi chú", type: "textarea" },
      ]}
      detail={(o) => {
        const eqs = db.equipment.filter((e) => e.operatorId === o.id);
        const shifts = db.equipmentShifts.filter((s) => s.operatorId === o.id && s.logged !== false);
        const projects = [...new Set([...db.equipmentAssignments.filter((a) => a.operatorId === o.id).map((a) => a.toProjectId), ...shifts.map((s) => s.projectId)])].map((p) => db.projects.find((x) => x.id === p)?.shortName).filter(Boolean);
        return (
          <div className="space-y-4">
            <section>
              <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">Giấy phép & chứng chỉ ({(o.licenses ?? []).length})</h4>
              <div className="divide-y rounded-lg border">
                {(o.licenses ?? []).map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-[13px]">
                    <span className="w-48 font-semibold">{l.kind === "gplx" ? `GPLX hạng ${l.name}` : l.name}</span>
                    <span className="text-slate-600">Số {l.no || "—"} · {l.kind === "gplx" ? (l.military ? "Quân sự" : "Dân sự") : "Chứng chỉ"} · cấp {fmtDate(l.issueDate)}</span>
                    <span className={cn("ml-auto font-medium", lstate(l) === "het_han" ? "text-rose-600" : lstate(l) === "sap_het" ? "text-amber-600" : "text-slate-600")}>{l.expiry ? `HH ${fmtDate(l.expiry)}` : "Không thời hạn"}</span>
                    {l.file && <AttachmentList files={[l.file]} />}
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-lg border p-4">
              <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">Quá trình làm việc</h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{projects.length}</div><div className="text-[11px] text-slate-500">Dự án đã làm</div></div>
                <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{shifts.length}</div><div className="text-[11px] text-slate-500">Ca máy (3 tuần)</div></div>
                <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{fmtNumber(shifts.reduce((s, x) => s + x.hours, 0), 1)}</div><div className="text-[11px] text-slate-500">Giờ máy (3 tuần)</div></div>
              </div>
              <p className="mt-3 text-[13px] text-slate-700">Dự án: {projects.join(", ") || "—"}</p>
              <p className="mt-1 text-[13px] text-slate-700">Máy được giao gần nhất: {eqs.map((e) => e.code).join(", ") || "—"}</p>
            </section>
          </div>
        );
      }}
    />
  );
}
