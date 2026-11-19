import { useNavigate } from "react-router-dom";
import { ChevronRight, FileCheck2, FileWarning, Folder, Paperclip, Plus } from "lucide-react";
import { useDb } from "@/hooks/useDb";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { DEMO_TODAY, diffDays } from "@/utils/date";
import { fmtDate, fmtNumber, fmtVnd } from "@/utils/format";
import { METHOD_STATUS, STAFF_TYPE } from "@/utils/labels";
import { cn } from "@/utils/cn";
import type { SiteStaff } from "@/types";

/** Tab Hợp đồng: hợp đồng và phụ lục của dự án */
export function ContractsTab({ projectId }: { projectId: string }) {
  const { db } = useDb();
  const navigate = useNavigate();
  const project = db.projects.find((p) => p.id === projectId)!;
  const list = db.contracts.filter((c) => c.projectId === projectId).sort((a, b) => (a.parentId ?? a.id).localeCompare(b.parentId ?? b.id) || Number(a.kind === "phu_luc") - Number(b.kind === "phu_luc") || a.signDate.localeCompare(b.signDate));
  const go = () => navigate(`/projects/contracts?project=${projectId}`);
  return (
    <Card>
      <CardHeader><CardTitle>Hợp đồng & phụ lục ({list.length})</CardTitle><div className="flex items-center gap-3"><span className="text-[13px] text-slate-600">Giá trị hợp đồng (đã cộng phụ lục): <b className="text-slate-900">{fmtVnd(project.contractValue)} đ</b></span><Button size="sm" variant="outline" onClick={go}>Quản lý hợp đồng <ChevronRight /></Button></div></CardHeader>
      {list.length === 0 ? <EmptyState title="Dự án chưa có hợp đồng" action={<Button onClick={go}><Plus /> Thêm hợp đồng</Button>} /> : (
        <Table>
          <TableHeader><TableRow><TableHead>Số hợp đồng / phụ lục</TableHead><TableHead>Loại</TableHead><TableHead>Nội dung</TableHead><TableHead className="text-right">Giá trị (đ)</TableHead><TableHead>Thời gian</TableHead><TableHead>File</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={go}>
                <TableCell className={cn(c.kind === "phu_luc" && "pl-8")}><div className="font-semibold">{c.kind === "phu_luc" && <span className="mr-1 text-slate-400">└</span>}{c.code}</div><div className="text-[12px] text-slate-500">Ký {fmtDate(c.signDate)}</div></TableCell>
                <TableCell><span className={cn("rounded px-2 py-0.5 text-[12px] font-medium", c.kind === "hop_dong" ? "bg-primary-soft text-primary" : "bg-slate-100 text-slate-700")}>{c.kind === "hop_dong" ? "Hợp đồng" : "Phụ lục"}</span></TableCell>
                <TableCell className="max-w-[360px]"><div className="truncate">{c.title}</div></TableCell>
                <TableCell className={cn("tabular whitespace-nowrap text-right font-semibold", c.kind === "phu_luc" && c.value > 0 && "text-success-fg")}>{c.kind === "phu_luc" && c.value > 0 ? "+" : ""}{fmtVnd(c.value)}</TableCell>
                <TableCell className="whitespace-nowrap">{fmtDate(c.startDate)} – {fmtDate(c.endDate)}</TableCell>
                <TableCell>{c.files.length ? <span className="inline-flex items-center gap-0.5 text-slate-600"><Paperclip className="h-3.5 w-3.5" />{c.files.length}</span> : <span className="text-slate-300">—</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

/** Tab Phương án tổ chức thi công của dự án */
export function MethodsTab({ projectId }: { projectId: string }) {
  const { db } = useDb();
  const navigate = useNavigate();
  const list = db.constructionMethods.filter((m) => m.projectId === projectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const go = () => navigate(`/construction/methods?project=${projectId}`);
  return (
    <Card>
      <CardHeader><CardTitle>Phương án tổ chức thi công ({list.length})</CardTitle><Button size="sm" variant="outline" onClick={go}>Quản lý phương án <ChevronRight /></Button></CardHeader>
      {list.length === 0 ? <EmptyState title="Chưa có phương án tổ chức thi công" action={<Button onClick={go}><Plus /> Tạo phương án</Button>} /> : (
        <Table>
          <TableHeader><TableRow><TableHead>Mã</TableHead><TableHead>Phương án / biện pháp</TableHead><TableHead>Phiên bản</TableHead><TableHead className="text-center">Góp ý</TableHead><TableHead className="text-center">File</TableHead><TableHead>Cập nhật</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map((m) => (
              <TableRow key={m.id} className="cursor-pointer" onClick={go}>
                <TableCell className="whitespace-nowrap font-semibold">{m.code}</TableCell>
                <TableCell className="max-w-[440px]"><div className="font-medium">{m.title}</div><div className="truncate text-[12px] text-slate-500">{m.summary}</div></TableCell>
                <TableCell><Badge tone="outline">v{m.version}</Badge></TableCell>
                <TableCell className="text-center">{m.comments.length}</TableCell>
                <TableCell className="text-center">{m.files.length}</TableCell>
                <TableCell className="whitespace-nowrap">{fmtDate(m.updatedAt)}</TableCell>
                <TableCell><StatusBadge map={METHOD_STATUS} value={m.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

const hasSafety = (s: SiteStaff) => !!s.safetyCardFile || (s.safetyCard && s.safetyCardFile === undefined);
const missing = (s: SiteStaff) => [!(s.idFront && s.idBack) && "CCCD", !s.certFiles?.length && s.type !== "lao_dong_pho_thong" && "Chứng chỉ", !hasSafety(s) && "Thẻ ATLĐ", !s.healthFile && "Giấy KSK"].filter(Boolean) as string[];

/** Tab Nhân sự thi công: theo tổ đội */
export function StaffTab({ projectId }: { projectId: string }) {
  const { db } = useDb();
  const navigate = useNavigate();
  const list = db.siteStaff.filter((s) => s.projectId === projectId && s.status === "dang_lam");
  const teams = [...new Set(list.map((s) => s.team))];
  const go = () => navigate(`/construction/staff?project=${projectId}`);
  const kskLate = (s: SiteStaff) => !s.healthCheck || diffDays(s.healthCheck, DEMO_TODAY) > 365;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Nhân sự thi công đang làm việc ({list.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            {Object.entries(STAFF_TYPE).map(([k, v]) => <Badge key={k} tone={v.tone}>{v.label}: {list.filter((s) => s.type === k).length}</Badge>)}
            <Badge tone="danger">Thiếu thẻ ATLĐ: {list.filter((s) => !hasSafety(s)).length}</Badge>
            <Badge tone="warning">Quá hạn KSK: {list.filter(kskLate).length}</Badge>
            <Button size="sm" variant="outline" onClick={go}>Quản lý nhân sự <ChevronRight /></Button>
          </div>
        </CardHeader>
      </Card>
      {list.length === 0 && <Card><EmptyState title="Chưa có nhân sự thi công" action={<Button onClick={go}><Plus /> Thêm nhân sự</Button>} /></Card>}
      <div className="grid gap-4 lg:grid-cols-2">
        {teams.map((t) => {
          const ms = list.filter((s) => s.team === t).sort((a, b) => Object.keys(STAFF_TYPE).indexOf(a.type) - Object.keys(STAFF_TYPE).indexOf(b.type));
          return (
            <Card key={t}>
              <CardHeader><CardTitle>{t}</CardTitle><span className="text-[13px] text-slate-500">{ms.length} người</span></CardHeader>
              <div className="divide-y">
                {ms.map((s) => { const m = missing(s); return (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-2 text-[13.5px]">
                    <span className="min-w-0 flex-1"><span className="font-semibold">{s.name}</span><span className="ml-2 text-[12px] text-slate-500">{s.position}</span></span>
                    <StatusBadge map={STAFF_TYPE} value={s.type} dot={false} />
                    <span title={m.length ? `Còn thiếu: ${m.join(", ")}` : "Đủ hồ sơ"} className={m.length ? "text-amber-600" : "text-success-fg"}>{m.length ? <FileWarning className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}</span>
                  </div>
                ); })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/** Tab Hồ sơ thi công: thư mục cấp 1 của dự án */
export function DocsTab({ projectId }: { projectId: string }) {
  const { db } = useDb();
  const navigate = useNavigate();
  const folders = db.docFolders.filter((f) => f.projectId === projectId);
  const desc = (id: string): string[] => [id, ...folders.filter((f) => f.parentId === id).flatMap((f) => desc(f.id))];
  const top = folders.filter((f) => !f.parentId).sort((a, b) => a.order - b.order);
  const go = () => navigate(`/construction/documents?project=${projectId}`);
  return (
    <Card>
      <CardHeader><CardTitle>Hồ sơ thi công ({db.documents.filter((d) => d.projectId === projectId).length} tài liệu)</CardTitle><Button size="sm" variant="outline" onClick={go}>Mở hồ sơ thi công <ChevronRight /></Button></CardHeader>
      {top.length === 0 ? <EmptyState title="Chưa có thư mục hồ sơ" action={<Button onClick={go}><Plus /> Tạo thư mục</Button>} /> : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {top.map((f) => {
            const ids = new Set(desc(f.id));
            const docs = db.documents.filter((d) => ids.has(d.folderId));
            const last = docs.map((d) => d.uploadedAt).sort().pop();
            return (
              <button key={f.id} onClick={go} className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left hover:border-primary/60 hover:bg-primary-soft/40">
                <Folder className="h-9 w-9 shrink-0 fill-amber-100 text-amber-500" />
                <div className="min-w-0"><div className="truncate text-[14px] font-semibold">{f.name}</div><div className="text-[12px] text-slate-500">{fmtNumber(docs.length, 0)} tài liệu{last ? ` · ${fmtDate(last)}` : ""}</div></div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
