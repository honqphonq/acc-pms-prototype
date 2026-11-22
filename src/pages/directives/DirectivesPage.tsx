import { useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlignLeft, CalendarCheck, CheckCircle2, Download, Eye, FolderKanban, GanttChartSquare, List, MessageSquare, Paperclip, Plus, Search, Send, User as UserIcon, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/common/PageHeader";
import { FormField } from "@/components/common/FormField";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterSelect } from "@/components/common/DataTable";
import { Avatar, AvatarGroup, UserCell } from "@/components/common/UserAvatar";
import { AttachmentList, FileUploader, readFiles } from "@/components/common/Attachments";
import { addDirectiveComment, completeDirective, createDirective } from "@/services/actions";
import { activeProjects } from "@/utils/labels";
import { DEMO_TODAY, addDays, diffDays } from "@/utils/date";
import { fmtDate, fmtDateTime } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Attachment, Directive, ID } from "@/types";

export type DirState = "dang_thuc_hien" | "qua_han" | "hoan_thanh" | "hoan_thanh_muon";
/** Quá hạn = đã qua hạn mà chưa xong; Hoàn thành muộn = đã xong nhưng xong sau hạn */
export const dirState = (d: Directive): DirState =>
  d.status === "hoan_thanh" ? ((d.completedAt ?? "").slice(0, 10) > d.dueDate ? "hoan_thanh_muon" : "hoan_thanh") : d.dueDate < DEMO_TODAY ? "qua_han" : "dang_thuc_hien";
export const DIR_STATE: Record<DirState, { label: string; tone: "info" | "danger" | "success" | "warning"; color: string }> = {
  dang_thuc_hien: { label: "Đang thực hiện", tone: "info", color: "#2563EB" },
  qua_han: { label: "Quá hạn", tone: "danger", color: "#E11D48" },
  hoan_thanh: { label: "Hoàn thành", tone: "success", color: "#16A34A" },
  hoan_thanh_muon: { label: "Hoàn thành muộn", tone: "warning", color: "#F59E0B" },
};
/** Số ngày hoàn thành muộn so với hạn */
const lateDone = (d: Directive) => (d.completedAt ? Math.max(0, diffDays(d.dueDate, d.completedAt.slice(0, 10))) : 0);
type Scope = "giao_cho_toi" | "toi_giao" | "theo_doi" | "tat_ca";
const SCOPES: { key: Scope; label: string }[] = [
  { key: "giao_cho_toi", label: "Giao cho tôi" },
  { key: "toi_giao", label: "Tôi giao đi" },
  { key: "theo_doi", label: "Tôi theo dõi" },
  { key: "tat_ca", label: "Tất cả" },
];

