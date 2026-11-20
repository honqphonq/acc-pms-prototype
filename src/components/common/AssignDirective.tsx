import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/common/FormField";
import { createDirective } from "@/services/actions";
import { DEMO_TODAY, addDays } from "@/utils/date";
import { cn } from "@/utils/cn";
import type { ID } from "@/types";

/** Ngữ cảnh khi bấm "Giao việc" từ một vấn đề trên màn hình báo cáo */
export type AssignCtx = { title: string; refLabel: string; link: string; projectId?: ID | null; suggest?: (ID | null | undefined)[] };

const Ctx = createContext<((c: AssignCtx) => void) | null>(null);
/** Trả về hàm mở popup giao việc (null nếu không nằm trong DirectiveProvider) */
export const useAssign = () => useContext(Ctx);

export function DirectiveProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<AssignCtx | null>(null);
  const open = useCallback((c: AssignCtx) => setCtx(c), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      <AssignDialog ctx={ctx} onClose={() => setCtx(null)} />
    </Ctx.Provider>
  );
}

/** Nút "Giao việc" nhỏ – tự ẩn khi không có DirectiveProvider */
export function AssignButton({ ctx, className, label = "Giao việc", size = "xs" }: { ctx: AssignCtx; className?: string; label?: string; size?: "xs" | "sm" }) {
  const assign = useAssign();
  if (!assign) return null;
  return (
    <Button size={size} variant="outline" className={cn("border-primary/40 text-primary hover:bg-primary-soft", className)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); assign(ctx); }}>
      <Send /> {label}
    </Button>
  );
}

function AssignDialog({ ctx, onClose }: { ctx: AssignCtx | null; onClose: () => void }) {
  const { db, run } = useDb();
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", assigneeId: "", dueDate: "", content: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const [last, setLast] = useState<AssignCtx | null>(null);
  if (ctx && ctx !== last) {
    setLast(ctx);
    const first = ctx.suggest?.find((id) => id && db.users.some((u) => u.id === id)) ?? "";
    setForm({ title: ctx.title, assigneeId: first ?? "", dueDate: addDays(DEMO_TODAY, 7), content: "" });
    setErr({});
  }
  if (!ctx) return null;
  const suggested = [...new Set(ctx.suggest?.filter(Boolean) as ID[])].filter((id) => db.users.some((u) => u.id === id));
  const label = (id: ID) => { const u = db.users.find((x) => x.id === id)!; return `${u.name} – ${u.title}`; };
  const options = [
    ...suggested.map((id) => ({ value: id, label: `★ ${label(id)}` })),
    ...db.users.filter((u) => !suggested.includes(u.id) && u.id !== user?.id).map((u) => ({ value: u.id, label: label(u.id) })),
  ];
  const save = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Nhập tên công việc";
    if (!form.assigneeId) e.assigneeId = "Chọn người thực hiện";
    if (!form.dueDate) e.dueDate = "Chọn hạn hoàn thành";
    setErr(e);
    if (Object.keys(e).length) return;
    run(createDirective, { title: form.title.trim(), content: form.content.trim(), refLabel: ctx.refLabel, link: ctx.link, projectId: ctx.projectId ?? null, assigneeId: form.assigneeId, dueDate: form.dueDate }, user!.id);
    toast.success("Đã giao việc", { description: `${form.title} → ${db.users.find((u) => u.id === form.assigneeId)?.name}` });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Giao việc</DialogTitle><DialogDescription>Liên quan đến: <b className="text-slate-700">{ctx.refLabel}</b></DialogDescription></DialogHeader>
        <DialogBody className="space-y-3">
          <FormField label="Tên công việc" required error={err.title}><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus /></FormField>
          <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
            <FormField label="Người thực hiện" required error={err.assigneeId} hint={suggested.length ? "★ người phụ trách được gợi ý" : undefined}><Select value={form.assigneeId} placeholder="— Chọn người —" onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} options={options} /></FormField>
            <FormField label="Hạn hoàn thành" required error={err.dueDate}><Input type="date" min={DEMO_TODAY} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></FormField>
          </div>
          <FormField label="Nội dung chỉ đạo"><Textarea rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Yêu cầu cụ thể, kết quả cần báo cáo…" /></FormField>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={onClose}>Hủy</Button><Button onClick={save}><Send /> Giao việc</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
