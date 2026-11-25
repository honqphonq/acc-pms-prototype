import { useState } from "react";
import { CirclePlus, Clock, FolderKanban, History, MessageSquare, Paperclip, Pencil, Send, Trash2, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/common/FormField";
import { AttachmentList, FileUploader } from "@/components/common/Attachments";
import { Avatar, AvatarGroup, UserCell } from "@/components/common/UserAvatar";
import { ActivityLog, rich } from "@/components/common/ActivityLog";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { saveRow } from "@/services/actions";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate, fmtDateTime } from "@/utils/format";
import { genId } from "@/utils/id";
import { projectOptions } from "@/utils/labels";
import { cn } from "@/utils/cn";
import type { ActivityEntry, Attachment, ConstructionMethod, ID } from "@/types";

const nowAt = () => `${DEMO_TODAY}T${new Date().toTimeString().slice(0, 8)}`;

/** Chọn người theo dõi */
function FollowerPicker({ value, onChange, children }: { value: ID[]; onChange: (v: ID[]) => void; children: React.ReactNode }) {
  const { db } = useDb();
  const [q, setQ] = useState("");
  const kw = q.trim().toLowerCase();
  const list = db.users.filter((u) => !kw || `${u.name} ${u.title}`.toLowerCase().includes(kw)).slice(0, 60);
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b px-3 py-2"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm người…" className="h-7 w-full bg-transparent text-[13px] outline-none" /></div>
        <div className="max-h-72 overflow-y-auto py-1">
          {list.map((u) => {
            const on = value.includes(u.id);
            return (
              <button key={u.id} type="button" onClick={() => onChange(on ? value.filter((x) => x !== u.id) : [...value, u.id])} className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50", on && "bg-primary-soft/60")}>
                <Avatar name={u.name} size="xs" />
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-slate-800">{u.name}</span><span className="block truncate text-[11px] text-slate-500">{u.title}</span></span>
                {on && <span className="text-[11px] font-semibold text-primary">✓</span>}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Chi tiết phương án: giống chi tiết Công việc điều hành – file hiện hành, góp ý, lịch sử thay đổi, các bản cũ (không phê duyệt) */
function MethodDetail({ m, edit, remove }: { m: ConstructionMethod; edit: () => void; remove: () => void }) {
  const { db, run } = useDb();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [adj, setAdj] = useState<{ summary: string; files: Attachment[]; note: string } | null>(null);
  const name = (id: string) => db.users.find((u) => u.id === id)?.name ?? "";
  const project = db.projects.find((p) => p.id === m.projectId);
  const log = (text: string, c: Partial<ConstructionMethod>, msg: string) => {
    const at = nowAt();
    const entry: ActivityEntry = { id: genId("ac"), at, userId: user!.id, text };
    run(saveRow, "constructionMethods", { ...m, ...c, updatedAt: DEMO_TODAY, activity: [...(m.activity ?? []), entry] });
    toast.success(msg);
  };
  const sec = "text-[13px] font-bold uppercase tracking-wide text-slate-800";
  const side = "border-b px-4 py-2.5 text-[12.5px] font-bold uppercase tracking-wide text-emerald-700";
  const current = m.versions[m.versions.length - 1];
  return (
    <div className="grid max-h-[92vh] overflow-y-auto bg-slate-50 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3 p-4">
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-slate-500">{m.code}</div>
              <h2 className="mt-1 text-[22px] font-bold leading-snug text-slate-900">{m.title}</h2>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="outline" onClick={edit}><Pencil /> Sửa</Button>
              <Button size="sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={remove} aria-label="Xóa"><Trash2 /></Button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-[150px_1fr] gap-2 text-[13.5px]">
            <span className="flex items-center gap-2.5 text-slate-500"><FolderKanban className="h-4 w-4" />Dự án</span><span className="font-medium text-slate-800">{project?.name}</span>
          </div>
          <div className="mt-4 text-[12.5px] font-semibold text-slate-600">Nội dung chính</div>
          <p className="mt-1 whitespace-pre-line text-[14px] text-slate-700">{m.summary || <span className="text-slate-400">—</span>}</p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className={sec}>Bản hiện hành</div>
            <span className="text-[12px] text-slate-500">· cập nhật {fmtDate(m.updatedAt)} · {name(current?.byId ?? m.createdById)}</span>
            <Button size="sm" className="ml-auto" onClick={() => setAdj({ summary: m.summary, files: [], note: "" })}><Upload /> Tải bản mới</Button>
          </div>
          <div className="mt-3">{m.files.length ? <AttachmentList files={m.files} /> : <p className="text-[13px] text-slate-400">Chưa có file.</p>}</div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className={cn(sec, "flex items-center gap-1.5")}><MessageSquare className="h-4 w-4" /> Góp ý ({m.comments.length})</div>
          <div className="mt-3 space-y-3">
            {m.comments.map((c) => (
              <div key={c.id} className="flex gap-2.5"><Avatar name={name(c.byId)} size="sm" /><div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2"><div className="text-[12px]"><b className="text-slate-800">{name(c.byId)}</b> <span className="text-slate-400">· {c.at.length > 10 ? fmtDateTime(c.at) : fmtDate(c.at)}</span></div><div className="whitespace-pre-line text-[13.5px] text-slate-700">{c.content}</div></div></div>
            ))}
            {!m.comments.length && <p className="text-[13px] text-slate-400">Chưa có góp ý.</p>}
          </div>
          <div className="mt-3 flex items-end gap-2">
            <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Góp ý / yêu cầu chỉnh sửa phương án… (Enter để gửi)"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) { log(`góp ý: ${text.trim()}`, { comments: [...m.comments, { id: genId("cm"), byId: user!.id, at: nowAt(), content: text.trim() }] }, "Đã gửi góp ý"); setText(""); } } }} />
            <Button size="icon" aria-label="Gửi" disabled={!text.trim()} onClick={() => { log(`góp ý: ${text.trim()}`, { comments: [...m.comments, { id: genId("cm"), byId: user!.id, at: nowAt(), content: text.trim() }] }, "Đã gửi góp ý"); setText(""); }}><Send /></Button>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-l bg-slate-50 p-4">
        <div className="rounded-xl border bg-white"><div className={side}>Người lập</div><div className="px-4 py-3"><UserCell userId={m.createdById} sub="" /></div></div>
        <div className="rounded-xl border bg-white">
          <div className={side}>Người theo dõi</div>
          <div className="space-y-2 px-4 py-3">
            {m.followerIds?.length ? <AvatarGroup userIds={m.followerIds} max={8} /> : <span className="text-[12.5px] text-slate-400">Chưa có</span>}
            <FollowerPicker value={m.followerIds ?? []} onChange={(v) => {
              const added = v.filter((x) => !(m.followerIds ?? []).includes(x));
              log(added.length ? `thêm người theo dõi **${added.map(name).join(", ")}**` : "cập nhật người theo dõi", { followerIds: v }, "Đã cập nhật người theo dõi");
            }}>
              <button type="button" className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-primary"><UserPlus className="h-4 w-4" /> Người theo dõi</button>
            </FollowerPicker>
            <p className="text-[11.5px] text-slate-400">Người theo dõi nhận thông báo khi có bản mới hoặc góp ý mới.</p>
          </div>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 text-[13px]">
          <div className="flex items-center gap-2 py-1 text-slate-500"><CirclePlus className="h-4 w-4" />TG tạo: <b className="text-slate-800">{fmtDate(m.versions[0]?.at)}</b></div>
          <div className="flex items-center gap-2 border-t py-1 pt-1.5 text-slate-500"><Clock className="h-4 w-4" />TG cập nhật: <b className="text-slate-800">{fmtDate(m.updatedAt)}</b></div>
        </div>
        <div className="rounded-xl border bg-white">
          <div className={cn(side, "flex items-center gap-1.5")}><History className="h-4 w-4" /> Các bản cũ ({Math.max(0, m.versions.length - 1)})</div>
          <div className="px-4 py-3">
            {m.versions.length > 1 ? (
              <ol className="space-y-3">
                {m.versions.slice(0, -1).reverse().map((v) => (
                  <li key={v.version} className="text-[12.5px]">
                    <div className="text-slate-700">{fmtDate(v.at)} · <b>{name(v.byId)}</b></div>
                    <div className="text-slate-500">{v.note}</div>
                    {!!v.files?.length && <div className="mt-1.5"><AttachmentList files={v.files} /></div>}
                  </li>
                ))}
              </ol>
            ) : <p className="text-[12.5px] text-slate-400">Chưa có bản cũ.</p>}
          </div>
        </div>
        <div className="rounded-xl border bg-white">
          <div className={side}>Lịch sử hoạt động</div>
          <div className="px-4 py-3"><ActivityLog items={(m.activity ?? []).map((a) => ({ id: a.id, at: a.at, userId: a.userId, text: rich(a.text) }))} /></div>
        </div>
      </div>

      <Dialog open={!!adj} onOpenChange={(o) => !o && setAdj(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Tải bản mới</DialogTitle><DialogDescription>Bản hiện hành sẽ được chuyển xuống “Các bản cũ”.</DialogDescription></DialogHeader>
          {adj && (
            <DialogBody className="space-y-3">
              <FormField label="File phương án bản mới" required><FileUploader value={adj.files} onChange={(files) => setAdj({ ...adj, files })} /></FormField>
              <FormField label="Ghi chú lần sửa"><Input value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} placeholder="VD: Điều chỉnh theo góp ý TVGS, bổ sung trạm trộn dự phòng" /></FormField>
              <FormField label="Nội dung chính (nếu thay đổi)"><Textarea rows={3} value={adj.summary} onChange={(e) => setAdj({ ...adj, summary: e.target.value })} /></FormField>
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdj(null)}>Hủy</Button>
            <Button onClick={() => {
              if (!adj) return;
              if (!adj.files.length) return toast.error("Chọn file phương án bản mới");
              const v = m.version + 1;
              const prev = m.versions.map((x, i) => (i === m.versions.length - 1 ? { ...x, summary: m.summary, files: m.files } : x));
              const note = adj.note.trim() || "Cập nhật phương án";
              log(`tải bản mới **${adj.files[0].name}** – ${note}`, { summary: adj.summary, files: adj.files, version: v, versions: [...prev, { version: v, at: DEMO_TODAY, byId: user!.id, note }] }, "Đã tải bản mới – bản trước được lưu trong Các bản cũ");
              setAdj(null);
            }}>Lưu bản mới</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MethodsPage() {
  const { db } = useDb();
  const { user } = useAuth();
  return (
    <RegistryPage<ConstructionMethod>
      title="Phương án tổ chức thi công" entityLabel="phương án" addLabel="Tạo phương án" codePrefix="PA-" collection="constructionMethods"
      searchText={(m) => `${m.code} ${m.title} ${m.summary}`}
      filters={[{ label: "Tất cả dự án", options: projectOptions, test: (m, v) => m.projectId === v, initial: new URLSearchParams(window.location.search).get("project") ?? "p01" }]}
      newRecord={() => ({ projectId: "p01", itemId: null, status: "du_thao", version: 1, createdById: user!.id, updatedAt: DEMO_TODAY, files: [], versions: [{ version: 1, at: DEMO_TODAY, byId: user!.id, note: "Lập phương án" }], comments: [], followerIds: [], activity: [{ id: genId("ac"), at: nowAt(), userId: user!.id, text: "lập phương án" }] })}
      columns={[
        { key: "code", header: "Mã", sortValue: (m) => m.code, cell: (m) => <span className="whitespace-nowrap font-medium">{m.code}</span> },
        { key: "t", header: "Phương án tổ chức thi công", sortValue: (m) => m.title, cell: (m) => <div className="max-w-xl"><div className="font-medium text-slate-800">{m.title}</div><div className="truncate text-[11.5px] text-slate-400">{m.summary}</div></div> },
        { key: "p", header: "Dự án", sortValue: (m) => db.projects.find((p) => p.id === m.projectId)?.shortName ?? "", cell: (m) => <span className="whitespace-nowrap">{db.projects.find((p) => p.id === m.projectId)?.shortName}</span> },
        { key: "f", header: "File", align: "center", filter: false, cell: (m) => (m.files.length ? <span className="inline-flex items-center gap-0.5 text-slate-600"><Paperclip className="h-3.5 w-3.5" />{m.files.length}</span> : <span className="text-slate-300">—</span>) },
        { key: "u", header: "Cập nhật", sortValue: (m) => m.updatedAt, cell: (m) => <span className="whitespace-nowrap text-xs">{fmtDate(m.updatedAt)}</span> },
      ]}
      fields={[
        { key: "title", label: "Tên phương án / biện pháp", required: true, wide: true },
        { key: "projectId", label: "Dự án", type: "select", options: projectOptions, required: true, wide: true },
        { key: "summary", label: "Nội dung chính", type: "textarea" },
        { key: "files", label: "Đính kèm file", type: "files", hideInDetail: true },
      ]}
      detailView={(m, ctx) => <MethodDetail m={m} edit={ctx.edit} remove={ctx.remove} />}
    />
  );
}
