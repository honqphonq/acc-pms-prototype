import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/utils/cn";

export function KpiCard({
  label, value, unit, sub, progress, marker, tone = "primary", icon, onClick, className, accent,
}: {
  label: string; value: ReactNode; unit?: string; sub?: ReactNode; progress?: number; marker?: number;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "navy"; icon?: ReactNode; onClick?: () => void; className?: string; accent?: boolean;
}) {
  const iconBg = { primary: "bg-primary-soft text-primary", success: "bg-success-soft text-success-fg", warning: "bg-warning-soft text-warning-fg", danger: "bg-danger-soft text-danger-fg", info: "bg-info-soft text-info-fg", navy: "bg-slate-100 text-sidebar" };
  return (
    <Card onClick={onClick} className={cn("relative overflow-hidden p-4", onClick && "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md", accent && "bg-gradient-to-br from-white to-slate-50", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
            <span className="tabular text-[24px] font-bold leading-none tracking-tight text-slate-900">{value}</span>
            {unit && <span className="whitespace-nowrap text-xs font-medium text-slate-500">{unit}</span>}
          </div>
        </div>
        {icon && <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]", iconBg[tone])}>{icon}</div>}
      </div>
      {progress !== undefined && <Progress value={progress} marker={marker} tone={tone} className="mt-3 h-1.5" />}
      {sub && <div className="mt-2 text-[11.5px] leading-snug text-slate-500">{sub}</div>}
    </Card>
  );
}
