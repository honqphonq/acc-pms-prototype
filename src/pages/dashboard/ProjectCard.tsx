import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/common/StatusBadge";
import type { ProjectStats } from "@/services/selectors";
import { HEALTH } from "@/utils/constants";
import { fmtNumber, fmtPct } from "@/utils/format";
import { useDb } from "@/hooks/useDb";

export function ProjectCard({ stats: s }: { stats: ProjectStats }) {
  const { db } = useDb();
  const unit = db.departments.find((d) => d.id === s.project.unitId)?.code;
  const tone = s.health === "cham_tien_do" ? "danger" : s.health === "nguy_co_cham" ? "warning" : s.health === "chua_bat_dau" ? "navy" : "success";
  return (
    <Link to={`/projects/${s.project.id}`}>
      <Card className="group h-full p-4 transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="line-clamp-2 min-h-[40px] text-[14px] font-semibold leading-5 text-slate-800 group-hover:text-primary">{s.project.name}</div>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 group-hover:text-primary" />
        </div>
        <div className="mt-1 text-[11.5px] text-slate-500">{unit} · {s.project.location}</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
          <div>Giá trị HĐ<div className="tabular text-[13px] font-semibold text-slate-800">{fmtNumber(s.project.contractValue / 1e9, 0)} tỷ</div></div>
          <div>Kế hoạch<div className="tabular text-[13px] font-semibold text-slate-800">{fmtPct(s.planned, 0)}</div></div>
          <div>Thực tế<div className="tabular text-[13px] font-semibold text-slate-800">{fmtPct(s.actual, 0)}</div></div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Progress value={s.actual} marker={s.planned} tone={tone} className="h-1.5 flex-1" />
          <StatusBadge map={HEALTH} value={s.health} dot={false} />
        </div>
      </Card>
    </Link>
  );
}
