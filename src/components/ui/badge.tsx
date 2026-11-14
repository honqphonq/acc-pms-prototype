import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4", {
  variants: {
    tone: {
      success: "border-green-200 bg-success-soft text-success-fg",
      warning: "border-amber-200 bg-warning-soft text-warning-fg",
      danger: "border-rose-200 bg-danger-soft text-danger-fg",
      info: "border-blue-200 bg-info-soft text-info-fg",
      neutral: "border-slate-200 bg-slate-100 text-slate-600",
      primary: "border-red-200 bg-primary-soft text-primary",
      purple: "border-violet-200 bg-violet-50 text-violet-700",
      outline: "border-slate-300 bg-white text-slate-700",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}
function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
export { Badge, badgeVariants };
