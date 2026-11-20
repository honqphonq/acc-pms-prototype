import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tip } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { ProjectStats } from "@/services/selectors";
import { HEALTH } from "@/utils/constants";
import { fmtNumber, fmtPct } from "@/utils/format";
import { useDb } from "@/hooks/useDb";
import { cn } from "@/utils/cn";
import { AssignButton } from "@/components/common/AssignDirective";

/** Thẻ dự án: Giá trị HĐ · Giá trị nghiệm thu · Tiến độ (%) – trạng thái theo thời hạn công việc */
export function ProjectCard({ stats: s, className }: { stats: ProjectStats; className?: string }) {
  const { db } = useDb();
  const unit = db.departments.find((d) => d.id === s.project.unitId)?.code;
  const tone = s.health === "cham_tien_do" ? "danger" : s.health === "nguy_co_cham" ? "warning" : s.health === "chua_bat_dau" ? "navy" : "success";
  const late = s.health === "cham_tien_do" || s.health === "nguy_co_cham";
  return (
    <Link to={`/projects/${s.project.id}`} className={cn("block", className)}>
      <Card className="group h-full p-4 transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="line-clamp-2 min-h-[40px] text-[14px] font-semibold leading-5 text-slate-800 group-hover:text-primary">{s.project.name}</div>
          {late ? <AssignButton className="h-7 shrink-0 px-2" ctx={{ title: `${s.health === "cham_tien_do" ? "Xử lý chậm tiến độ" : "Đôn đốc tiến độ"} – ${s.project.shortName}`, refLabel: `Dự án: ${s.project.shortName}`, link: `/projects/${s.project.id}`, projectId: s.project.id, suggest: [s.project.commanderId] }} /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-primary" />}
        </div>
        <div className="mt-1 text-[11.5px] text-slate-500">{unit} · {s.project.location}</div>
        <div className="mt-3 grid grid-cols-[1fr_1.35fr_0.8fr] gap-2 whitespace-nowrap text-[11px] text-slate-500">
          <div>Giá trị HĐ<div className="tabular text-[13px] font-semibold text-slate-800">{fmtNumber(s.project.contractValue / 1e9, 0)} tỷ</div></div>
          <div>Giá trị nghiệm thu<div className="tabular text-[13px] font-semibold text-slate-800">{fmtNumber(s.acceptedValue / 1e9, 0)} tỷ</div></div>
          <div>Tiến độ<div className="tabular text-[13px] font-semibold text-slate-800">{fmtPct(s.actual, 0)}</div></div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Progress value={s.actual} tone={tone} className="h-1.5 flex-1" />
          <Tip content={s.healthReason}>
            <span><StatusBadge map={HEALTH} value={s.health} dot={false} /></span>
          </Tip>
        </div>
      </Card>
    </Link>
  );
}
