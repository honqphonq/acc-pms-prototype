import { Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import { Tip } from "@/components/ui/tooltip";

/** Đánh dấu nội dung là ĐỀ XUẤT / GIẢ ĐỊNH của prototype (chưa được ACC xác nhận) */
export function AssumptionTag({ children }: { children: ReactNode }) {
  return (
    <Tip content={children}>
      <span className="inline-flex cursor-help items-center gap-1 rounded-full border border-dashed border-amber-300 bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-700">
        <Lightbulb className="h-3 w-3" /> Đề xuất
      </span>
    </Tip>
  );
}
