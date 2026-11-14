import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export function PageHeader({ title, description, actions, className, badge }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string; badge?: ReactNode }) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-[22px]">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
