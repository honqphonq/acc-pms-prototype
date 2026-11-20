import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Download, Eye, FileImage, FileSpreadsheet, FileText, Folder, FolderOpen, FolderPlus, History, Pencil, Search, Trash2, Upload } from "lucide-react";
import { FilePreview, readFiles } from "@/components/common/Attachments";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { deleteRow, saveRow } from "@/services/actions";
import { DEMO_TODAY } from "@/utils/date";
import { fmtDate } from "@/utils/format";
import { genId } from "@/utils/id";
import { cn } from "@/utils/cn";
import type { DocFolder, SiteDocument } from "@/types";

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
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = projectId ? { [projectId]: true } : {};
    let f = db.docFolders.find((x) => x.id === sel);
    while (f?.parentId) { o[f.parentId] = true; f = db.docFolders.find((x) => x.id === f!.parentId); }
    return o;
  });
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
  const lastOf = (list: SiteDocument[]) => list.map((d) => d.uploadedAt).sort().pop();
  const chain = (id: string | null): DocFolder[] => { const f = allFolders.find((x) => x.id === id); return f ? [...chain(f.parentId), f] : []; };
  const path = (id: string | null): string => chain(id).map((f) => f.name).join(" / ");
  const uName = (id: string) => db.users.find((u) => u.id === id)?.name ?? "";
  const pShort = (id: string) => db.projects.find((p) => p.id === id)?.shortName ?? "";
  const goProject = (pid: string) => { nav(pid, null); setOpen((o) => ({ ...o, [pid]: true })); setQ(""); };
  const goFolder = (f: DocFolder) => { nav(f.projectId, f.id); setOpen((o) => ({ ...o, [f.projectId]: true, ...Object.fromEntries(chain(f.parentId).map((x) => [x.id, true])) })); setQ(""); };
  const goRoot = () => { nav("", null); setQ(""); };

  // Nội dung cấp hiện tại: thư mục con trước, file sau (tìm kiếm: mọi cấp bên dưới)
  const kw = q.trim().toLowerCase();
  const projects = db.projects.filter((p) => !kw || `${p.name} ${p.shortName}`.toLowerCase().includes(kw));
  const subFolders = project && !kw ? kids(project.id, selected?.id ?? null) : [];
  const docs = useMemo(() => {
    if (!project) return [];
    const scope = selected ? new Set(descendants(selected.id)) : null;
    return db.documents
      .filter((d) => d.projectId === project.id && (kw ? (!scope || scope.has(d.folderId)) && d.name.toLowerCase().includes(kw) : !!selected && d.folderId === selected.id))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.documents, db.docFolders, project, selected, kw]);

  const folderTree = (pid: string, parentId: string | null, depth: number): JSX.Element[] =>
    kids(pid, parentId).flatMap((f) => {
      const hasKids = allFolders.some((x) => x.parentId === f.id);
      const isOpen = !!open[f.id];
      return [
        <button key={f.id} onClick={() => goFolder(f)} className={cn("flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-[13px] hover:bg-slate-50", sel === f.id && "bg-primary-soft font-semibold text-primary")} style={{ paddingLeft: 8 + depth * 14 }}>
          <span onClick={(e) => { e.stopPropagation(); setOpen((o) => ({ ...o, [f.id]: !isOpen })); }} className={cn("text-slate-400", !hasKids && "invisible")}>{isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
          {sel === f.id ? <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" /> : <Folder className="h-4 w-4 shrink-0 text-amber-500" />}
          <span className="min-w-0 flex-1 truncate">{f.name}</span>
          <span className="text-[11px] font-normal text-slate-400">{docsIn(f.id).length}</span>
        </button>,
        ...(isOpen ? folderTree(pid, f.id, depth + 1) : []),
      ];
    });

  const saveFolder = () => {
    if (!folderDlg?.name.trim() || !project) return toast.error("Nhập tên thư mục");
    const existing = allFolders.find((f) => f.id === folderDlg.id);
    const f: DocFolder = existing ? { ...existing, name: folderDlg.name } : { id: genId("fd"), projectId: project.id, parentId: folderDlg.parentId, name: folderDlg.name, order: db.docFolders.length + 1 };
    run(saveRow, "docFolders", f);
    if (folderDlg.parentId) setOpen((o) => ({ ...o, [folderDlg.parentId!]: true }));
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
    readFiles(files).then(([a]) => run(saveRow, "documents", { ...doc, name: a.name, sizeKb: Math.max(1, Math.round(a.size / 1024)), version: v, uploadedAt: DEMO_TODAY, uploadedById: user!.id, file: a, versions: [...doc.versions, { version: v, at: DEMO_TODAY, byId: user!.id, note: "Cập nhật phiên bản" }] }));
    toast.success(`Đã cập nhật phiên bản v${v}`);
    setVerDoc(null);
  };
  const exportXlsx = () => {
    const list = project ? (selected ? docsIn(selected.id) : projDocs(project.id)) : db.documents;
    import("xlsx").then((XLSX) => { const ws = XLSX.utils.json_to_sheet(list.map((d) => ({ "Dự án": pShort(d.projectId), "Thư mục": path(d.folderId), "Tài liệu": d.name, "Phiên bản": d.version, "Người tải lên": uName(d.uploadedById), "Ngày": d.uploadedAt, "Dung lượng (KB)": d.sizeKb }))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Ho so"); XLSX.writeFile(wb, `Ho-so-thi-cong${project ? "-" + project.code : ""}.xlsx`); });
  };
  const FolderRow = ({ name, onOpen, count, last, actions }: { name: string; onOpen: () => void; count: number; last?: string; actions?: JSX.Element }) => (
    <tr className="cursor-pointer border-t border-slate-200/80 hover:bg-sky-50/50" onDoubleClick={onOpen}>
      <td className="px-4 py-2.5"><button onClick={onOpen} className="flex items-center gap-2.5 text-left font-semibold text-slate-900 hover:text-primary"><Folder className="h-5 w-5 shrink-0 fill-amber-100 text-amber-500" /><span>{name}<span className="block text-[11.5px] font-normal text-slate-500">{count} tài liệu</span></span></button></td>
      <td className="text-slate-400">—</td><td className="text-slate-400">—</td><td className="whitespace-nowrap text-slate-600">{last ? fmtDate(last) : "—"}</td><td className="text-slate-400">—</td>
      <td className="whitespace-nowrap pr-3 text-right">{actions}</td>
    </tr>
  );

  return (
    <div>
      <PageHeader title="Hồ sơ thi công" description="Tiếp nhận, kiểm soát phiên bản và lưu trữ bản vẽ, biện pháp thi công, nhật ký, kết quả thí nghiệm, biên bản nghiệm thu, hồ sơ hoàn công và hồ sơ ATVSLĐ."
        actions={<>
          <Button variant="outline" onClick={exportXlsx}><Download /> Export</Button>
          <Button variant="outline" disabled={!project} title={project ? undefined : "Mở một dự án để tạo thư mục"} onClick={() => setFolderDlg({ name: "", parentId: selected?.id ?? null })}><FolderPlus /> Tạo thư mục</Button>
          <Button disabled={!selected} title={selected ? undefined : "Mở một thư mục để tải tài liệu lên"} onClick={() => fileRef.current?.click()}><Upload /> Tải lên tài liệu</Button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          <input ref={verRef} type="file" className="hidden" onChange={(e) => { newVersion(e.target.files); e.target.value = ""; }} />
        </>} />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="scrollbar-visible h-fit max-h-[calc(100vh-180px)] overflow-y-auto p-2">
          <div className="mb-1 px-2 pt-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Dự án</div>
          <button onClick={goRoot} className={cn("flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] hover:bg-slate-50", !project && "bg-primary-soft font-semibold text-primary")}><Folder className="h-4 w-4 text-slate-400" /> Tất cả dự án <span className="ml-auto text-[11px] font-normal text-slate-400">{db.projects.length}</span></button>
          {db.projects.map((p) => {
            const isOpen = !!open[p.id];
            return (
              <div key={p.id}>
                <button onClick={() => goProject(p.id)} className={cn("flex w-full items-center gap-1.5 rounded-md py-1.5 pl-2 pr-2 text-left text-[13px] hover:bg-slate-50", projectId === p.id && !selected && "bg-primary-soft font-semibold text-primary", projectId === p.id && selected && "font-semibold text-slate-900")}>
                  <span onClick={(e) => { e.stopPropagation(); setOpen((o) => ({ ...o, [p.id]: !isOpen })); }} className="text-slate-400">{isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
                  <Folder className="h-4 w-4 shrink-0 fill-blue-100 text-primary" />
                  <span className="min-w-0 flex-1 truncate">{p.shortName}</span>
                  <span className="text-[11px] font-normal text-slate-400">{projDocs(p.id).length}</span>
                </button>
                {isOpen && folderTree(p.id, null, 1)}
              </div>
            );
          })}
        </Card>
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[14px]">
              <button onClick={goRoot} className={cn("font-semibold hover:text-primary", !project ? "text-slate-900" : "text-primary")}>Hồ sơ thi công</button>
              {project && <span className="flex items-center gap-1"><ChevronRight className="h-4 w-4 text-slate-400" /><button onClick={() => goProject(project.id)} className={cn("font-semibold hover:text-primary", !selected ? "text-slate-900" : "text-primary")}>{project.shortName}</button></span>}
              {chain(selected?.id ?? null).map((f, i, arr) => <span key={f.id} className="flex items-center gap-1"><ChevronRight className="h-4 w-4 text-slate-400" /><button onClick={() => goFolder(f)} className={cn("font-semibold hover:text-primary", i === arr.length - 1 ? "text-slate-900" : "text-primary")}>{f.name}</button></span>)}
            </div>
            <div className="relative w-72"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={!project ? "Tìm dự án..." : selected ? "Tìm tài liệu trong thư mục này..." : "Tìm tài liệu trong dự án..."} className="h-9 pr-8" /><Search className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead className="bg-slate-100/80 text-left text-[12px] font-bold uppercase tracking-wide text-slate-800"><tr><th className="px-4 py-3">Tên</th><th>Phiên bản</th><th>Người tải lên</th><th>Ngày</th><th>Dung lượng</th><th /></tr></thead>
              <tbody>
                {!project && projects.map((p) => <FolderRow key={p.id} name={p.name} count={projDocs(p.id).length} last={lastOf(projDocs(p.id))} onOpen={() => goProject(p.id)} />)}
                {subFolders.map((f) => (
                  <FolderRow key={f.id} name={f.name} count={docsIn(f.id).length} last={lastOf(docsIn(f.id))} onOpen={() => goFolder(f)}
                    actions={<><Button size="icon-sm" variant="ghost" aria-label="Đổi tên" onClick={(e) => { e.stopPropagation(); setFolderDlg({ id: f.id, name: f.name, parentId: f.parentId }); }}><Pencil /></Button><Button size="icon-sm" variant="ghost" aria-label="Xóa thư mục" className="text-slate-400 hover:text-rose-600" onClick={(e) => { e.stopPropagation(); delFolder(f); }}><Trash2 /></Button></>} />
                ))}
                {docs.map((d) => (
                  <tr key={d.id} className="border-t border-slate-200/80 hover:bg-sky-50/50">
                    <td className="px-4 py-2.5"><button onClick={() => setPreview(d)} className="flex items-center gap-2.5 text-left font-medium text-slate-900 hover:text-primary">{icon(d.fileType)}<span>{d.name}{kw && <span className="block text-[11.5px] font-normal text-slate-500">{path(d.folderId)}</span>}</span></button></td>
                    <td><Badge tone={d.version > 1 ? "info" : "outline"}>v{d.version}</Badge></td>
                    <td className="whitespace-nowrap text-slate-700">{uName(d.uploadedById)}</td>
                    <td className="whitespace-nowrap">{fmtDate(d.uploadedAt)}</td>
                    <td className="text-slate-600">{size(d.sizeKb)}</td>
                    <td className="whitespace-nowrap pr-3 text-right">
                      <Button size="icon-sm" variant="ghost" aria-label="Xem trước" onClick={() => setPreview(d)}><Eye /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Tải về" onClick={() => { if (d.file?.url) { const a = document.createElement("a"); a.href = d.file.url; a.download = d.name; a.click(); } else toast.info(`Tải về ${d.name} (bản demo không có file thật)`); }}><Download /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Lịch sử phiên bản" onClick={() => setHist(d)}><History /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Cập nhật phiên bản" onClick={() => { setVerDoc(d); verRef.current?.click(); }}><Upload /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Xóa" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (await confirm({ title: `Xóa ${d.name}?`, destructive: true, confirmText: "Xóa" })) { run(deleteRow, "documents", d.id); toast.success("Đã xóa tài liệu"); } }}><Trash2 /></Button>
                    </td>
                  </tr>
                ))}
                {(!project ? !projects.length : !subFolders.length && !docs.length) && (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{kw ? "Không tìm thấy" : !selected ? "Dự án chưa có thư mục hồ sơ – bấm “Tạo thư mục”." : "Thư mục trống – bấm “Tải lên tài liệu” hoặc “Tạo thư mục”."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

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
          <DialogHeader><DialogTitle>Lịch sử phiên bản – {hist?.name}</DialogTitle></DialogHeader>
          <DialogBody>
            <ol className="space-y-2 border-l-2 border-slate-200 pl-4">
              {[...(hist?.versions ?? [])].reverse().map((v) => <li key={v.version} className="relative text-[13px]"><span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" /><b>v{v.version}</b> · {fmtDate(v.at)} · {uName(v.byId)}<div className="text-slate-500">{v.note}</div></li>)}
            </ol>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
