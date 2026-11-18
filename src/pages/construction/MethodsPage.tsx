import { useState } from "react";
import { CheckCircle2, FileText, GitBranch, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Avatar } from "@/components/common/UserAvatar";
import { RegistryPage } from "@/components/registry/RegistryPage";
import { saveRow } from "@/services/actions";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { genId } from "@/utils/id";
import { METHOD_STATUS, projectOptions, toOptions } from "@/utils/labels";
import type { ConstructionMethod } from "@/types";

function MethodDetail({ m }: { m: ConstructionMethod }) {
  const { db, run } = useDb();
  const { user, can } = useAuth();
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const name = (id: string) => db.users.find((u) => u.id === id)?.name ?? "";
  const save = (c: Partial<ConstructionMethod>, msg: string) => { run(saveRow, "constructionMethods", { ...m, ...c, updatedAt: DEMO_TODAY }); toast.success(msg); };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {m.status === "du_thao" && <Button size="sm" onClick={() => save({ status: "cho_gop_y" }, "Đã gửi phương án để lấy góp ý")}><Send /> Gửi lấy góp ý</Button>}
        {m.status === "cho_gop_y" && can("plan.edit") && <Button size="sm" variant="success" onClick={() => save({ status: "da_duyet" }, "Đã phê duyệt phương án")}><CheckCircle2 /> Phê duyệt phương án</Button>}
      </div>
      <section>
        <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Tài liệu đính kèm</h4>
        <div className="flex flex-wrap gap-2">{m.files.map((f) => <span key={f} className="flex items-center gap-1.5 rounded-md border bg-slate-50 px-2.5 py-1.5 text-xs"><FileText className="h-3.5 w-3.5 text-primary" />{f}</span>)}</div>
      </section>
      <section>
        <h4 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500"><GitBranch className="h-3.5 w-3.5" /> Lịch sử phiên bản</h4>
        <ol className="space-y-2 border-l-2 border-slate-200 pl-4">
          {[...m.versions].reverse().map((v) => (
            <li key={v.version} className="relative text-[13px]"><span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" /><b>v{v.version}</b> · {fmtDate(v.at)} · {name(v.byId)}<div className="text-slate-500">{v.note}</div></li>
          ))}
        </ol>
        <div className="mt-3 flex gap-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nội dung điều chỉnh phương án..." />
          <Button size="sm" variant="outline" disabled={!note.trim()} onClick={() => { save({ version: m.version + 1, status: "cho_gop_y", versions: [...m.versions, { version: m.version + 1, at: DEMO_TODAY, byId: user!.id, note }] }, `Đã tạo phiên bản v${m.version + 1}`); setNote(""); }}>Điều chỉnh (v{m.version + 1})</Button>
        </div>
      </section>
      <section>
        <h4 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500"><MessageSquare className="h-3.5 w-3.5" /> Góp ý ({m.comments.length})</h4>
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
    </div>
  );
}

export default function MethodsPage() {
  const { db } = useDb();
  const { user } = useAuth();
  const item = (id: string | null) => db.constructionItems.find((i) => i.id === id);
  return (
    <RegistryPage<ConstructionMethod>
      title="Phương án tổ chức thi công" entityLabel="phương án" addLabel="Tạo phương án" codePrefix="PA-" collection="constructionMethods"
      description="Lập, góp ý, điều chỉnh và quản lý lịch sử phiên bản phương án tổ chức thi công, biện pháp thi công của từng công trình."
      searchText={(m) => `${m.code} ${m.title} ${m.summary}`}
      filters={[{ label: "Tất cả công trình", options: projectOptions, test: (m, v) => m.projectId === v, initial: "p01" }, { label: "Tất cả trạng thái", options: toOptions(METHOD_STATUS), test: (m, v) => m.status === v }]}
      kpis={(rows) => [
        { label: "Phương án / biện pháp", value: rows.length, tone: "navy" },
        { label: "Đang lấy góp ý", value: rows.filter((r) => r.status === "cho_gop_y").length, tone: "warning" },
        { label: "Đã phê duyệt", value: rows.filter((r) => r.status === "da_duyet").length, tone: "success" },
      ]}
      newRecord={() => ({ projectId: "p01", itemId: null, status: "du_thao", version: 1, createdById: user!.id, updatedAt: DEMO_TODAY, files: [], versions: [{ version: 1, at: DEMO_TODAY, byId: user!.id, note: "Lập phương án" }], comments: [] })}
      columns={[
        { key: "code", header: "Mã", sortValue: (m) => m.code, cell: (m) => <span className="whitespace-nowrap font-medium">{m.code}</span> },
        { key: "t", header: "Phương án tổ chức thi công", sortValue: (m) => m.title, cell: (m) => <div className="max-w-md"><div className="font-medium text-slate-800">{m.title}</div><div className="truncate text-[11.5px] text-slate-400">{m.summary}</div></div> },
        { key: "p", header: "Công trình / hạng mục", cell: (m) => <div className="text-xs"><div>{db.projects.find((p) => p.id === m.projectId)?.shortName}</div><div className="text-slate-400">{item(m.itemId)?.name ?? "Toàn công trình"}</div></div> },
        { key: "v", header: "Phiên bản", sortValue: (m) => m.version, cell: (m) => <Badge tone="outline">v{m.version}</Badge> },
        { key: "c", header: "Góp ý", align: "center", cell: (m) => m.comments.length },
        { key: "u", header: "Cập nhật", sortValue: (m) => m.updatedAt, cell: (m) => <span className="whitespace-nowrap text-xs">{fmtDate(m.updatedAt)}</span> },
        { key: "s", header: "Trạng thái", sortValue: (m) => m.status, cell: (m) => <StatusBadge map={METHOD_STATUS} value={m.status} /> },
      ]}
      fields={[
        { key: "title", label: "Tên phương án / biện pháp", required: true, wide: true },
        { key: "projectId", label: "Công trình", type: "select", options: projectOptions, required: true },
        { key: "itemId", label: "Hạng mục áp dụng", type: "select", options: (d) => d.constructionItems.filter((i) => i.projectId === "p01").map((i) => ({ value: i.id, label: `${i.code}. ${i.name}` })) },
        { key: "status", label: "Trạng thái", type: "select", options: toOptions(METHOD_STATUS) },
        { key: "version", label: "Phiên bản", type: "number" },
        { key: "summary", label: "Nội dung chính", type: "textarea" },
      ]}
      detail={(m) => <MethodDetail m={m} />}
    />
  );
}
