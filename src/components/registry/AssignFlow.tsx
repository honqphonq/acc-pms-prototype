import { useState, type ReactNode } from "react";
import { CheckCircle2, ClipboardCheck, Hand, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/common/FormField";
import { AttachmentList, FileUploader } from "@/components/common/Attachments";
import { UserCell } from "@/components/common/UserAvatar";
import { ActivityLog, rich } from "@/components/common/ActivityLog";
import { saveRow } from "@/services/actions";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { genId } from "@/utils/id";
import { cn } from "@/utils/cn";
import type { ActivityEntry, Attachment, CollectionKey, Database } from "@/types";

/**
 * Luồng giao việc 2 bước dùng chung cho Sửa chữa / Bảo dưỡng / Sự cố:
 * Người giao tạo (Mới giao) → người được giao Tiếp nhận (Đang xử lý) → Cập nhật kết quả (Hoàn thành / Hoàn thành muộn)
 */
export interface FlowRow {
  id: string;
  code: string;
  assigneeId: string;
  deadline: string;
  createdById?: string;
  createdAt: string;
  status: string;
  completedAt?: string;
  files?: Attachment[];
  activity?: ActivityEntry[];
}
export interface FlowStatus { moi: string; dang: string; xong: string }
export interface ResultField { key: string; label: string; type?: "text" | "textarea" | "number" | "date"; required?: boolean; wide?: boolean; hint?: string }

const stamp = () => `${DEMO_TODAY}T${new Date().toTimeString().slice(0, 8)}`;
export const logAct = (row: { activity?: ActivityEntry[] }, userId: string, text: string): ActivityEntry[] => [...(row.activity ?? []), { id: genId("ac"), at: stamp(), userId, text }];
export const userName = (db: Database, id?: string | null) => db.users.find((u) => u.id === id)?.name ?? db.operators.find((o) => o.id === id)?.name ?? "—";

/** Trạng thái hiển thị: thêm "Hoàn thành muộn" và "Quá hạn" */
export function flowLabel(r: FlowRow, st: FlowStatus): "moi" | "dang" | "xong" | "xong_muon" | "qua_han" {
  if (r.status === st.xong) return r.completedAt && r.completedAt > r.deadline ? "xong_muon" : "xong";
  if (r.deadline < DEMO_TODAY) return "qua_han";
  return r.status === st.moi ? "moi" : "dang";
}
export const FLOW_BADGE: Record<ReturnType<typeof flowLabel>, string> = {
  moi: "bg-slate-100 text-slate-700 ring-slate-200",
  dang: "bg-sky-50 text-sky-700 ring-sky-200",
  qua_han: "bg-rose-50 text-rose-700 ring-rose-200",
  xong: "bg-green-50 text-green-700 ring-green-200",
  xong_muon: "bg-amber-50 text-amber-700 ring-amber-200",
};
export function FlowBadge({ r, st, labels }: { r: FlowRow; st: FlowStatus; labels: { moi: string; dang: string; xong: string } }) {
  const k = flowLabel(r, st);
  const text = k === "qua_han" ? `Quá hạn · ${r.status === st.moi ? labels.moi : labels.dang}` : k === "xong_muon" ? `${labels.xong} muộn` : labels[k];
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1", FLOW_BADGE[k])}>{text}</span>;
}

/** Người được giao (hoặc tài khoản toàn quyền) mới thao tác được */
export function useFlowActor(r: FlowRow) {
  const { user, can } = useAuth();
  return !!user && (user.id === r.assigneeId || can("admin"));
}

export function FlowActions({ r, collection, st, noun, resultFields, size = "xs", onResult }: { r: FlowRow; collection: CollectionKey; st: FlowStatus; noun: string; resultFields: ResultField[]; size?: "xs" | "sm" | "default"; onResult?: (r: FlowRow, vals: Record<string, unknown>, db: Database) => Database }) {
  const { run } = useDb();
  const { user } = useAuth();
  const actor = useFlowActor(r);
  const [open, setOpen] = useState(false);
  if (!actor || r.status === st.xong) return null;
  const accept = () => {
    run(saveRow, collection, { ...r, status: st.dang, activity: logAct(r, user!.id, `tiếp nhận ${noun} **${r.code}**`) } as never);
    toast.success(`Đã tiếp nhận ${r.code}`);
  };
  return (
    <>
      {r.status === st.moi
        ? <Button size={size} variant="soft" onClick={(e) => { e.stopPropagation(); accept(); }}><Hand /> Tiếp nhận</Button>
        : <Button size={size} variant="soft" onClick={(e) => { e.stopPropagation(); setOpen(true); }}><ClipboardCheck /> Cập nhật kết quả</Button>}
      <ResultDialog open={open} onOpenChange={setOpen} r={r} collection={collection} st={st} noun={noun} fields={resultFields} onResult={onResult} />
    </>
  );
}

function ResultDialog({ open, onOpenChange, r, collection, st, noun, fields, onResult }: { open: boolean; onOpenChange: (o: boolean) => void; r: FlowRow; collection: CollectionKey; st: FlowStatus; noun: string; fields: ResultField[]; onResult?: (r: FlowRow, vals: Record<string, unknown>, db: Database) => Database }) {
  const { run } = useDb();
  const { user } = useAuth();
  const [v, setV] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Attachment[]>([]);
  const [key, setKey] = useState(false);
  if (open && !key) { setKey(true); setV({ completedAt: DEMO_TODAY, ...Object.fromEntries(fields.map((f) => [f.key, (r as unknown as Record<string, unknown>)[f.key] ?? (f.type === "number" ? 0 : "")])) }); setFiles(r.files ?? []); }
  if (!open && key) setKey(false);
  const save = () => {
    const miss = fields.find((f) => f.required && (v[f.key] === "" || v[f.key] === undefined || (f.type === "number" && !(Number(v[f.key]) >= 0))));
    if (miss) return toast.error(`Nhập “${miss.label}”`);
    const done = String(v.completedAt || DEMO_TODAY);
    const late = done > r.deadline;
    const next = { ...r, ...v, completedAt: done, files, status: st.xong, activity: logAct(r, user!.id, `cập nhật kết quả, hoàn thành ${noun} **${r.code}**${late ? " (**muộn** so với hạn " + fmtDate(r.deadline) + ")" : ""}${files.length ? ` · đính kèm ${files.length} file` : ""}`) } as FlowRow;
    run((db: Database) => { const d = saveRow(db, collection, next as never); return onResult ? onResult(next, v, d) : d; });
    toast.success(late ? `Đã hoàn thành ${r.code} (muộn hạn)` : `Đã hoàn thành ${r.code}`);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" onClick={(e) => e.stopPropagation()}>
        <DialogHeader><DialogTitle>Cập nhật kết quả · {r.code}</DialogTitle><DialogDescription>Hạn hoàn thành {fmtDate(r.deadline)}</DialogDescription></DialogHeader>
        <DialogBody className="grid gap-3 sm:grid-cols-2">
          {fields.map((f) => (
            <FormField key={f.key} label={f.label} required={f.required} hint={f.hint} className={cn((f.wide || f.type === "textarea") && "sm:col-span-2")}>
              {f.type === "textarea" ? <Textarea rows={3} value={String(v[f.key] ?? "")} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
                : <Input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} value={String(v[f.key] ?? "")} onChange={(e) => setV({ ...v, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })} />}
            </FormField>
          ))}
          <FormField label="Ngày hoàn thành" required><Input type="date" max={DEMO_TODAY} value={String(v.completedAt ?? DEMO_TODAY)} onChange={(e) => setV({ ...v, completedAt: e.target.value })} /></FormField>
          <div className="sm:col-span-2"><div className="mb-1 text-[12.5px] font-medium text-slate-700">Biên bản, hồ sơ đính kèm</div><FileUploader value={files} onChange={setFiles} hint="Biên bản kiểm tra, nghiệm thu, hóa đơn, ảnh hiện trường…" /></div>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={save}><CheckCircle2 /> Lưu kết quả</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Màn chi tiết 2 cột: thông tin giao việc + kết quả | lịch sử hoạt động */
export function FlowDetail({ r, collection, st, labels, noun, title, info, result, resultFields, ctx, canEdit, onResult }: {
  r: FlowRow; collection: CollectionKey; st: FlowStatus; labels: FlowStatus; noun: string; title: ReactNode;
  info: [string, ReactNode][]; result: [string, ReactNode][]; resultFields: ResultField[];
  ctx: { close: () => void; edit: () => void; remove: () => void }; canEdit: boolean;
  onResult?: (r: FlowRow, vals: Record<string, unknown>, db: Database) => Database;
}) {
  const { db } = useDb();
  const created = r.createdById ? [{ id: "c0", at: r.createdAt, userId: r.createdById, text: <>tạo {noun} <b>{r.code}</b>, giao cho <b>{userName(db, r.assigneeId)}</b>, hạn {fmtDate(r.deadline)}</> }] : [];
  const items = [...created.filter(() => !(r.activity ?? []).length), ...(r.activity ?? []).map((a) => ({ id: a.id, at: a.at, userId: a.userId, text: rich(a.text) }))];
  return (
    <div className="flex max-h-[92vh] flex-col">
      <div className="flex items-start gap-3 border-b px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500"><span className="font-semibold text-slate-700">{r.code}</span><FlowBadge r={r} st={st} labels={labels} /></div>
          <h2 className="mt-1 text-[18px] font-bold text-slate-900">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pr-8">
          <FlowActions r={r} collection={collection} st={st} noun={noun} resultFields={resultFields} size="sm" onResult={onResult} />
          {canEdit && <><Button size="sm" variant="outline" onClick={ctx.edit}><Pencil /> Sửa</Button><Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={ctx.remove} aria-label="Xóa"><Trash2 /></Button></>}
        </div>
      </div>
      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[1fr_380px]">
        <div className="space-y-5 px-6 py-5">
          <section>
            <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Thông tin giao việc</h4>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div><dt className="text-[11.5px] text-slate-500">Người giao</dt><dd className="mt-0.5">{r.createdById ? <UserCell userId={r.createdById} /> : "—"}</dd></div>
              <div><dt className="text-[11.5px] text-slate-500">Người thực hiện</dt><dd className="mt-0.5"><UserCell userId={r.assigneeId} /></dd></div>
              <div><dt className="text-[11.5px] text-slate-500">Ngày giao</dt><dd className="text-[13.5px]">{fmtDate(r.createdAt)}</dd></div>
              <div><dt className="text-[11.5px] text-slate-500">Thời hạn hoàn thành</dt><dd className={cn("text-[13.5px]", flowLabel(r, st) === "qua_han" && "font-semibold text-rose-600")}>{fmtDate(r.deadline)}</dd></div>
              {info.map(([l, v]) => <div key={l} className={cn(typeof v === "string" && v.length > 60 && "sm:col-span-2")}><dt className="text-[11.5px] text-slate-500">{l}</dt><dd className="whitespace-pre-line text-[13.5px] text-slate-800">{v || "—"}</dd></div>)}
            </dl>
          </section>
          <section className="rounded-lg border bg-slate-50/60 p-4">
            <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Kết quả</h4>
            {r.status !== st.xong ? <p className="text-[13px] text-slate-500">{r.status === st.moi ? "Chờ người được giao tiếp nhận." : "Đang thực hiện – người được giao cập nhật kết quả khi xong."}</p> : (
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div><dt className="text-[11.5px] text-slate-500">Ngày hoàn thành</dt><dd className="text-[13.5px]">{r.completedAt ? fmtDate(r.completedAt) : "—"}</dd></div>
                {result.map(([l, v]) => <div key={l} className={cn(typeof v === "string" && v.length > 40 && "sm:col-span-2")}><dt className="text-[11.5px] text-slate-500">{l}</dt><dd className="whitespace-pre-line text-[13.5px] text-slate-800">{v || "—"}</dd></div>)}
                <div className="sm:col-span-2"><dt className="mb-1 text-[11.5px] text-slate-500">Biên bản, hồ sơ</dt><AttachmentList files={r.files ?? []} empty="Không đính kèm" /></div>
              </dl>
            )}
          </section>
        </div>
        <aside className="border-t bg-slate-50/40 px-5 py-5 lg:border-l lg:border-t-0">
          <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Lịch sử hoạt động</h4>
          <ActivityLog items={items} />
        </aside>
      </div>
    </div>
  );
}

/** Ghi lịch sử khi tạo / sửa (dùng cho beforeSave của RegistryPage) */
export function flowBeforeSave<T extends FlowRow>(noun: string, userId: string) {
  return (row: T, isNew: boolean, db: Database): T => {
    if (isNew) return { ...row, createdById: row.createdById ?? userId, activity: logAct(row, userId, `tạo ${noun} **${row.code}**, giao cho **${userName(db, row.assigneeId)}**, hạn ${fmtDate(row.deadline)}`) };
    return { ...row, activity: logAct(row, userId, `cập nhật thông tin ${noun}`) };
  };
}
