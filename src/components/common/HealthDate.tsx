import { Tip } from "@/components/ui/tooltip";
import { DEMO_TODAY, addDays, diffDays } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { cn } from "@/utils/cn";

/** Khám sức khỏe định kỳ 12 tháng/lần: quá hạn (đỏ), còn ≤ 30 ngày (vàng) */
export function healthState(d: string | null | undefined): "ok" | "soon" | "late" | "none" {
  if (!d) return "none";
  const left = diffDays(DEMO_TODAY, addDays(d, 365));
  return left < 0 ? "late" : left <= 30 ? "soon" : "ok";
}

export function HealthDate({ date }: { date: string | null | undefined }) {
  if (!date) return <span className="text-slate-300">—</span>;
  const st = healthState(date);
  const due = addDays(date, 365);
  const left = diffDays(DEMO_TODAY, due);
  return (
    <Tip content={<>Khám định kỳ 12 tháng/lần · hạn khám lại: <b>{fmtDate(due)}</b>{st === "late" ? ` (quá ${-left} ngày)` : ` (còn ${left} ngày)`}</>}>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className={cn(st === "late" && "font-semibold text-rose-600", st === "soon" && "font-semibold text-amber-600")}>{fmtDate(date)}</span>
        {st === "late" && <span className="rounded bg-rose-50 px-1.5 py-px text-[10.5px] font-semibold text-rose-600 ring-1 ring-rose-200">Quá hạn</span>}
        {st === "soon" && <span className="rounded bg-amber-50 px-1.5 py-px text-[10.5px] font-semibold text-amber-700 ring-1 ring-amber-200">Sắp đến hạn</span>}
      </span>
    </Tip>
  );
}
