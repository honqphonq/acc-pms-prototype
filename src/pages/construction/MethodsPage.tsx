import { useState } from "react";
import { CheckCircle2, GitBranch, History, MessageSquare, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/common/FormField";
import { AttachmentList, FileUploader } from "@/components/common/Attachments";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Avatar } from "@/components/common/UserAvatar";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { saveRow } from "@/services/actions";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { genId } from "@/utils/id";
import { METHOD_STATUS, projectOptions, toOptions } from "@/utils/labels";
import type { Attachment, ConstructionMethod } from "@/types";

function MethodDetail({ m }: { m: ConstructionMethod }) {
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const [text, setText] = useState("");
  const [adj, setAdj] = useState<{ summary: string; files: Attachment[]; note: string } | null>(null);
  const name = (id: string) => db.users.find((u) => u.id === id)?.name ?? "";
  const save = (c: Partial<ConstructionMethod>, msg: string) => { run(saveRow, "constructionMethods", { ...m, ...c, updatedAt: DEMO_TODAY }); toast.success(msg); };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {m.status === "du_thao" && <Button size="sm" onClick={() => save({ status: "cho_gop_y" }, "Đã gửi phương án để lấy góp ý")}><Send /> Gửi lấy góp ý</Button>}
        {m.status === "cho_gop_y" && can("plan.edit") && <Button size="sm" variant="success" onClick={() => save({ status: "da_duyet" }, "Đã phê duyệt phương án")}><CheckCircle2 /> Phê duyệt phương án</Button>}
        <Button size="sm" variant="outline" onClick={() => setAdj({ summary: m.summary, files: m.files, note: "" })}><GitBranch /> Cập nhật phương án</Button>
      </div>
      <section>
        <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">Bản hiện hành</h4>
        <div className="mb-2 text-[12px] text-slate-500">Cập nhật {fmtDate(m.updatedAt)} · {name(m.versions[m.versions.length - 1]?.byId ?? m.createdById)}</div>
        <AttachmentList files={m.files} />
      </section>
      <section>
        <h4 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-600"><MessageSquare className="h-3.5 w-3.5" /> Góp ý ({m.comments.length})</h4>
        <div className="space-y-2.5">
          {m.comments.map((c) => (
            <div key={c.id} className="flex gap-2.5"><Avatar name={name(c.byId)} size="sm" /><div className="flex-1 rounded-lg bg-slate-50 px-3 py-2 text-[13px]"><div className="text-[11.5px] text-slate-500"><b className="text-slate-700">{name(c.byId)}</b> · {fmtDate(c.at)}</div>{c.content}</div></div>
          ))}
          {!m.comments.length && <p className="text-xs text-slate-400">Chưa có góp ý.</p>}
        </div>
        <div className="mt-3 flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập góp ý về phương án..." />
          <Button size="sm" disabled={!text.trim()} onClick={() => { save({ comments: [...m.comments, { id: genId("cm"), byId: user!.id, at: DEMO_TODAY, content: text }] }, "Đã gửi góp ý"); setText(""); }}>Gửi</Button>
        </div>
      </section>
      <section>
        <h4 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-600"><History className="h-3.5 w-3.5" /> Các bản cũ ({Math.max(0, m.versions.length - 1)})</h4>
        {m.versions.length > 1 ? (
          <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
            {m.versions.slice(0, -1).reverse().map((v) => (
              <li key={v.version} className="relative text-[13px]">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-400" />
                <div className="text-slate-700">{fmtDate(v.at)} · <b>{name(v.byId)}</b> · {v.note}</div>
                {v.summary && <div className="mt-0.5 text-[12px] text-slate-500">{v.summary}</div>}
                {!!v.files?.length && <div className="mt-1.5"><AttachmentList files={v.files} /></div>}
              </li>
            ))}
          </ol>
        ) : <p className="text-xs text-slate-400">Chưa có bản cũ.</p>}
      </section>
      <Dialog open={!!adj} onOpenChange={(o) => !o && setAdj(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Cập nhật phương án</DialogTitle></DialogHeader>
          {adj && (
            <DialogBody className="space-y-3">
              <FormField label="Nội dung chính"><Textarea rows={4} value={adj.summary} onChange={(e) => setAdj({ ...adj, summary: e.target.value })} /></FormField>
              <FormField label="Tài liệu đính kèm"><FileUploader value={adj.files} onChange={(files) => setAdj({ ...adj, files })} /></FormField>
              <FormField label="Ghi chú điều chỉnh (không bắt buộc)"><Input value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} placeholder="VD: Bổ sung trạm trộn dự phòng" /></FormField>
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdj(null)}>Hủy</Button>
            <Button onClick={() => { if (!adj) return; const v = m.version + 1; const prev = m.versions.map((x, i) => (i === m.versions.length - 1 ? { ...x, summary: m.summary, files: m.files } : x)); save({ summary: adj.summary, files: adj.files, version: v, status: m.status === "da_duyet" ? "cho_gop_y" : m.status, versions: [...prev, { version: v, at: DEMO_TODAY, byId: user!.id, note: adj.note || "Cập nhật phương án" }] }, "Đã cập nhật phương án – bản trước được lưu trong lịch sử"); setAdj(null); }}>Lưu</Button>
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
      description="Lập, góp ý, cập nhật phương án tổ chức thi công, biện pháp thi công của từng công trình."
      searchText={(m) => `${m.code} ${m.title} ${m.summary}`}
      filters={[{ label: "Tất cả dự án", options: projectOptions, test: (m, v) => m.projectId === v, initial: new URLSearchParams(window.location.search).get("project") ?? "p01" }, { label: "Tất cả trạng thái", options: toOptions(METHOD_STATUS), test: (m, v) => m.status === v }]}
      kpis={(rows) => [
        { label: "Phương án / biện pháp", value: rows.length, tone: "navy" },
        { label: "Đang lấy góp ý", value: rows.filter((r) => r.status === "cho_gop_y").length, tone: "warning" },
        { label: "Đã phê duyệt", value: rows.filter((r) => r.status === "da_duyet").length, tone: "success" },
      ]}
      newRecord={() => ({ projectId: "p01", itemId: null, status: "du_thao", version: 1, createdById: user!.id, updatedAt: DEMO_TODAY, files: [], versions: [{ version: 1, at: DEMO_TODAY, byId: user!.id, note: "Lập phương án" }], comments: [] })}
      columns={[
        { key: "code", header: "Mã", sortValue: (m) => m.code, cell: (m) => <span className="whitespace-nowrap font-medium">{m.code}</span> },
        { key: "t", header: "Phương án tổ chức thi công", sortValue: (m) => m.title, cell: (m) => <div className="max-w-md"><div className="font-medium text-slate-800">{m.title}</div><div className="truncate text-[11.5px] text-slate-400">{m.summary}</div></div> },
        { key: "p", header: "Dự án", sortValue: (m) => db.projects.find((p) => p.id === m.projectId)?.shortName ?? "", cell: (m) => <span className="whitespace-nowrap">{db.projects.find((p) => p.id === m.projectId)?.shortName}</span> },
        { key: "f", header: "File", align: "center", filter: false, cell: (m) => (m.files.length ? <span className="inline-flex items-center gap-0.5 text-slate-600"><Paperclip className="h-3.5 w-3.5" />{m.files.length}</span> : <span className="text-slate-300">—</span>) },
        { key: "u", header: "Cập nhật", sortValue: (m) => m.updatedAt, cell: (m) => <span className="whitespace-nowrap text-xs">{fmtDate(m.updatedAt)}</span> },
        { key: "s", header: "Trạng thái", sortValue: (m) => m.status, cell: (m) => <StatusBadge map={METHOD_STATUS} value={m.status} /> },
      ]}
      fields={[
        { key: "title", label: "Tên phương án / biện pháp", required: true, wide: true },
        { key: "projectId", label: "Dự án", type: "select", options: projectOptions, required: true, wide: true },
        { key: "summary", label: "Nội dung chính", type: "textarea" },
        { key: "files", label: "Đính kèm file", type: "files", hideInDetail: true },
      ]}
      detail={(m) => <MethodDetail m={m} />}
    />
  );
}
