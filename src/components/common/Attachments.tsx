import { useRef, useState } from "react";
import { Download, FileText, ImageIcon, Paperclip, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { genId } from "@/utils/id";
import { cn } from "@/utils/cn";
import type { Attachment } from "@/types";

/** Giới hạn lưu nội dung file trên trình duyệt (prototype không có máy chủ lưu file) */
const MAX_INLINE = 2.5 * 1024 * 1024;

export const fileUrl = (a?: Attachment | null) => (!a?.url ? null : a.url.startsWith("assets/") ? `${import.meta.env.BASE_URL}${a.url}` : a.url);
export const isImage = (a?: Attachment | null) => !!a && a.type.startsWith("image/");
export const isPdf = (a?: Attachment | null) => !!a && a.type === "application/pdf";
export const fmtSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const guessType = (name: string, type: string) => type || (/\.pdf$/i.test(name) ? "application/pdf" : /\.(png|jpe?g|webp|gif)$/i.test(name) ? "image/" + name.split(".").pop()!.toLowerCase() : "application/octet-stream");

/** Đọc file người dùng chọn thành Attachment (ảnh / PDF nhỏ được lưu nội dung để xem trước) */
export async function readFiles(list: FileList | File[] | null): Promise<Attachment[]> {
  const files = Array.from(list ?? []);
  const out: Attachment[] = [];
  let big = 0;
  for (const f of files) {
    const type = guessType(f.name, f.type);
    let url: string | null = null;
    if ((type.startsWith("image/") || type === "application/pdf") && f.size <= MAX_INLINE) {
      url = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); });
    } else if (f.size > MAX_INLINE) big++;
    out.push({ id: genId("att"), name: f.name, type, size: f.size, url });
  }
  if (big) toast.info(`${big} file lớn chỉ lưu tên (prototype không có máy chủ lưu file)`);
  return out;
}

