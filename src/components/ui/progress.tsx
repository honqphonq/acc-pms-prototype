import * as React from "react";
import { cn } from "@/utils/cn";

/** Thanh tiến độ, có thể hiển thị mốc kế hoạch (marker) */
export function Progress({ value, marker, className, barClassName, tone = "primary" }: { value: number; marker?: number; className?: string; barClassName?: string; tone?: "primary" | "success" | "warning" | "danger" | "info" | "navy" }) {
  const colors = { primary: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-rose-500", info: "bg-info", navy: "bg-sidebar" };
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className={cn("relative h-2 w-full overflow-visible rounded-full bg-slate-200/80", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", colors[tone], barClassName)} style={{ width: `${v * 100}%` }} />
      {marker !== undefined && (
        <div className="absolute -top-1 h-4 w-0.5 rounded bg-slate-800" style={{ left: `calc(${Math.max(0, Math.min(1, marker)) * 100}% - 1px)` }} title={`Kế hoạch: ${(marker * 100).toFixed(1)}%`} />
      )}
    </div>
  );
}
export const ProgressBar = React.memo(Progress);
