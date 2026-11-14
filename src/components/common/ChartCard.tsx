import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";

export function ChartCard({ title, right, children, className, contentClassName, description }: { title: ReactNode; right?: ReactNode; children: ReactNode; className?: string; contentClassName?: string; description?: ReactNode }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="items-start">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <p className="mt-0.5 text-[11.5px] text-slate-500">{description}</p>}
        </div>
        {right}
      </CardHeader>
      <CardContent className={cn("flex-1", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