/** Xem trước file: ảnh (phóng to / thu nhỏ), PDF; loại khác chỉ tải về */
export function FilePreview({ file, onClose }: { file: Attachment | null; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const url = fileUrl(file);
  return (
    <Dialog open={!!file} onOpenChange={(o) => { if (!o) { onClose(); setZoom(1); } }}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col gap-0 p-0">
        <div className="flex items-center gap-2 border-b px-4 py-2.5 pr-12">
          <DialogTitle className="min-w-0 flex-1 truncate text-[14px]">{file?.name}</DialogTitle>
          {isImage(file) && url && <>
            <Button size="icon-sm" variant="outline" aria-label="Thu nhỏ" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}><ZoomOut /></Button>
            <span className="w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
            <Button size="icon-sm" variant="outline" aria-label="Phóng to" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}><ZoomIn /></Button>
          </>}
          {url && <Button size="sm" variant="outline" asChild><a href={url} download={file?.name}><Download /> Tải về</a></Button>}
        </div>
        <div className="flex-1 overflow-auto bg-slate-100">
          {!url ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-500"><FileText className="h-10 w-10 text-slate-400" />Tài liệu minh họa – prototype không lưu nội dung file này.</div>
          ) : isImage(file) ? (
            <div className="flex min-h-full min-w-full items-center justify-center p-4"><img src={url} alt={file?.name} style={{ width: `${zoom * 100}%`, maxWidth: "none" }} className="h-auto rounded shadow" /></div>
          ) : isPdf(file) ? (
            <iframe src={url} title={file?.name} className="h-full w-full bg-white" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-500"><FileText className="h-10 w-10 text-slate-400" />Trình duyệt không xem trước được định dạng này.<Button size="sm" asChild><a href={url} download={file?.name}><Download /> Tải về</a></Button></div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Danh sách file đính kèm: ảnh hiện thu nhỏ, bấm để xem trước */
export function AttachmentList({ files, onRemove, empty = "Chưa có file đính kèm" }: { files: Attachment[]; onRemove?: (id: string) => void; empty?: string }) {
  const [view, setView] = useState<Attachment | null>(null);
  if (!files.length) return <p className="text-xs text-slate-400">{empty}</p>;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {files.map((f) => (
          <div key={f.id} className="group relative">
            {isImage(f) && fileUrl(f) ? (
              <button type="button" onClick={() => setView(f)} className="block overflow-hidden rounded-lg border bg-white hover:ring-2 hover:ring-primary/40" title={f.name}>
                <img src={fileUrl(f)!} alt={f.name} className="h-24 w-36 object-cover" />
                <div className="max-w-36 truncate px-1.5 py-1 text-left text-[11px] text-slate-600">{f.name}</div>
              </button>
            ) : (
              <button type="button" onClick={() => setView(f)} className="flex max-w-64 items-center gap-1.5 rounded-md border bg-slate-50 px-2.5 py-1.5 text-xs hover:border-primary/50 hover:bg-primary-soft" title={f.name}>
                <FileText className={cn("h-3.5 w-3.5 shrink-0", isPdf(f) ? "text-rose-600" : "text-primary")} /><span className="truncate">{f.name}</span><span className="shrink-0 text-slate-400">{fmtSize(f.size)}</span>
              </button>
            )}
            {onRemove && <button type="button" aria-label="Xóa file" onClick={() => onRemove(f.id)} className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white shadow group-hover:flex"><X className="h-3 w-3" /></button>}
          </div>
        ))}
      </div>
      <FilePreview file={view} onClose={() => setView(null)} />
    </>
  );
}

/** Ô tải nhiều file + danh sách file đã tải */
export function FileUploader({ value, onChange, accept, label = "Tải file lên", hint = "Ảnh, PDF, Word, bản vẽ… (nhiều file)" }: { value: Attachment[]; onChange: (v: Attachment[]) => void; accept?: string; label?: string; hint?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => ref.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-3 py-3 text-[13px] text-slate-600 hover:border-primary hover:bg-primary-soft hover:text-primary">
        <Upload className="h-4 w-4" /> {label} <span className="text-xs text-slate-400">· {hint}</span>
      </button>
      <input ref={ref} type="file" multiple accept={accept} className="hidden" onChange={async (e) => { const add = await readFiles(e.target.files); e.target.value = ""; onChange([...value, ...add]); }} />
      <AttachmentList files={value} onRemove={(id) => onChange(value.filter((f) => f.id !== id))} empty="" />
    </div>
  );
}

/** Ô tải 1 ảnh / file (VD: CCCD mặt trước) có ảnh thu nhỏ */
export function SingleFileSlot({ label, value, onChange, accept = "image/*,application/pdf" }: { label: string; value: Attachment | null | undefined; onChange: (v: Attachment | null) => void; accept?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<Attachment | null>(null);
  const url = fileUrl(value);
  return (
    <div>
      {label && <div className="mb-1.5 text-[12.5px] font-medium text-slate-700">{label}</div>}
      {value ? (
        <div className={cn("group relative overflow-hidden rounded-lg border bg-slate-50", label ? "h-28" : "h-9")}>
          <button type="button" className="h-full w-full" onClick={() => setView(value)}>
            {isImage(value) && url ? <img src={url} alt={label} className="h-full w-full object-cover" /> : <span className="flex h-full flex-col items-center justify-center gap-1 text-xs text-slate-500"><FileText className="h-6 w-6" />{value.name}</span>}
          </button>
          <div className="absolute right-1.5 top-1.5 hidden gap-1 group-hover:flex">
            <button type="button" onClick={() => ref.current?.click()} className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] shadow">Đổi</button>
            <button type="button" onClick={() => onChange(null)} className="rounded bg-rose-600 px-1.5 py-0.5 text-[11px] text-white shadow">Xóa</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className={cn("flex w-full items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-primary hover:bg-primary-soft hover:text-primary", label ? "h-28 flex-col" : "h-9")}>
          <ImageIcon className={label ? "h-5 w-5" : "h-3.5 w-3.5"} /> {label ? "Tải ảnh / file" : "Tải"}
        </button>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={async (e) => { const [f] = await readFiles(e.target.files); e.target.value = ""; if (f) onChange(f); }} />
      <FilePreview file={view} onClose={() => setView(null)} />
    </div>
  );
}

export const AttachIcon = Paperclip;
