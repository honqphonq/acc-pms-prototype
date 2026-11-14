import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

/** Select gọn nhẹ (native) – giao diện đồng bộ với shadcn/ui */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: { value: string; label: string }[];
  placeholder?: string;
}
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, options, placeholder, children, ...props }, ref) => (
  <div className={cn("relative", className)}>
    <select
      ref={ref}
      className="h-9 w-full appearance-none truncate rounded-md border border-input bg-white pl-3 pr-8 text-sm shadow-sm focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-slate-50"
      {...props}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options?.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
  </div>
));
Select.displayName = "Select";
export { Select };
