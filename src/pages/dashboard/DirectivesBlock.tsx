import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Send } from "lucide-react";
import { useDb } from "@/hooks/useDb";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DIR_STATE, DirectiveTable, dirState, type DirState } from "@/pages/directives/DirectivesPage";
import { cn } from "@/utils/cn";

/** Trang chủ: theo dõi việc Ban lãnh đạo đã giao */
export function DirectivesBlock({ projectIds }: { projectIds: Set<string> | null }) {
  const { db } = useDb();
  const list = db.directives.filter((d) => !projectIds || (d.projectId && projectIds.has(d.projectId)));
  const [tab, setTab] = useState<DirState>(list.some((d) => dirState(d) === "qua_han") ? "qua_han" : "dang_thuc_hien");
  const rows = list.filter((d) => dirState(d) === tab).sort((a, b) => (tab === "hoan_thanh" ? (b.completedAt ?? "").localeCompare(a.completedAt ?? "") : a.dueDate.localeCompare(b.dueDate)));
  return (
    <Card>
      <CardHeader className="flex-wrap gap-2">
        <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Việc chỉ đạo đã giao</CardTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(DIR_STATE) as DirState[]).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px]", tab === k ? "border-primary bg-primary-soft font-semibold text-primary" : "text-slate-600 hover:bg-slate-50")}>
              <span className="h-2 w-2 rounded-full" style={{ background: DIR_STATE[k].color }} />{DIR_STATE[k].label} ({list.filter((d) => dirState(d) === k).length})
            </button>
          ))}
          <Link to="/directives" className="ml-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline">Xem tất cả <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </CardHeader>
      <div className="max-h-[360px] overflow-y-auto"><DirectiveTable rows={rows} /></div>
      <p className="border-t px-5 py-2 text-[11.5px] text-slate-500">Bấm nút “Giao việc” trong các popup danh sách, trên bản đồ hoặc trên thẻ dự án đang chậm để giao việc ngay từ màn hình này.</p>
    </Card>
  );
}
