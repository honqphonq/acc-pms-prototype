import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Download, Eye, FileImage, FileSpreadsheet, FileText, Folder, FolderPlus, History, MoreHorizontal, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FilePreview, readFiles } from "@/components/common/Attachments";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { deleteRow, saveRow } from "@/services/actions";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { genId } from "@/utils/id";
import { cn } from "@/utils/cn";
import type { DocFolder, SiteDocument } from "@/types";
import { activeProjects } from "@/utils/labels";

const icon = (t: string) => (["xlsx", "xls"].includes(t) ? <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> : ["jpg", "png"].includes(t) ? <FileImage className="h-4 w-4 text-sky-600" /> : t === "dwg" ? <FileText className="h-4 w-4 text-amber-600" /> : <FileText className="h-4 w-4 text-rose-600" />);
const size = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1).replace(".", ",")} MB` : `${kb} KB`);

/** Hồ sơ thi công: Dự án → thư mục hồ sơ → thư mục con → file */
export default function DocumentsPage() {
  const { db, run } = useDb();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const projectId = params.get("project") ?? "";
  const sel = params.get("folder") ?? "";
  const nav = (pid: string, fid: string | null) => setParams(() => { const p = new URLSearchParams(); if (pid) p.set("project", pid); if (fid) p.set("folder", fid); return p; }, { replace: true });
  const setSel = (id: string | null) => nav(projectId, id);
  const project = db.projects.find((p) => p.id === projectId) ?? null;
  const allFolders = db.docFolders;
  const folders = allFolders.filter((f) => f.projectId === projectId);
  const [q, setQ] = useState("");
  const [folderDlg, setFolderDlg] = useState<{ id?: string; name: string; parentId: string | null } | null>(null);
  const [hist, setHist] = useState<SiteDocument | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const verRef = useRef<HTMLInputElement>(null);
  const [verDoc, setVerDoc] = useState<SiteDocument | null>(null);
  const [preview, setPreview] = useState<SiteDocument | null>(null);
  const selected = folders.find((f) => f.id === sel) ?? null;

  const kids = (pid: string, parentId: string | null) => allFolders.filter((f) => f.projectId === pid && f.parentId === parentId).sort((a, b) => a.order - b.order);
  const descendants = (id: string): string[] => [id, ...allFolders.filter((f) => f.parentId === id).flatMap((f) => descendants(f.id))];
  const docsIn = (id: string) => { const s = new Set(descendants(id)); return db.documents.filter((d) => s.has(d.folderId)); };
  const projDocs = (pid: string) => db.documents.filter((d) => d.projectId === pid);
  const chain = (id: string | null): DocFolder[] => { const f = allFolders.find((x) => x.id === id); return f ? [...chain(f.parentId), f] : []; };
  const path = (id: string | null): string => chain(id).map((f) => f.name).join(" / ");
  const uName = (id: string) => db.users.find((u) => u.id === id)?.name ?? "";
  const pShort = (id: string) => db.projects.find((p) => p.id === id)?.shortName ?? "";
  const goProject = (pid: string) => { nav(pid, null); setQ(""); };
  const goFolder = (f: DocFolder) => { nav(f.projectId, f.id); setQ(""); };
  const goUp = () => (selected ? (selected.parentId ? goFolder(allFolders.find((x) => x.id === selected.parentId)!) : goProject(selected.projectId)) : goRoot());
  const goRoot = () => { nav("", null); setQ(""); };

  // Nội dung cấp hiện tại: thư mục con trước, file sau (tìm kiếm: mọi cấp bên dưới)
  const kw = q.trim().toLowerCase();
  const projects = activeProjects(db).filter((p) => !kw || `${p.name} ${p.shortName}`.toLowerCase().includes(kw));
  const subFolders = project && !kw ? kids(project.id, selected?.id ?? null) : [];
  const docs = useMemo(() => {
    if (!project) return [];
    const scope = selected ? new Set(descendants(selected.id)) : null;
    return db.documents
      .filter((d) => d.projectId === project.id && (kw ? (!scope || scope.has(d.folderId)) && d.name.toLowerCase().includes(kw) : !!selected && d.folderId === selected.id))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.documents, db.docFolders, project, selected, kw]);

  const saveFolder = () => {
    if (!folderDlg?.name.trim() || !project) return toast.error("Nhập tên thư mục");
    const existing = allFolders.find((f) => f.id === folderDlg.id);
    const f: DocFolder = existing ? { ...existing, name: folderDlg.name } : { id: genId("fd"), projectId: project.id, parentId: folderDlg.parentId, name: folderDlg.name, order: db.docFolders.length + 1 };
    run(saveRow, "docFolders", f);
    toast.success(existing ? "Đã đổi tên thư mục" : "Đã tạo thư mục");
    setFolderDlg(null);
  };
  const delFolder = async (f: DocFolder) => {
    if (docsIn(f.id).length) return toast.error("Thư mục còn tài liệu – hãy chuyển hoặc xóa tài liệu trước");
    if (await confirm({ title: `Xóa thư mục “${f.name}”?`, destructive: true, confirmText: "Xóa" })) {
      descendants(f.id).forEach((id) => run(deleteRow, "docFolders", id));
      if (sel && descendants(f.id).includes(sel)) setSel(f.parentId);
      toast.success("Đã xóa thư mục");
    }
  };
  const upload = (files: FileList | null) => {
    if (!files?.length || !selected || !project) return;
    readFiles(files).then((atts) => atts.forEach((a) => run(saveRow, "documents", { id: genId("doc"), projectId: project.id, folderId: selected.id, name: a.name, fileType: a.name.split(".").pop()?.toLowerCase() ?? "pdf", sizeKb: Math.max(1, Math.round(a.size / 1024)), version: 1, uploadedById: user!.id, uploadedAt: DEMO_TODAY, versions: [{ version: 1, at: DEMO_TODAY, byId: user!.id, note: "Tải lên" }], file: a })));
    toast.success(`Đã tải lên ${files.length} tài liệu vào “${selected.name}”`);
  };
  const newVersion = (files: FileList | null) => {
    if (!files?.length || !verDoc) return;
    const v = verDoc.version + 1;
    const doc = verDoc;
    readFiles(files).then(([a]) => run(saveRow, "documents", { ...doc, name: a.name, sizeKb: Math.max(1, Math.round(a.size / 1024)), version: v, uploadedAt: DEMO_TODAY, uploadedById: user!.id, file: a, versions: [...doc.versions, { version: v, at: DEMO_TODAY, byId: user!.id, note: "Cập nhật bản mới" }] }));
    toast.success("Đã cập nhật bản mới – bản cũ được lưu trong lịch sử");
    setVerDoc(null);
  };
  const exportXlsx = () => {
    const list = project ? (selected ? docsIn(selected.id) : projDocs(project.id)) : db.documents;
    import("xlsx").then((XLSX) => { const ws = XLSX.utils.json_to_sheet(list.map((d) => ({ "Dự án": pShort(d.projectId), "Thư mục": path(d.folderId), "Tài liệu": d.name, "Người tải lên": uName(d.uploadedById), "Ngày": d.uploadedAt, "Dung lượng (KB)": d.sizeKb }))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Ho so"); XLSX.writeFile(wb, `Ho-so-thi-cong${project ? "-" + project.code : ""}.xlsx`); });
  };
  const sizeOf = (list: SiteDocument[]) => list.reduce((x, d) => x + d.sizeKb, 0);
  const lastDoc = (list: SiteDocument[]) => [...list].sort((x, y) => y.uploadedAt.localeCompare(x.uploadedAt))[0];
  const Hist = ({ d }: { d?: SiteDocument }) => (d ? <span className="whitespace-nowrap text-slate-600">{uName(d.uploadedById)} · {fmtDate(d.uploadedAt)}</span> : <span className="text-slate-400">—</span>);
  const FolderRow = ({ name, onOpen, list, actions }: { name: string; onOpen: () => void; list: SiteDocument[]; actions?: JSX.Element }) => (
    <tr className="group cursor-pointer border-t border-slate-200/80 hover:bg-sky-50/50" onClick={onOpen}>
      <td className="px-4 py-3"><span className="flex items-center gap-3 font-semibold text-slate-900 group-hover:text-primary"><Folder className="h-6 w-6 shrink-0 fill-amber-100 text-amber-500" /><span>{name}<span className="block text-[11.5px] font-normal text-slate-500">{list.length} tài liệu</span></span></span></td>
      <td><Hist d={lastDoc(list)} /></td>
      <td className="whitespace-nowrap text-slate-600">{list.length ? size(sizeOf(list)) : "—"}</td>
      <td className="w-px whitespace-nowrap pr-3 text-right" onClick={(e) => e.stopPropagation()}><span className="opacity-0 group-hover:opacity-100">{actions}</span></td>
    </tr>
  );
  const download = (d: SiteDocument) => { if (d.file?.url) { const a = document.createElement("a"); a.href = d.file.url; a.download = d.name; a.click(); } else toast.info(`Tải về ${d.name} (bản demo không có file thật)`); };

  return (
    <div>
      <PageHeader title="Hồ sơ thi công" actions={<Button variant="outline" onClick={exportXlsx}><Download /> Export</Button>} />
      <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      <input ref={verRef} type="file" className="hidden" onChange={(e) => { newVersion(e.target.files); e.target.value = ""; }} />
      <Card className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50/70 px-4 py-3">
          {project && <Button size="icon-sm" variant="ghost" aria-label="Quay lại" onClick={goUp}><ChevronLeft /></Button>}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[16px]">
            <button onClick={goRoot} className={cn("font-semibold hover:text-primary", !project ? "text-slate-900" : "text-slate-600")}>Hồ sơ thi công</button>
            {project && <span className="flex items-center gap-1"><ChevronRight className="h-4 w-4 text-slate-400" /><button onClick={() => goProject(project.id)} title={project.name} className={cn("font-semibold hover:text-primary", !selected ? "text-slate-900" : "text-slate-600")}>{project.shortName}</button></span>}
            {chain(selected?.id ?? null).map((f, i, arr) => <span key={f.id} className="flex items-center gap-1"><ChevronRight className="h-4 w-4 text-slate-400" /><button onClick={() => goFolder(f)} className={cn("font-semibold hover:text-primary", i === arr.length - 1 ? "text-slate-900" : "text-slate-600")}>{f.name}</button></span>)}
          </div>
          <div className="relative w-64"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={!project ? "Tìm dự án..." : "Tìm tài liệu"} className="h-9 rounded-full pr-8" /><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /></div>
          {project && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" className="border-primary/50 text-primary"><Plus /> Thêm <ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {selected && <DropdownMenuItem onClick={() => fileRef.current?.click()}><Upload /> Tải lên tài liệu</DropdownMenuItem>}
                <DropdownMenuItem onClick={() => setFolderDlg({ name: "", parentId: selected?.id ?? null })}><FolderPlus /> Tạo thư mục</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead className="text-left text-[12.5px] text-slate-500"><tr><th className="px-4 py-2.5 font-medium">Tài liệu</th><th className="font-medium">Lịch sử</th><th className="font-medium">Kích thước</th><th /></tr></thead>
            <tbody>
              {!project && projects.map((p) => <FolderRow key={p.id} name={p.shortName} list={projDocs(p.id)} onOpen={() => goProject(p.id)} />)}
              {subFolders.map((f) => (
                <FolderRow key={f.id} name={f.name} list={docsIn(f.id)} onOpen={() => goFolder(f)}
                  actions={<DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Thao tác"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setFolderDlg({ id: f.id, name: f.name, parentId: f.parentId })}><Pencil /> Đổi tên</DropdownMenuItem><DropdownMenuItem className="text-rose-600" onClick={() => delFolder(f)}><Trash2 /> Xóa thư mục</DropdownMenuItem></DropdownMenuContent></DropdownMenu>} />
              ))}
              {docs.map((d) => (
                <tr key={d.id} className="group cursor-pointer border-t border-slate-200/80 hover:bg-sky-50/50" onClick={() => setPreview(d)}>
                  <td className="px-4 py-3"><span className="flex items-center gap-3 font-medium text-slate-900 group-hover:text-primary"><span className="flex h-6 w-6 items-center justify-center">{icon(d.fileType)}</span><span>{d.name}{kw && <span className="block text-[11.5px] font-normal text-slate-500">{path(d.folderId)}</span>}</span></span></td>
                  <td><Hist d={d} /></td>
                  <td className="whitespace-nowrap text-slate-600">{size(d.sizeKb)}</td>
                  <td className="w-px whitespace-nowrap pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <span className="opacity-0 group-hover:opacity-100">
                      <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Thao tác"><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreview(d)}><Eye /> Xem</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => download(d)}><Download /> Tải xuống</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setVerDoc(d); verRef.current?.click(); }}><Upload /> Cập nhật bản mới</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setHist(d)}><History /> Lịch sử cập nhật</DropdownMenuItem>
                          <DropdownMenuItem className="text-rose-600" onClick={async () => { if (await confirm({ title: `Xóa ${d.name}?`, destructive: true, confirmText: "Xóa" })) { run(deleteRow, "documents", d.id); toast.success("Đã xóa tài liệu"); } }}><Trash2 /> Xóa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </td>
                </tr>
              ))}
              {(!project ? !projects.length : !subFolders.length && !docs.length) && (
                <tr><td colSpan={4} className="py-12 text-center text-sm text-slate-400">{kw ? "Không tìm thấy" : !selected ? "Dự án chưa có thư mục hồ sơ – bấm “Thêm → Tạo thư mục”." : "Thư mục trống – bấm “Thêm → Tải lên tài liệu”."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <FilePreview file={preview ? (preview.file ?? { id: preview.id, name: preview.name, type: "application/octet-stream", size: preview.sizeKb * 1024, url: null }) : null} onClose={() => setPreview(null)} />
      <Dialog open={!!folderDlg} onOpenChange={(o) => !o && setFolderDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{folderDlg?.id ? "Đổi tên thư mục" : "Tạo thư mục"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-2">
            {!folderDlg?.id && <p className="text-xs text-slate-500">Tạo trong: <b>{project?.shortName}{folderDlg?.parentId ? " / " + path(folderDlg.parentId) : ""}</b></p>}
            <Input autoFocus value={folderDlg?.name ?? ""} onChange={(e) => setFolderDlg(folderDlg && { ...folderDlg, name: e.target.value })} placeholder="Tên thư mục" onKeyDown={(e) => e.key === "Enter" && saveFolder()} />
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setFolderDlg(null)}>Hủy</Button><Button onClick={saveFolder}>Lưu</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!hist} onOpenChange={(o) => !o && setHist(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lịch sử cập nhật – {hist?.name}</DialogTitle></DialogHeader>
          <DialogBody>
            <ol className="space-y-2 border-l-2 border-slate-200 pl-4">
              {[...(hist?.versions ?? [])].reverse().map((v) => <li key={v.version} className="relative text-[13px]"><span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" /><b>{fmtDate(v.at)}</b> · {uName(v.byId)}<div className="text-slate-500">{v.note}</div></li>)}
            </ol>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