// ---------------------------------------------------------------- chọn người
function UserPicker({ value, onChange, multi, exclude = [], children }: { value: ID[]; onChange: (v: ID[]) => void; multi?: boolean; exclude?: ID[]; children: React.ReactNode }) {
  const { db } = useDb();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const kw = q.trim().toLowerCase();
  const list = db.users.filter((u) => !exclude.includes(u.id) && (!kw || `${u.name} ${u.title}`.toLowerCase().includes(kw))).slice(0, 60);
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center gap-2 border-b px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm người…" className="h-7 flex-1 bg-transparent text-[13px] outline-none" /></div>
        <div className="max-h-72 overflow-y-auto py-1">
          {list.map((u) => {
            const on = value.includes(u.id);
            return (
              <button key={u.id} type="button" onClick={() => { if (multi) onChange(on ? value.filter((x) => x !== u.id) : [...value, u.id]); else { onChange([u.id]); setOpen(false); } }} className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50", on && "bg-primary-soft/60")}>
                <Avatar name={u.name} size="xs" />
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-slate-800">{u.name}</span><span className="block truncate text-[11px] text-slate-500">{u.title}</span></span>
                {on && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
          {!list.length && <div className="px-3 py-4 text-center text-[12.5px] text-slate-400">Không tìm thấy</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------- popup tạo công việc
export function CreateTaskDialog({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId?: ID }) {
  const { db, run } = useDb();
  const { user } = useAuth();
  const empty = { title: "", assigneeId: "", projectId: projectId ?? "", due: "", dueMode: "" as "" | "today" | "tomorrow" | "other", content: "", followerIds: [] as ID[], attachments: [] as Attachment[] };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState<Record<string, string>>({});
  const [wasOpen, setWasOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setF(empty); setErr({}); } }
  const assignee = db.users.find((u) => u.id === f.assigneeId);
  const setDue = (mode: "today" | "tomorrow" | "other") => setF({ ...f, dueMode: mode, due: mode === "today" ? DEMO_TODAY : mode === "tomorrow" ? addDays(DEMO_TODAY, 1) : f.due || addDays(DEMO_TODAY, 7) });
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = "Nhập tên công việc";
    if (!f.assigneeId) e.assigneeId = "Chọn người thực hiện";
    if (!f.due) e.due = "Chọn hạn hoàn thành";
    setErr(e);
    if (Object.keys(e).length) return;
    run(createDirective, { title: f.title.trim(), content: f.content.trim(), projectId: f.projectId || null, assigneeId: f.assigneeId, dueDate: f.due, followerIds: f.followerIds.filter((x) => x !== f.assigneeId), attachments: f.attachments }, user!.id);
    toast.success("Đã tạo công việc", { description: `${f.title.trim()} → ${assignee?.name}` });
    onClose();
  };
  const rowCls = "flex items-start gap-4 py-2.5";
  const icon = "mt-1.5 h-5 w-5 shrink-0 text-slate-500";
  const dueBtn = (mode: "today" | "tomorrow" | "other", label: string) => (
    <button type="button" onClick={() => setDue(mode)} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13.5px] hover:bg-slate-100", f.dueMode === mode ? "bg-primary-soft font-semibold text-primary" : "text-slate-700")}><CalendarCheck className="h-4 w-4" />{label}</button>
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b bg-slate-50 px-6 py-4"><DialogTitle className="text-[18px]">Tạo công việc mới</DialogTitle><DialogDescription className="sr-only">Nhập thông tin công việc</DialogDescription></DialogHeader>
        <DialogBody className="px-6 py-4">
          <input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Tên công việc *" className={cn("w-full border-b border-transparent bg-transparent py-2 text-[22px] font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-primary/40", err.title && "border-rose-400")} />
          {err.title && <p className="text-[12px] text-rose-600">{err.title}</p>}

          <div className={rowCls}>
            <UserIcon className={icon} />
            <div>
              <UserPicker value={f.assigneeId ? [f.assigneeId] : []} onChange={(v) => setF({ ...f, assigneeId: v[0] ?? "" })}>
                {assignee ? (
                  <span role="button" tabIndex={0} className="inline-flex cursor-pointer items-center gap-2 rounded-full border bg-slate-50 py-1 pl-1 pr-2 text-[13.5px] hover:border-primary/50">
                    <Avatar name={assignee.name} size="xs" />{assignee.name}<span className="text-[11.5px] text-slate-400">· {assignee.title}</span>
                    <X className="h-3.5 w-3.5 text-slate-400 hover:text-rose-600" onClick={(e) => { e.stopPropagation(); setF({ ...f, assigneeId: "" }); }} />
                  </span>
                ) : <button type="button" className={cn("rounded-md px-2 py-1.5 text-[13.5px] text-slate-500 hover:bg-slate-100", err.assigneeId && "text-rose-600")}>Chọn người thực hiện *</button>}
              </UserPicker>
            </div>
          </div>

          <div className={rowCls}>
            <FolderKanban className={icon} />
            <select value={f.projectId} disabled={!!projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })} className="h-9 max-w-md flex-1 rounded-md border border-slate-200 bg-white px-2 text-[13.5px] disabled:bg-slate-50">
              <option value="">— Không thuộc dự án (việc chung) —</option>
              {activeProjects(db).map((p) => <option key={p.id} value={p.id}>{p.shortName}</option>)}
            </select>
          </div>

          <div className={rowCls}>
            <CalendarCheck className={icon} />
            <div className="flex flex-wrap items-center gap-1">
              <span className={cn("mr-1 text-[13.5px] text-slate-500", err.due && "text-rose-600")}>Hạn hoàn thành *:</span>
              {dueBtn("today", "Hôm nay")}{dueBtn("tomorrow", "Ngày mai")}{dueBtn("other", "Khác")}
              {f.dueMode === "other" && <Input type="date" min={DEMO_TODAY} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} className="ml-1 h-8 w-40" />}
              {f.due && f.dueMode !== "other" && <span className="ml-1 text-[12.5px] text-slate-500">({fmtDate(f.due)})</span>}
            </div>
          </div>

          <div className={rowCls}>
            <AlignLeft className={icon} />
            <Textarea rows={4} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} placeholder="Mô tả công việc" className="border-slate-200" />
          </div>

          {(f.attachments.length > 0 || f.followerIds.length > 0) && (
            <div className="space-y-2 pl-9">
              {f.attachments.length > 0 && <AttachmentList files={f.attachments} onRemove={(id) => setF({ ...f, attachments: f.attachments.filter((a) => a.id !== id) })} />}
              {f.followerIds.length > 0 && <div className="flex items-center gap-2 text-[12.5px] text-slate-500">Người theo dõi: <AvatarGroup userIds={f.followerIds} /></div>}
            </div>
          )}
        </DialogBody>
        <div className="flex items-center gap-1 border-t px-4 py-2 text-[13.5px] text-slate-600">
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-slate-100"><Paperclip className="h-4 w-4" /> Thêm tài liệu</button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={async (e) => { const add = await readFiles(e.target.files); e.target.value = ""; setF((x) => ({ ...x, attachments: [...x.attachments, ...add] })); }} />
          <span className="h-5 w-px bg-slate-200" />
          <UserPicker multi value={f.followerIds} exclude={[f.assigneeId]} onChange={(v) => setF({ ...f, followerIds: v })}>
            <button type="button" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-slate-100"><UserPlus className="h-4 w-4" /> Người theo dõi{f.followerIds.length ? ` (${f.followerIds.length})` : ""}</button>
          </UserPicker>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Đóng</Button><Button onClick={save}>Tạo công việc</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- báo cáo hoàn thành
export function CompleteDialog({ d, onClose }: { d: Directive | null; onClose: () => void }) {
  const { run } = useDb();
  const [result, setResult] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [last, setLast] = useState<Directive | null>(null);
  if (d && d !== last) { setLast(d); setResult(""); setFiles([]); }
  if (!d) return null;
  const save = () => {
    if (!result.trim()) return toast.error("Nhập kết quả thực hiện");
    run(completeDirective, d.id, result.trim(), files);
    toast.success("Đã báo cáo hoàn thành", { description: d.title });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Báo cáo hoàn thành</DialogTitle><DialogDescription>{d.code} · {d.title}</DialogDescription></DialogHeader>
        <DialogBody className="space-y-3">
          <FormField label="Kết quả thực hiện" required><Textarea rows={4} autoFocus value={result} onChange={(e) => setResult(e.target.value)} placeholder="Đã làm gì, kết quả ra sao…" /></FormField>
          <FormField label="Đính kèm (biên bản, hình ảnh…)"><FileUploader value={files} onChange={setFiles} /></FormField>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={onClose}>Hủy</Button><Button onClick={save}><CheckCircle2 /> Hoàn thành</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- khung chi tiết
function TaskSheet({ id, onClose, onComplete }: { id: ID | null; onClose: () => void; onComplete: (d: Directive) => void }) {
  const { db, run } = useDb();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const d = db.directives.find((x) => x.id === id) ?? null;
  const project = d?.projectId ? db.projects.find((p) => p.id === d.projectId) : null;
  const st = d ? dirState(d) : "dang_thuc_hien";
  const canComplete = !!d && d.status !== "hoan_thanh" && (d.assigneeId === user?.id || !!user?.isDemoAccount);
  const send = () => { if (!d || !text.trim()) return; run(addDirectiveComment, d.id, user!.id, text.trim()); setText(""); };
  const meta = "grid grid-cols-[130px_1fr] items-center gap-2 text-[13px]";
  return (
    <Sheet open={!!d} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl">
        {d && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2 text-[12px] text-slate-500">{d.code} · giao ngày {fmtDate(d.createdAt)}<Badge tone={DIR_STATE[st].tone}>{DIR_STATE[st].label}</Badge></div>
              <SheetTitle className="text-[18px] leading-snug">{d.title}</SheetTitle>
            </SheetHeader>
            <SheetBody className="space-y-5">
              <div className="space-y-2.5">
                <div className={meta}><span className="text-slate-500">Dự án</span>{project ? <Link to={`/projects/${project.id}`} className="font-medium text-primary hover:underline">{project.shortName}</Link> : <span className="text-slate-600">Việc chung (không thuộc dự án)</span>}</div>
                <div className={meta}><span className="text-slate-500">Người giao</span><UserCell userId={d.assignedBy} /></div>
                <div className={meta}><span className="text-slate-500">Người thực hiện</span><UserCell userId={d.assigneeId} /></div>
                <div className={meta}><span className="text-slate-500">Người theo dõi</span>{d.followerIds?.length ? <AvatarGroup userIds={d.followerIds} /> : <span className="text-slate-400">—</span>}</div>
                <div className={meta}><span className="text-slate-500">Hạn hoàn thành</span><span className={cn("font-medium", st === "qua_han" && "text-rose-600")}>{fmtDate(d.dueDate)}{st === "qua_han" && ` · trễ ${diffDays(d.dueDate, DEMO_TODAY)} ngày`}{d.completedAt && <span className={cn("font-normal", st === "hoan_thanh_muon" ? "text-amber-600" : "text-slate-500")}> · xong {fmtDate(d.completedAt)}{st === "hoan_thanh_muon" && ` (muộn ${lateDone(d)} ngày)`}</span>}</span></div>
              </div>
              <div><div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Mô tả công việc</div><p className="whitespace-pre-line text-[13.5px] text-slate-700">{d.content || <span className="text-slate-400">Không có mô tả</span>}</p></div>
              <div><div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Tài liệu đính kèm</div><AttachmentList files={d.attachments ?? []} empty="Không có tài liệu" /></div>
              {d.result && (
                <div className="rounded-lg border border-emerald-200 bg-success-soft/50 p-3">
                  <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-success-fg">Kết quả thực hiện</div>
                  <p className="text-[13.5px] text-slate-800">{d.result}</p>
                  {!!d.files?.length && <div className="mt-2"><AttachmentList files={d.files} /></div>}
                </div>
              )}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500"><MessageSquare className="h-3.5 w-3.5" /> Trao đổi ({d.comments?.length ?? 0})</div>
                <div className="space-y-3">
                  {(d.comments ?? []).map((c) => {
                    const u = db.users.find((x) => x.id === c.userId);
                    return (
                      <div key={c.id} className="flex gap-2.5">
                        <Avatar name={u?.name ?? "?"} size="sm" />
                        <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2"><div className="text-[12px]"><b className="text-slate-800">{u?.name}</b> <span className="text-slate-400">· {fmtDateTime(c.at)}</span></div><div className="whitespace-pre-line text-[13.5px] text-slate-700">{c.text}</div></div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Viết trao đổi… (Enter để gửi)" />
                  <Button size="icon" onClick={send} aria-label="Gửi"><Send /></Button>
                </div>
              </div>
            </SheetBody>
            {canComplete && <SheetFooter><Button onClick={() => onComplete(d)}><CheckCircle2 /> Báo cáo hoàn thành</Button></SheetFooter>}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Gantt
function TaskGantt({ rows, onOpen }: { rows: Directive[]; onOpen: (d: Directive) => void }) {
  const { db } = useDb();
  if (!rows.length) return <EmptyState title="Không có công việc nào" className="py-10" />;
  const endOf = (d: Directive) => d.completedAt ?? d.dueDate;
  const start = addDays([...rows.map((d) => d.createdAt)].sort()[0], -3);
  const end = addDays([...rows.map(endOf), DEMO_TODAY, ...rows.map((d) => d.dueDate)].sort().pop()!, 5);
  const days = diffDays(start, end) + 1;
  const W = days > 120 ? 10 : days > 70 ? 16 : 24;
  const dayList = Array.from({ length: days }, (_, i) => addDays(start, i));
  const months: { m: string; n: number }[] = [];
  dayList.forEach((d) => { const m = d.slice(0, 7); if (months.at(-1)?.m === m) months.at(-1)!.n++; else months.push({ m, n: 1 }); });
  const groups = new Map<string, Directive[]>();
  rows.forEach((d) => { const k = d.projectId ?? ""; groups.set(k, [...(groups.get(k) ?? []), d]); });
  const order = [...groups.keys()].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
  const x = (d: string) => diffDays(start, d) * W;
  const todayX = x(DEMO_TODAY) + W / 2;
  const LEFT = 340;
  return (
    <div className="scrollbar-visible overflow-x-auto">
      <div style={{ width: LEFT + days * W }} className="relative text-[12.5px]">
        <div className="sticky top-0 z-10 flex border-b bg-slate-50">
          <div className="sticky left-0 z-10 flex shrink-0 items-end border-r bg-slate-50 px-4 pb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-slate-500" style={{ width: LEFT }}>Công việc</div>
          <div>
            <div className="flex border-b">{months.map((m) => <div key={m.m} style={{ width: m.n * W }} className="truncate border-r px-2 py-1 text-[11.5px] font-semibold text-slate-600">Tháng {Number(m.m.slice(5))}/{m.m.slice(0, 4)}</div>)}</div>
            <div className="flex">{dayList.map((d) => { const wd = new Date(d + "T00:00:00Z").getUTCDay(); return <div key={d} style={{ width: W }} className={cn("py-1 text-center text-[10.5px] text-slate-500", (wd === 0 || wd === 6) && "bg-slate-100", d === DEMO_TODAY && "font-bold text-primary")}>{W >= 16 ? Number(d.slice(8)) : ""}</div>; })}</div>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-0 top-[52px] z-[5] w-0.5 bg-primary/70" style={{ left: LEFT + todayX }}><span className="absolute -top-0 left-1 whitespace-nowrap rounded bg-primary px-1 text-[10px] text-white">Hôm nay</span></div>
        {order.map((k) => {
          const p = db.projects.find((pp) => pp.id === k);
          return (
            <div key={k || "none"}>
              <div className="flex border-b bg-slate-50/70"><div className="sticky left-0 flex shrink-0 items-center gap-2 border-r bg-slate-50 px-4 py-1.5 font-semibold text-slate-700" style={{ width: LEFT }}><FolderKanban className="h-3.5 w-3.5 text-slate-400" />{p ? p.shortName : "Không thuộc dự án"} <span className="font-normal text-slate-400">({groups.get(k)!.length})</span></div><div style={{ width: days * W }} /></div>
              {groups.get(k)!.map((d) => {
                const st = dirState(d);
                const u = db.users.find((uu) => uu.id === d.assigneeId);
                const left = x(d.createdAt);
                const width = (diffDays(d.createdAt, endOf(d)) + 1) * W;
                return (
                  <div key={d.id} className="flex border-b hover:bg-slate-50/60">
                    <button onClick={() => onOpen(d)} className="sticky left-0 z-[6] flex shrink-0 flex-col border-r bg-white px-4 py-1.5 text-left hover:text-primary" style={{ width: LEFT }}>
                      <span className="truncate font-medium text-slate-800">{d.title}</span>
                      <span className="truncate text-[11.5px] text-slate-500">{d.code} · {u?.name}</span>
                    </button>
                    <div className="relative" style={{ width: days * W }}>
                      {dayList.map((dd, i) => { const wd = new Date(dd + "T00:00:00Z").getUTCDay(); return wd === 0 || wd === 6 ? <div key={dd} className="absolute inset-y-0 bg-slate-50" style={{ left: i * W, width: W }} /> : null; })}
                      {st === "qua_han" && <div className="absolute top-1/2 h-4 -translate-y-1/2 rounded-r bg-[repeating-linear-gradient(45deg,#fecdd3_0,#fecdd3_4px,#fff1f2_4px,#fff1f2_8px)]" style={{ left: left + width, width: diffDays(d.dueDate, DEMO_TODAY) * W }} title={`Trễ ${diffDays(d.dueDate, DEMO_TODAY)} ngày`} />}
                      <button onClick={() => onOpen(d)} title={`${d.title}\n${fmtDate(d.createdAt)} → ${fmtDate(d.dueDate)}`} className="absolute top-1/2 flex h-5 -translate-y-1/2 items-center overflow-hidden rounded px-1.5 text-[11px] font-semibold text-white shadow-sm hover:brightness-110" style={{ left, width: Math.max(width, 6), background: DIR_STATE[st].color }}>
                        {width > 60 ? fmtDate(d.dueDate) : ""}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t px-4 py-2 text-[12px] text-slate-500">
        {(Object.keys(DIR_STATE) as DirState[]).map((k) => <span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: DIR_STATE[k].color }} />{DIR_STATE[k].label}</span>)}
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-[repeating-linear-gradient(45deg,#fecdd3_0,#fecdd3_3px,#fff1f2_3px,#fff1f2_6px)]" />Số ngày trễ hạn</span>
        <span>Thanh công việc: từ ngày giao đến hạn hoàn thành (hoặc ngày hoàn thành)</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- khu làm việc (trang menu + tab dự án)
export function DirectiveWorkspace({ projectId, openId, onOpenId }: { projectId?: ID; openId?: ID | null; onOpenId?: (id: ID | null) => void }) {
  const { db } = useDb();
  const { user } = useAuth();
  const isLeader = user?.role === "lanh_dao" || !!user?.isDemoAccount;
  const [scope, setScope] = useState<Scope>(projectId ? "tat_ca" : "giao_cho_toi");
  const [state, setState] = useState<DirState | "">("");
  const [q, setQ] = useState("");
  const [proj, setProj] = useState("");
  const [assignee, setAssignee] = useState("");
  const [view, setView] = useState<"list" | "gantt">("list");
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState<Directive | null>(null);
  const [localOpen, setLocalOpen] = useState<ID | null>(null);
  const sel = onOpenId ? openId ?? null : localOpen;
  const setSel = onOpenId ?? setLocalOpen;

  const inScope = (d: Directive, s: Scope) => s === "tat_ca" || (s === "giao_cho_toi" ? d.assigneeId === user?.id : s === "toi_giao" ? d.assignedBy === user?.id : (d.followerIds ?? []).includes(user?.id ?? ""));
  const scopes = SCOPES.filter((s) => s.key !== "tat_ca" || isLeader || !!projectId);
  const pool = db.directives.filter((d) => !projectId || d.projectId === projectId);
  const kw = q.trim().toLowerCase();
  const base = pool.filter((d) => inScope(d, scope) && (!proj || (proj === "none" ? !d.projectId : d.projectId === proj)) && (!assignee || d.assigneeId === assignee) && (!kw || `${d.code} ${d.title} ${d.content}`.toLowerCase().includes(kw)));
  const rows = base.filter((d) => !state || dirState(d) === state).sort((a, b) => Number(a.status === "hoan_thanh") - Number(b.status === "hoan_thanh") || a.dueDate.localeCompare(b.dueDate));
  const pName = (id: ID | null) => (id ? db.projects.find((p) => p.id === id)?.shortName ?? "" : "");
  const uName = (id: ID) => db.users.find((u) => u.id === id)?.name ?? "";
  const assignees = useMemo(() => [...new Set(pool.map((d) => d.assigneeId))].map((id) => ({ value: id, label: uName(id) })), [pool]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows.map((d, i) => ({ STT: i + 1, "Mã": d.code, "Tên công việc": d.title, "Dự án": pName(d.projectId) || "Việc chung", "Người giao": uName(d.assignedBy), "Người thực hiện": uName(d.assigneeId), "Người theo dõi": (d.followerIds ?? []).map(uName).join(", "), "Ngày giao": fmtDate(d.createdAt), "Hạn hoàn thành": fmtDate(d.dueDate), "Trạng thái": DIR_STATE[dirState(d)].label, "Kết quả": d.result ?? "" })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Cong viec");
    XLSX.writeFile(wb, `Cong-viec-dieu-hanh_${DEMO_TODAY}.xlsx`);
  };

  return (
    <Card className="overflow-hidden">
      <CreateTaskDialog open={creating} onClose={() => setCreating(false)} projectId={projectId} />
      <CompleteDialog d={done} onClose={() => setDone(null)} />
      <TaskSheet id={sel} onClose={() => setSel(null)} onComplete={(d) => setDone(d)} />

      {/* phạm vi */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4">
        {!projectId && scopes.map((s) => {
          const n = pool.filter((d) => inScope(d, s.key) && d.status !== "hoan_thanh").length;
          return <button key={s.key} onClick={() => setScope(s.key)} className={cn("-mb-px border-b-2 px-3 py-3 text-[13.5px] font-medium", scope === s.key ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800")}>{s.label} <span className={cn("ml-0.5 rounded-full px-1.5 text-[11px]", scope === s.key ? "bg-primary-soft" : "bg-slate-100")}>{n}</span></button>;
        })}
        {projectId && <div className="py-3 text-[13.5px] font-semibold text-slate-800">Công việc điều hành của dự án</div>}
        <div className="ml-auto flex items-center gap-2 py-2">
          <div className="flex rounded-lg border bg-slate-50 p-0.5">
            <button onClick={() => setView("list")} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-[12.5px]", view === "list" ? "bg-white font-semibold text-primary shadow-sm" : "text-slate-600")}><List className="h-3.5 w-3.5" /> Danh sách</button>
            <button onClick={() => setView("gantt")} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-[12.5px]", view === "gantt" ? "bg-white font-semibold text-primary shadow-sm" : "text-slate-600")}><GanttChartSquare className="h-3.5 w-3.5" /> Gantt</button>
          </div>
          <Button size="sm" variant="outline" onClick={exportXlsx}><Download /> Xuất Excel</Button>
          <Button size="sm" onClick={() => setCreating(true)}><Plus /> Thêm công việc</Button>
        </div>
      </div>

      {/* bộ lọc */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50/60 px-4 py-2.5">
        <div className="relative"><Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm công việc…" className="h-8 w-56 pl-8" /></div>
        {!projectId && <FilterSelect value={proj} onChange={setProj} allLabel="Tất cả dự án" options={[{ value: "none", label: "Không thuộc dự án" }, ...activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))]} />}
        <FilterSelect value={assignee} onChange={setAssignee} allLabel="Tất cả người thực hiện" options={assignees} />
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button onClick={() => setState("")} className={cn("rounded-full border bg-white px-3 py-1 text-[12.5px]", !state && "border-primary bg-primary-soft text-primary")}>Tất cả ({base.length})</button>
          {(Object.keys(DIR_STATE) as DirState[]).map((k) => <button key={k} onClick={() => setState(k)} className={cn("flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-[12.5px]", state === k && "border-primary bg-primary-soft text-primary")}><span className="h-2 w-2 rounded-full" style={{ background: DIR_STATE[k].color }} />{DIR_STATE[k].label} ({base.filter((d) => dirState(d) === k).length})</button>)}
        </div>
      </div>

      {view === "gantt" ? <TaskGantt rows={rows} onOpen={(d) => setSel(d.id)} /> : !rows.length ? <EmptyState title="Không có công việc nào" className="py-10" /> : (
        <Table>
          <TableHeader><TableRow><TableHead>Công việc</TableHead>{!projectId && <TableHead>Dự án</TableHead>}<TableHead>Người giao</TableHead><TableHead>Người thực hiện</TableHead><TableHead>Thời hạn</TableHead><TableHead>Trạng thái</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
          <TableBody>
            {rows.map((d) => {
              const st = dirState(d);
              return (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => setSel(d.id)}>
                  <TableCell className="min-w-[280px] max-w-[460px]">
                    <div className="font-semibold text-slate-900">{d.title}</div>
                    <div className="flex items-center gap-2 text-[12px] text-slate-500">{d.code} · giao ngày {fmtDate(d.createdAt)}
                      {!!d.comments?.length && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{d.comments.length}</span>}
                      {!!d.attachments?.length && <span className="inline-flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{d.attachments.length}</span>}
                    </div>
                  </TableCell>
                  {!projectId && <TableCell className="whitespace-nowrap">{d.projectId ? <Link onClick={(e) => e.stopPropagation()} to={`/projects/${d.projectId}`} className="text-[13px] text-primary hover:underline">{pName(d.projectId)}</Link> : <span className="text-[13px] text-slate-500">Việc chung</span>}</TableCell>}
                  <TableCell className="whitespace-nowrap"><UserCell userId={d.assignedBy} /></TableCell>
                  <TableCell className="whitespace-nowrap"><UserCell userId={d.assigneeId} /></TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDate(d.dueDate)}</TableCell>
                  <TableCell><Badge tone={DIR_STATE[st].tone}>{DIR_STATE[st].label}</Badge></TableCell>
                  <TableCell><Eye className="h-4 w-4 text-slate-400" /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

export default function DirectivesPage() {
  const [params, setParams] = useSearchParams();
  const openId = params.get("id");
  return (
    <div>
      <PageHeader title="Công việc điều hành" />
      <DirectiveWorkspace openId={openId} onOpenId={(id) => setParams(id ? { id } : {}, { replace: true })} />
    </div>
  );
}
