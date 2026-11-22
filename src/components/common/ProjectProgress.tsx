import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ProjectStats } from "@/services/selectors";
import { PROJECT_HEALTH } from "@/utils/constants";
import { fmtPct } from "@/utils/format";
import { cn } from "@/utils/cn";

export const healthTone = (h: ProjectStats["health"]) =>
  h === "cham_tien_do" ? "danger" : h === "nguy_co_cham" ? "warning" : h === "chua_bat_dau" ? "navy" : "success";

/**
 * Tiến độ dự án: % hoàn thành (so với tổng khối lượng) + thanh có vạch đen = mức kế hoạch đến hôm nay.
 * Bấm vào thanh để xem giải thích (% so với kế hoạch, lý do trạng thái).
 */
export function ProjectProgress({ s, className }: { s: ProjectStats; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" onClick={(e) => e.stopPropagation()} className={cn("block w-36 cursor-pointer rounded text-left", className)}>
          <div className="mb-1 text-[12px] font-semibold text-slate-800">{fmtPct(s.actual)}</div>
          <Progress value={s.actual} marker={s.planned} tone={healthTone(s.health)} className="h-1.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 text-[12.5px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 font-semibold text-slate-800">{s.project.shortName}</div>
        <div className="space-y-1 text-slate-600">
          <div className="flex justify-between"><span>Hoàn thành (tổng khối lượng)</span><b className="text-slate-800">{fmtPct(s.actual)}</b></div>
          <div className="flex justify-between"><span>Kế hoạch đến hôm nay (vạch đen)</span><b className="text-slate-800">{fmtPct(s.planned)}</b></div>
          {s.spi !== null && <div className="flex justify-between"><span>So với kế hoạch</span><b className="text-slate-800">{fmtPct(s.spi, 0)}</b></div>}
          <div className="flex justify-between"><span>Trạng thái</span><b className="text-slate-800">{PROJECT_HEALTH[s.health]?.label ?? "—"}</b></div>
        </div>
        <p className="mt-2 border-t pt-2 text-[11.5px] text-slate-500">≥ 95% kế hoạch: đúng tiến độ · 85% – dưới 95%: có nguy cơ chậm · dưới 85%: chậm tiến độ.</p>
      </PopoverContent>
    </Popover>
  );
}
