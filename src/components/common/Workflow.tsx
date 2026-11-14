import { Check } from "lucide-react";
import type { WorkflowEvent } from "@/types";
import { useDb } from "@/hooks/useDb";
import { fmtDateTime } from "@/utils/format";
import { cn } from "@/utils/cn";
import { Avatar } from "./UserAvatar";

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

/** Lịch sử xử lý */
export function Timeline({ events }: { events: WorkflowEvent[] }) {
  const { db } = useDb();
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {[...events].reverse().map((e, i) => {
        const u = db.users.find((x) => x.id === e.byId);
        return (
          <li key={i} className="relative">
            <span className={cn("absolute -left-[27px] top-0.5 h-3 w-3 rounded-full border-2 border-white", i === 0 ? "bg-primary" : "bg-slate-300")} />
            <div className="flex flex-wrap items-center gap-x-2 text-[13px]">
              <span className="font-medium text-slate-800">{e.action}</span>
              <span className="text-[11px] text-slate-400">{fmtDateTime(e.at)}</span>
            </div>
            {u && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <Avatar name={u.name} size="xs" /> {u.name} · {u.title}
              </div>
            )}
            {e.note && <div className="mt-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">{e.note}</div>}
          </li>
        );
      })}
    </ol>
  );
}
