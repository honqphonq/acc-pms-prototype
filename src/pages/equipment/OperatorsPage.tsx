import { useDb } from "@/hooks/useDb";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { DEMO_TODAY, diffDays } from "@/utils/date";
import { fmtDate, fmtNumber } from "@/utils/format";
import type { Operator } from "@/types";

const licenseState = (o: Operator) => { const d = diffDays(DEMO_TODAY, o.licenseExpiry); return d < 0 ? "het_han" : d <= 60 ? "sap_het" : "ok"; };

export default function OperatorsPage() {
  const { db } = useDb();
  const work = (id: string) => {
    const eqs = db.equipment.filter((e) => e.operatorId === id);
    const shifts = db.equipmentShifts.filter((s) => s.operatorId === id);
    const projects = new Set([...db.equipmentAssignments.filter((a) => a.operatorId === id).map((a) => a.toProjectId), ...shifts.map((s) => s.projectId)]);
    return { eqs, shifts, hours: shifts.reduce((s, x) => s + x.hours, 0), projects: [...projects].map((p) => db.projects.find((x) => x.id === p)?.shortName).filter(Boolean) };
  };
  const skills = [...new Set(db.operators.map((o) => o.skill))].map((s) => ({ value: s, label: s }));
  return (
    <RegistryPage<Operator>
      title="Nhân viên CMKT" entityLabel="nhân viên CMKT" addLabel="Thêm nhân viên CMKT" codePrefix="CN" collection="operators"
      description="Hồ sơ lái xe, lái máy, nhân viên chuyên môn kỹ thuật: giấy phép, chứng chỉ, bậc thợ, quá trình làm việc và đánh giá hiệu suất."
      searchText={(o) => `${o.code} ${o.name} ${o.skill} ${o.licenseClass}`}
      filters={[
        { label: "Tất cả chứng chỉ vận hành", options: skills, test: (o, v) => o.skill === v },
        { label: "Tất cả loại GPLX", options: [{ value: "Quân sự", label: "GPLX quân sự" }, { value: "Dân sự", label: "GPLX dân sự" }], test: (o, v) => o.licenseType === v },
        { label: "Kinh nghiệm", options: [{ value: "5", label: "≥ 5 năm" }, { value: "10", label: "≥ 10 năm" }], test: (o, v) => o.yearsExp >= Number(v) },
      ]}
      kpis={(rows) => [
        { label: "Nhân viên CMKT", value: rows.length, tone: "navy", sub: `${db.equipment.filter((e) => e.operatorId).length} máy đã giao người vận hành` },
        { label: "GPLX / chứng chỉ sắp hết hạn", value: rows.filter((o) => licenseState(o) === "sap_het").length, tone: "warning", sub: "Trong 60 ngày tới" },
        { label: "GPLX đã hết hạn", value: rows.filter((o) => licenseState(o) === "het_han").length, tone: "danger" },
        { label: "Hiệu suất bình quân", value: `${Math.round(rows.reduce((s, o) => s + o.score, 0) / Math.max(1, rows.length))}/100`, tone: "success" },
      ]}
      newRecord={() => ({ licenseType: "Dân sự", licenseExpiry: DEMO_TODAY, score: 80, violations: 0, yearsExp: 1, safetyCard: true, insurance24h: true, salaryCoef: 2.67, workerGrade: "3/7" })}
      columns={[
        { key: "n", header: "Họ và tên", sortValue: (o) => o.name, cell: (o) => <div><div className="font-medium text-slate-800">{o.name}</div><div className="text-[11px] text-slate-400">{o.code} · {o.rank}</div></div> },
        { key: "s", header: "Chứng chỉ vận hành", cell: (o) => <div className="text-xs"><div>{o.skill}</div><div className="text-slate-400">Bậc {o.workerGrade} · {o.yearsExp} năm KN</div></div> },
        { key: "l", header: "Giấy phép lái xe", sortValue: (o) => o.licenseExpiry, cell: (o) => { const st = licenseState(o); return <div className="text-xs"><div>Hạng {o.licenseClass} · {o.licenseType}</div><div className={st === "het_han" ? "font-semibold text-rose-600" : st === "sap_het" ? "font-semibold text-amber-600" : "text-slate-400"}>HH {fmtDate(o.licenseExpiry)}{st === "het_han" ? " – đã hết hạn" : st === "sap_het" ? " – sắp hết hạn" : ""}</div></div>; } },
        { key: "e", header: "Đang vận hành", cell: (o) => { const w = work(o.id); return w.eqs.length ? <div className="text-xs">{w.eqs.map((e) => <div key={e.id}>{e.code}</div>)}<div className="text-slate-400">{db.projects.find((p) => p.id === w.eqs[0].currentProjectId)?.shortName}</div></div> : <span className="text-xs text-slate-400">Chưa giao máy</span>; } },
        { key: "at", header: "ATVSLĐ", cell: (o) => <div className="flex flex-wrap gap-1">{o.safetyCard ? <Badge tone="success">Thẻ AT</Badge> : <Badge tone="danger">Thiếu thẻ AT</Badge>}{!o.insurance24h && <Badge tone="warning">Thiếu BH 24h</Badge>}</div> },
        { key: "sc", header: "Hiệu suất", sortValue: (o) => o.score, cell: (o) => <div className="w-28"><div className="mb-1 text-[11.5px]">{o.score}/100{o.violations ? <span className="text-rose-600"> · {o.violations} vi phạm</span> : ""}</div><Progress value={o.score / 100} tone={o.score >= 85 ? "success" : o.score >= 75 ? "info" : "warning"} className="h-1.5" /></div> },
      ]}
      fields={[
        { key: "name", label: "Họ và tên", required: true },
        { key: "phone", label: "Số điện thoại" },
        { key: "rank", label: "Cấp bậc hiện hưởng" },
        { key: "contractType", label: "Hợp đồng lao động" },
        { key: "idNo", label: "CCCD / CMQĐ" },
        { key: "hometown", label: "Hộ khẩu thường trú" },
        { key: "licenseNo", label: "Số giấy phép lái xe" },
        { key: "licenseClass", label: "Hạng GPLX" },
        { key: "licenseType", label: "Loại GPLX", type: "select", options: [{ value: "Quân sự", label: "Quân sự" }, { value: "Dân sự", label: "Dân sự" }] },
        { key: "licenseExpiry", label: "Ngày hết hạn GPLX", type: "date" },
        { key: "skill", label: "Chứng chỉ vận hành (trạm, máy rải...)" },
        { key: "workerGrade", label: "Bậc thợ" },
        { key: "salaryCoef", label: "Hệ số lương", type: "number" },
        { key: "yearsExp", label: "Số năm kinh nghiệm", type: "number" },
        { key: "healthCheck", label: "Ngày khám sức khỏe", type: "date" },
        { key: "safetyCard", label: "Thẻ an toàn lao động", type: "checkbox" },
        { key: "insurance24h", label: "Bảo hiểm TNLĐ 24h", type: "checkbox" },
        { key: "score", label: "Điểm hiệu suất (0–100)", type: "number" },
        { key: "violations", label: "Số lần vi phạm", type: "number" },
        { key: "note", label: "Ghi chú", type: "textarea" },
      ]}
      detail={(o) => {
        const w = work(o.id);
        return (
          <section className="rounded-lg border p-4">
            <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Quá trình làm việc & hiệu suất</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{w.projects.length}</div><div className="text-[11px] text-slate-500">Công trình đã làm</div></div>
              <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{w.shifts.length}</div><div className="text-[11px] text-slate-500">Ca máy (3 tuần)</div></div>
              <div className="rounded-lg bg-slate-50 p-2"><div className="text-lg font-bold">{fmtNumber(w.hours, 1)}</div><div className="text-[11px] text-slate-500">Giờ máy (3 tuần)</div></div>
            </div>
            <p className="mt-3 text-xs text-slate-600">Công trình: {w.projects.join(", ") || "—"}</p>
            <p className="mt-1 text-xs text-slate-500">Điểm hiệu suất được hệ thống tính từ: đủ thời gian làm việc theo ca, mức tiêu hao nhiên liệu so với định mức, số lần vi phạm và sự cố liên quan.</p>
          </section>
        );
      }}
    />
  );
}
