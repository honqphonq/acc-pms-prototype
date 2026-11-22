import { Progress } from "@/components/ui/progress";
import { Tip } from "@/components/ui/tooltip";
import type { ProjectStats } from "@/services/selectors";
import { fmtPct } from "@/utils/format";
import { cn } from "@/utils/cn";

export const healthTone = (h: ProjectStats["health"]) =>
  h === "cham_tien_do" ? "danger" : h === "nguy_co_cham" ? "warning" : h === "chua_bat_dau" ? "navy" : "success";
const textTone = (h: ProjectStats["health"]) =>
  h === "cham_tien_do" ? "text-rose-600" : h === "nguy_co_cham" ? "text-amber-600" : "text-emerald-600";

/**
 * Tiến độ dự án: % hoàn thành (so với tổng khối lượng) + % so với kế hoạch đến hôm nay.
 * Thanh tiến độ có vạch đánh dấu mức kế hoạch phải đạt.
 */
export function ProjectProgress({ s, className, size = "sm" }: { s: ProjectStats; className?: string; size?: "sm" | "md" }) {
  return (
    <Tip content={<div className="space-y-0.5 text-[12px]"><div>Hoàn thành <b>{fmtPct(s.actual)}</b> tổng khối lượng dự án</div><div>Kế hoạch đến hôm nay: <b>{fmtPct(s.planned)}</b> (vạch đen)</div><div>{s.healthReason}</div></div>}>
      <div className={cn("w-40", className)}>
        <div className={cn("mb-1 flex items-baseline justify-between gap-2 whitespace-nowrap", size === "md" ? "text-[13px]" : "text-[11.5px]")}>
          <span><b className="text-slate-800">{fmtPct(s.actual)}</b> <span className="text-slate-400">hoàn thành</span></span>
          {s.spi !== null && <span className={cn("font-semibold", textTone(s.health))}>{fmtPct(s.spi, 0)} KH</span>}
        </div>
        <Progress value={s.actual} marker={s.planned} tone={healthTone(s.health)} className={size === "md" ? "h-2" : "h-1.5"} />
      </div>
    </Tip>
  );
}
