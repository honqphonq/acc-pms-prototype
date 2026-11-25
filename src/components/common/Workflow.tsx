import { Check } from "lucide-react";
import type { WorkflowEvent } from "@/types";
import { cn } from "@/utils/cn";
import { ActivityLog, type ActivityItem } from "./ActivityLog";

/** Thanh các bước quy trình (stepper) */
export function Stepper({ steps, current, failed }: { steps: string[]; current: number; failed?: boolean }) {
  return (
    <ol className="flex w-full items-start overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex min-w-[96px] flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done || active ? "bg-success" : "bg-slate-200")} />
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                  done && "border-success bg-success text-white",
                  active && !failed && "border-primary bg-white text-primary ring-4 ring-primary/10",
                  active && failed && "border-rose-500 bg-rose-500 text-white",
                  !done && !active && "border-slate-200 bg-white text-slate-400",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <div className={cn("h-0.5 flex-1", i === steps.length - 1 ? "bg-transparent" : done ? "bg-success" : "bg-slate-200")} />
            </div>
            <div className={cn("mt-1.5 px-1 text-[11px] leading-tight", active ? "font-semibold text-slate-800" : done ? "text-slate-600" : "text-slate-400")}>{s}</div>
          </li>
        );
      })}
    </ol>
  );
}

/** Lịch sử xử lý – cùng kiểu "Lịch sử hoạt động" của Công việc điều hành (nhóm theo ngày, Người A làm gì · giờ) */
export function Timeline({ events }: { events: WorkflowEvent[] }) {
  const items: ActivityItem[] = events.map((e, i) => ({
    id: String(i), at: e.at, userId: e.byId,
    text: <>{/^\p{Lu}\p{Ll}/u.test(e.action) ? e.action.charAt(0).toLowerCase() + e.action.slice(1) : e.action}</>,
    extra: e.note ? <div className="rounded-md bg-slate-50 px-2.5 py-1.5 text-[12.5px] text-slate-600">{e.note}</div> : undefined,
  }));
  return <ActivityLog items={items} />;
}
