import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Download, FileImage, FileSpreadsheet, FileText, Folder, FolderOpen, FolderPlus, History, Pencil, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
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

/** Hồ sơ thi công: thư mục nhiều cấp, danh sách tài liệu, phiên bản cập nhật */
export default function DocumentsPage() {
  const { db, run } = useDb();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [projectId, setProjectId] = useQueryParam("project", "p01");
  const folders = db.docFolders.filter((f) => f.projectId === projectId);
  const [sel, setSel] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [folderDlg, setFolderDlg] = useState<{ id?: string; name: string; parentId: string | null } | null>(null);
  const [hist, setHist] = useState<SiteDocument | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const verRef = useRef<HTMLInputElement>(null);
  const [verDoc, setVerDoc] = useState<SiteDocument | null>(null);
  const selected = folders.find((f) => f.id === sel) ?? null;

  const descendants = (id: string): string[] => [id, ...folders.filter((f) => f.parentId === id).flatMap((f) => descendants(f.id))];
  const docs = useMemo(() => {
    const scope = selected ? new Set(descendants(selected.id)) : null;
    return db.documents.filter((d) => d.projectId === projectId && (!scope || scope.has(d.folderId)) && (!q || d.name.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [db.documents, projectId, selected, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = (id: string) => { const s = new Set(descendants(id)); return db.documents.filter((d) => s.has(d.folderId)).length; };
  const path = (id: string | null): string => { const f = folders.find((x) => x.id === id); return f ? `${f.parentId ? path(f.parentId) + " / " : ""}${f.name}` : ""; };
  const uName = (id: string) => db.users.find((u) => u.id === id)?.name ?? "";

  const tree = (parentId: string | null, depth = 0): JSX.Element[] =>
    folders.filter((f) => f.parentId === parentId).sort((a, b) => a.order - b.order).flatMap((f) => {
      const kids = folders.some((x) => x.parentId === f.id);
      const isOpen = open[f.id] ?? depth === 0;
      return [
        <button key={f.id} onClick={() => setSel(f.id)} className={cn("flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-[13px] hover:bg-slate-50", sel === f.id && "bg-primary-soft font-semibold text-primary")} style={{ paddingLeft: 8 + depth * 16 }}>
          <span onClick={(e) => { e.stopPropagation(); setOpen((o) => ({ ...o, [f.id]: !isOpen })); }} className={cn("text-slate-400", !kids && "invisible")}>{isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
          {sel === f.id ? <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" /> : <Folder className="h-4 w-4 shrink-0 text-amber-500" />}
          <span className="min-w-0 flex-1 truncate">{f.name}</span>
          <span className="text-[11px] font-normal text-slate-400">{count(f.id)}</span>
        </button>,
        ...(isOpen ? tree(f.id, depth + 1) : []),
      ];
    });

  const saveFolder = () => {
    if (!folderDlg?.name.trim()) return toast.error("Nhập tên thư mục");
    const existing = folders.find((f) => f.id === folderDlg.id);
    const f: DocFolder = existing ? { ...existing, name: folderDlg.name } : { id: genId("fd"), projectId, parentId: folderDlg.parentId, name: folderDlg.name, order: db.docFolders.length + 1 };
    run(saveRow, "docFolders", f);
    if (folderDlg.parentId) setOpen((o) => ({ ...o, [folderDlg.parentId!]: true }));
    toast.success(existing ? "Đã đổi tên thư mục" : "Đã tạo thư mục");
    setFolderDlg(null);
  };
  const delFolder = async () => {
    if (!selected) return;
    if (count(selected.id)) return toast.error("Thư mục còn tài liệu – hãy chuyển hoặc xóa tài liệu trước");
    if (await confirm({ title: `Xóa thư mục “${selected.name}”?`, destructive: true, confirmText: "Xóa" })) {
      descendants(selected.id).forEach((id) => run(deleteRow, "docFolders", id));
      setSel(selected.parentId);
      toast.success("Đã xóa thư mục");
    }
  };
  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    if (!selected) return toast.error("Chọn thư mục để tải tài liệu lên");
    Array.from(files).forEach((f) => run(saveRow, "documents", { id: genId("doc"), projectId, folderId: selected.id, name: f.name, fileType: f.name.split(".").pop()?.toLowerCase() ?? "pdf", sizeKb: Math.max(1, Math.round(f.size / 1024)), version: 1, uploadedById: user!.id, uploadedAt: DEMO_TODAY, versions: [{ version: 1, at: DEMO_TODAY, byId: user!.id, note: "Tải lên" }] }));
    toast.success(`Đã tải lên ${files.length} tài liệu vào “${selected.name}”`);
  };
  const newVersion = (files: FileList | null) => {
    if (!files?.length || !verDoc) return;
    const v = verDoc.version + 1;
    run(saveRow, "documents", { ...verDoc, name: files[0].name, sizeKb: Math.max(1, Math.round(files[0].size / 1024)), version: v, uploadedAt: DEMO_TODAY, uploadedById: user!.id, versions: [...verDoc.versions, { version: v, at: DEMO_TODAY, byId: user!.id, note: "Cập nhật phiên bản" }] });
    toast.success(`Đã cập nhật phiên bản v${v}`);
    setVerDoc(null);
  };

  return (
    <div>
      <PageHeader title="Hồ sơ thi công" description="Tiếp nhận, kiểm soát phiên bản và lưu trữ bản vẽ, biện pháp thi công, nhật ký, kết quả thí nghiệm, biên bản nghiệm thu, hồ sơ hoàn công và hồ sơ ATVSLĐ."
        actions={<>
          <Select className="w-60" value={projectId} onChange={(e) => { setProjectId(e.target.value); setSel(null); }} options={db.projects.map((p) => ({ value: p.id, label: p.shortName }))} />
          <Button variant="outline" onClick={() => { import("xlsx").then((XLSX) => { const ws = XLSX.utils.json_to_sheet(docs.map((d) => ({ "Thư mục": path(d.folderId), "Tài liệu": d.name, "Phiên bản": d.version, "Người cập nhật": uName(d.uploadedById), "Ngày": d.uploadedAt }))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Ho so"); XLSX.writeFile(wb, "Ho-so-thi-cong.xlsx"); }); }}><Download /> Export</Button>
          <Button onClick={() => (selected ? fileRef.current?.click() : toast.info("Chọn thư mục trước khi tải lên"))}><Upload /> Tải lên tài liệu</Button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          <input ref={verRef} type="file" className="hidden" onChange={(e) => { newVersion(e.target.files); e.target.value = ""; }} />
        </>} />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit p-2">
          <div className="mb-1 flex items-center gap-1 px-2 pt-1">
            <span className="flex-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Thư mục hồ sơ</span>
            <Button size="icon-sm" variant="ghost" aria-label="Tạo thư mục" onClick={() => setFolderDlg({ name: "", parentId: sel })}><FolderPlus /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Đổi tên" disabled={!selected} onClick={() => selected && setFolderDlg({ id: selected.id, name: selected.name, parentId: selected.parentId })}><Pencil /></Button>
            <Button size="icon-sm" variant="ghost" aria-label="Xóa thư mục" disabled={!selected} className="hover:text-rose-600" onClick={delFolder}><Trash2 /></Button>
          </div>
          <button onClick={() => setSel(null)} className={cn("flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] hover:bg-slate-50", !sel && "bg-primary-soft font-semibold text-primary")}><Folder className="h-4 w-4 text-slate-400" /> Tất cả hồ sơ <span className="ml-auto text-[11px] font-normal text-slate-400">{db.documents.filter((d) => d.projectId === projectId).length}</span></button>
          {tree(null)}
          {!folders.length && <p className="px-2 py-4 text-xs text-slate-400">Chưa có thư mục. Bấm <FolderPlus className="inline h-3.5 w-3.5" /> để tạo.</p>}
        </Card>
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <div className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-slate-800">{selected ? path(selected.id) : "Tất cả hồ sơ"}</div>
            <div className="relative w-64"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tài liệu..." className="h-8 pl-8" /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 text-left text-[12px] text-slate-500"><tr><th className="px-4 py-2.5 font-medium">Tài liệu</th>{!selected && <th className="font-medium">Thư mục</th>}<th className="font-medium">Phiên bản</th><th className="font-medium">Dung lượng</th><th className="font-medium">Cập nhật</th><th /></tr></thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-2"><div className="flex items-center gap-2">{icon(d.fileType)}<span className="font-medium text-slate-800">{d.name}</span></div></td>
                    {!selected && <td className="max-w-[220px] truncate text-xs text-slate-500">{path(d.folderId)}</td>}
                    <td><Badge tone={d.version > 1 ? "info" : "outline"}>v{d.version}</Badge></td>
                    <td className="text-xs text-slate-500">{size(d.sizeKb)}</td>
                    <td className="whitespace-nowrap text-xs"><div>{fmtDate(d.uploadedAt)}</div><div className="text-slate-400">{uName(d.uploadedById)}</div></td>
                    <td className="whitespace-nowrap pr-3 text-right">
                      <Button size="icon-sm" variant="ghost" aria-label="Lịch sử phiên bản" onClick={() => setHist(d)}><History /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Cập nhật phiên bản" onClick={() => { setVerDoc(d); verRef.current?.click(); }}><Upload /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Tải về" onClick={() => toast.info("Prototype không lưu file thật – tài liệu minh họa")}><Download /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Xóa" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (await confirm({ title: `Xóa ${d.name}?`, destructive: true, confirmText: "Xóa" })) { run(deleteRow, "documents", d.id); toast.success("Đã xóa tài liệu"); } }}><Trash2 /></Button>
                    </td>
                  </tr>
                ))}
                {!docs.length && <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">Thư mục chưa có tài liệu.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Dialog open={!!folderDlg} onOpenChange={(o) => !o && setFolderDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{folderDlg?.id ? "Đổi tên thư mục" : "Tạo thư mục"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-2">
            {!folderDlg?.id && <p className="text-xs text-slate-500">Thư mục cha: <b>{folderDlg?.parentId ? path(folderDlg.parentId) : "Gốc"}</b></p>}
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
