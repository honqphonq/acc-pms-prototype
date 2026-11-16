import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useDb } from "@/hooks/useDb";
import { TASK_STATUS } from "@/utils/constants";
import { TaskUpdateForm } from "./TaskUpdateForm";

/** Hộp thoại cập nhật kết quả công việc (dùng ở Nhật ký, Chi tiết dự án) */
export function TaskProgressDialog({ taskId, open, onOpenChange, onViewDetail }: { taskId: string | null; open: boolean; onOpenChange: (o: boolean) => void; onViewDetail?: (id: string) => void }) {
  const { db } = useDb();
  const task = db.constructionPlans.find((t) => t.id === taskId);
  const item = db.constructionItems.find((i) => i.id === task?.itemId);
  const parent = db.constructionPlans.find((t) => t.id === task?.parentId);
  if (!task) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <div className="text-[11px] text-slate-500">Kế hoạch thi công › {item?.name}{parent ? ` › ${parent.name}` : ""}</div>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">{task.code}</span> {task.name} <StatusBadge map={TASK_STATUS} value={task.status} />
          </DialogTitle>
        </DialogHeader>
        <TaskUpdateForm
          taskId={task.id}
          active={open}
          onDone={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
          className="flex-1 overflow-hidden"
          footerExtra={onViewDetail && <button className="ml-2 font-medium text-primary hover:underline" onClick={() => { onOpenChange(false); onViewDetail(task.id); }}>Xem chi tiết công việc →</button>}
        />
      </DialogContent>
    </Dialog>
  );
}
