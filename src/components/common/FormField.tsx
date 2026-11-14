import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";

export function FormField({ label, required, error, hint, children, className }: { label: string; required?: boolean; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>
        {label} {required && <span className="text-primary">*</span>}
      </Label>
      {children}
      {error ? <p className="text-[11px] text-rose-600">{error}</p> : hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}
export function FormSection({ title, children, className, right }: { title: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={cn("min-w-0 rounded-lg border border-slate-200 bg-white p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">{title}</h4>
        {right}
      </div>
      {children}
    </section>
  );
}
