import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, Plus, Save, Search, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/common/FormField";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar } from "@/components/common/UserAvatar";
import { EmptyState } from "@/components/common/EmptyState";
import { saveRequest, type RequestInput } from "@/services/actions";
import { getStockRows, lineAmount, requestValue } from "@/services/selectors";
import { MR_TYPE } from "@/utils/constants";
import { DEMO_TODAY, addDays } from "@/utils/date";
import { fmtNumber, fmtVnd } from "@/utils/format";
import type { MaterialRequest, MaterialRequestLine } from "@/types";
import { activeProjects } from "@/utils/labels";

/** Trang tạo / sửa đề xuất (truy cập trực tiếp qua URL) */
export default function RequestFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  return (
    <RequestForm
      existingId={id}
      initProject={params.get("project") ?? undefined}
      initTeam={params.get("team") ?? undefined}
      initMaterial={params.get("material") ?? undefined}
      onClose={() => navigate(-1)}
      onSaved={(rid) => navigate(`/materials/requests/${rid}`)}
    />
  );
}

/** Form thêm / sửa đề xuất vật tư – dùng trong trang và trong cửa sổ "Thêm đề xuất" */
export function RequestForm({ existingId, initProject: initProjectProp, initTeam, initMaterial, onClose, onSaved, inDialog }: { existingId?: string; initProject?: string; initTeam?: string; initMaterial?: string; onClose: () => void; onSaved: (id: string, team?: string) => void; inDialog?: boolean }) {
  const { db, run } = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const existing = db.materialRequests.find((r) => r.id === existingId);
  const id = existingId;
  const initProject = existing?.projectId ?? initProjectProp ?? "p01";
  const initMat = initMaterial;
  const [f, setF] = useState<RequestInput>(() =>
    existing
      ? { title: existing.title, type: existing.type, projectId: existing.projectId, itemId: existing.itemId, taskId: existing.taskId, team: existing.team, neededDate: existing.neededDate, note: existing.note, approverId: existing.approverId, lines: existing.lines }
      : {
          title: initMat ? `${db.materials.find((m) => m.id === initMat)?.name} bổ sung` : "", type: "mua_vat_tu", projectId: initProject, itemId: null, taskId: null, team: initTeam,
          neededDate: addDays(DEMO_TODAY, 7), note: "", approverId: db.projects.find((p) => p.id === initProject)?.commanderId ?? "u04",
          lines: initMat ? [{ materialId: initMat, qty: 0, unitPrice: db.materials.find((m) => m.id === initMat)?.unitPrice ?? 0 }] : [],
        },
  );
  const [err, setErr] = useState<Record<string, string>>({});
  const [matSearch, setMatSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();
  const set = <K extends keyof RequestInput>(k: K, v: RequestInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const items = db.constructionItems.filter((i) => i.projectId === f.projectId);
  const tasks = db.constructionPlans.filter((t) => t.projectId === f.projectId && !t.isGroup && (!f.itemId || t.itemId === f.itemId));
  const stock = useMemo(() => getStockRows(db).filter((r) => r.inv.projectId === f.projectId), [db, f.projectId]);
  const approvers = db.users.filter((u) => u.role === "chi_huy_truong" || u.role === "lanh_dao");
  // gợi ý vật tư: vật tư có trong kho công trình lên trước, kèm định mức & tồn kho
  const suggestions = db.materials
    .filter((m) => !f.lines.some((l) => l.materialId === m.id) && `${m.code} ${m.name} ${m.group}`.toLowerCase().includes(matSearch.trim().toLowerCase()))
    .map((m) => ({ m, s: stock.find((x) => x.inv.materialId === m.id) }))
    .sort((a, b) => Number(!!b.s) - Number(!!a.s) || a.m.code.localeCompare(b.m.code));
  const total = requestValue(f);

  if (id && !existing) return <Card><EmptyState title="Không tìm thấy đề xuất" /></Card>;
  if (existing && !["nhap", "tra_lai"].includes(existing.status)) return <Card><EmptyState title="Đề xuất đã gửi phê duyệt – không thể chỉnh sửa" action={<Button onClick={() => navigate(`/materials/requests/${existing.id}`)}>Xem đề xuất</Button>} /></Card>;

  const lineInfo = (l: MaterialRequestLine) => {
    const s = stock.find((x) => x.inv.materialId === l.materialId);
    if (!s) return { norm: 0, issued: 0, onHand: 0, pending: 0, remaining: 0, warn: "" };
    // đề xuất đang soạn (nháp / trả lại) chưa được tính trong "pending"
    const remaining = s.inv.normQty - s.issued - s.onHand - s.pending;
    const warn = s.inv.normQty > 0 && l.qty > 0 && l.qty > remaining * 0.9 ? (l.qty > remaining ? "Tổng đề xuất vượt định mức còn lại của công trình" : "Tổng đề xuất vượt 90% định mức vật liệu còn lại") : "";
    return { norm: s.inv.normQty, issued: s.issued, onHand: s.onHand, pending: s.pending, remaining, warn };
  };
  const setLine = (i: number, c: Partial<MaterialRequestLine>) => set("lines", f.lines.map((l, j) => (j === i ? { ...l, ...c } : l)));

  const submit = (send: boolean) => {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = "Nhập tiêu đề đề xuất";
    if (!f.lines.length) e.lines = "Thêm ít nhất 1 vật tư";
    if (f.lines.some((l) => !(l.qty > 0))) e.lines = "Khối lượng đề xuất phải > 0";
    if (f.neededDate < DEMO_TODAY) e.neededDate = "Ngày cần vật tư không được ở quá khứ";
    setErr(e);
    if (Object.keys(e).length) return toast.error("Vui lòng kiểm tra lại thông tin đề xuất");
    const next = run(saveRequest, f, user!.id, send, existing?.id);
    const rid = existing?.id ?? next.materialRequests[0].id;
    toast.success(send ? "Đã gửi đề xuất – chờ CHT phê duyệt" : "Đã lưu nháp đề xuất");
    onSaved(rid, f.team);
  };

  return (
    <div>
      {inDialog ? (
        <div className="sticky -top-4 z-10 -mx-6 -mt-4 mb-4 flex flex-wrap items-center justify-between gap-2 border-b bg-white px-6 py-3">
          <div>
            <div className="text-base font-semibold text-slate-900">{existing ? `Chỉnh sửa đề xuất ${existing.code}` : "Thêm đề xuất"}</div>
            <div className="text-xs text-slate-500">{db.projects.find((p) => p.id === f.projectId)?.shortName}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="success" onClick={() => submit(true)}><Send /> Gửi</Button>
            <Button size="sm" variant="outline" onClick={() => submit(false)}><Save /> Lưu nháp</Button>
            <Button size="sm" variant="ghost" onClick={onClose}><X /> Đóng</Button>
          </div>
        </div>
      ) : (
        <PageHeader
          title={existing ? `Chỉnh sửa đề xuất ${existing.code}` : "Thêm đề xuất vật tư"}
          description="Lập đề xuất theo hạng mục / công việc; hệ thống đối chiếu định mức, tồn kho và cảnh báo vượt định mức."
          actions={<>
            <Button variant="success" onClick={() => submit(true)}><Send /> Gửi</Button>
            <Button variant="outline" onClick={() => submit(false)}><Save /> Lưu nháp</Button>
            <Button variant="ghost" onClick={onClose}><X /> Đóng</Button>
          </>}
        />
      )}
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <FormSection title="Thông tin đề xuất" className="h-full">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Tiêu đề" required error={err.title} className="md:col-span-2"><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="VD: BTN C19 thảm lề CHC zone R3" /></FormField>
              <FormField label="Nhóm đề xuất"><Select value={f.type} onChange={(e) => set("type", e.target.value as MaterialRequest["type"])} options={Object.entries(MR_TYPE).map(([v, l]) => ({ value: v, label: l }))} /></FormField>
              <FormField label="Hợp đồng nhận thầu / dự án"><Select value={f.projectId} onChange={(e) => { const pid = e.target.value; setF((x) => ({ ...x, projectId: pid, itemId: null, taskId: null, approverId: db.projects.find((p) => p.id === pid)?.commanderId ?? x.approverId })); }} options={activeProjects(db).map((p) => ({ value: p.id, label: `${p.contractNo} – ${p.shortName}` }))} /></FormField>
              <FormField label="Hạng mục"><Select value={f.itemId ?? ""} onChange={(e) => { set("itemId", e.target.value || null); set("taskId", null); }} placeholder="— Tất cả hạng mục —" options={items.map((i) => ({ value: i.id, label: `${i.code} ${i.name}` }))} /></FormField>
              <FormField label="Công việc"><Select value={f.taskId ?? ""} onChange={(e) => set("taskId", e.target.value || null)} placeholder="— Chọn công việc —" options={tasks.map((t) => ({ value: t.id, label: `${t.code} ${t.name}` }))} /></FormField>
              <FormField label="Ngày cần vật tư" required error={err.neededDate}><Input type="date" value={f.neededDate} min={DEMO_TODAY} onChange={(e) => set("neededDate", e.target.value)} /></FormField>
              <FormField label="Tổng tiền vật liệu"><Input disabled value={`${fmtVnd(total)} đ`} className="font-semibold" /></FormField>
              <FormField label="Ghi chú / lý do" className="md:col-span-2"><Textarea value={f.note} onChange={(e) => set("note", e.target.value)} className="min-h-[56px]" /></FormField>
            </div>
          </FormSection>
        </div>
        <FormSection title="Quy trình xét duyệt" className="h-fit">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Quy trình</div>
          <div className="mt-1 text-[13px] text-success-fg">Chỉ cần một người duyệt (Chỉ huy trưởng)</div>
          <div className="mt-4 text-[11px] font-semibold uppercase text-slate-400">Người xét duyệt</div>
          <Select className="mt-1.5" value={f.approverId} onChange={(e) => set("approverId", e.target.value)} options={approvers.map((u) => ({ value: u.id, label: `${u.name} – ${u.title}` }))} />
          {(() => { const a = db.users.find((u) => u.id === f.approverId); return a && <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 p-2.5"><Avatar name={a.name} /><div className="text-xs"><div className="font-semibold text-slate-700">{a.name}</div><div className="text-slate-500">{a.title}</div></div></div>; })()}
          <div className="mt-4 text-[11px] leading-relaxed text-slate-500">Sau khi được duyệt, BP Vật tư tổng hợp, kiểm tra tồn kho: còn hàng → xuất sử dụng; hết hàng → lựa chọn NCC, mua hàng, nhập kho.</div>
        </FormSection>
      </div>
      <FormSection title="Danh sách vật liệu *" className="mt-4" right={err.lines && <span className="text-xs text-rose-600">{err.lines}</span>}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              ref={searchRef}
              value={matSearch}
              onChange={(e) => { setMatSearch(e.target.value); setPickerOpen(true); }}
              onFocus={() => { clearTimeout(blurTimer.current); setPickerOpen(true); setTimeout(() => searchRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 30); }}
              onBlur={() => { blurTimer.current = setTimeout(() => setPickerOpen(false), 150); }}
              placeholder="Tìm kiếm vật liệu theo mã, tên ..."
              className="pl-8"
            />
            {pickerOpen && (
              <div className="absolute z-30 mt-1 w-[min(760px,90vw)] overflow-hidden rounded-lg border bg-white shadow-xl">
                <div className="grid grid-cols-[70px_1fr_50px_100px_90px_90px] gap-2 border-b bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase text-slate-500">
                  <span>Mã</span><span>Tên vật tư</span><span>ĐVT</span><span className="text-right">Đơn giá</span><span className="text-right">Định mức</span><span className="text-right">Tồn kho</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {suggestions.length === 0 && <div className="px-3 py-4 text-center text-xs text-slate-400">Không tìm thấy vật tư phù hợp</div>}
                  {suggestions.map(({ m, s: st }) => (
                    <button
                      key={m.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { set("lines", [...f.lines, { materialId: m.id, qty: 0, unitPrice: m.unitPrice, discount: 0, vat: 0 }]); setMatSearch(""); setPickerOpen(false); }}
                      className="grid w-full grid-cols-[70px_1fr_50px_100px_90px_90px] items-center gap-2 border-b border-slate-50 px-3 py-2 text-left text-[13px] hover:bg-sky-50"
                    >
                      <span className="text-slate-500">{m.code}</span>
                      <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{m.name}</span><span className="block truncate text-[11px] text-slate-400">{m.spec}</span></span>
                      <span className="text-slate-600">{m.unit}</span>
                      <span className="tabular text-right">{fmtVnd(m.unitPrice)}</span>
                      <span className="tabular text-right">{st ? fmtNumber(st.inv.normQty) : <span className="text-slate-300">—</span>}</span>
                      <span className={`tabular text-right ${st && st.onHand < st.inv.minStock ? "font-semibold text-rose-600" : ""}`}>{st ? fmtNumber(st.onHand) : <span className="text-slate-300">0</span>}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button size="sm" variant="success" onMouseDown={(e) => e.preventDefault()} onClick={() => { clearTimeout(blurTimer.current); setPickerOpen(true); searchRef.current?.focus(); }}><Plus /> Thêm vật liệu</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">STT</th><th className="px-2 text-left">Tên vật liệu</th><th className="px-2 text-left">ĐV</th>
                <th className="px-2 text-right">Đề xuất mới</th><th className="px-2 text-right">Đơn giá</th><th className="px-2 text-right">Chiết khấu (%)</th><th className="px-2 text-right">VAT (%)</th>
                <th className="px-2 text-right">Thành tiền</th><th className="px-2 text-right">Định mức</th><th className="px-2 text-right">Tổng xuất</th><th className="px-2 text-right">Tồn kho</th><th className="px-2 text-right">Còn lại ĐM</th><th />
              </tr>
            </thead>
            <tbody>
              {f.lines.length === 0 && <tr><td colSpan={13} className="py-8 text-center text-xs text-slate-400">Chưa có vật liệu – bấm vào ô tìm kiếm hoặc “Thêm vật liệu” để chọn từ danh sách gợi ý</td></tr>}
              {f.lines.map((l, i) => {
                const m = db.materials.find((x) => x.id === l.materialId)!;
                const info = lineInfo(l);
                return (
                  <tr key={l.materialId} className="border-b align-top">
                    <td className="px-2 py-2">{i + 1}</td>
                    <td className="px-2 py-2"><div className="font-medium">{m.name}</div>{info.warn && <div className="mt-1 flex items-center gap-1 text-[11px] text-rose-600"><AlertCircle className="h-3 w-3 shrink-0" />{info.warn}</div>}</td>
                    <td className="px-2 py-2">{m.unit}</td>
                    <td className="px-2 py-1.5"><Input type="number" min={0} value={l.qty || ""} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} className={`ml-auto h-8 w-24 text-right ${info.warn ? "border-rose-300" : ""}`} /></td>
                    <td className="px-2 py-1.5"><Input type="number" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })} className="ml-auto h-8 w-28 text-right" /></td>
                    <td className="px-2 py-1.5"><Input type="number" min={0} max={100} value={l.discount ?? 0} onChange={(e) => setLine(i, { discount: Number(e.target.value) })} className="ml-auto h-8 w-16 text-right" /></td>
                    <td className="px-2 py-1.5"><Input type="number" min={0} max={100} value={l.vat ?? 0} onChange={(e) => setLine(i, { vat: Number(e.target.value) })} className="ml-auto h-8 w-16 text-right" /></td>
                    <td className="tabular px-2 py-2 text-right font-medium">{fmtVnd(lineAmount(l))}</td>
                    <td className="tabular px-2 py-2 text-right">{fmtNumber(info.norm)}</td>
                    <td className="tabular px-2 py-2 text-right">{fmtNumber(info.issued)}</td>
                    <td className="tabular px-2 py-2 text-right">{fmtNumber(info.onHand)}</td>
                    <td className="tabular px-2 py-2 text-right">{fmtNumber(Math.max(0, info.remaining))}</td>
                    <td className="px-1 py-2"><button className="text-slate-400 hover:text-rose-600" onClick={() => set("lines", f.lines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
            {f.lines.length > 0 && <tfoot><tr className="bg-slate-50 font-semibold"><td colSpan={7} className="px-2 py-2 text-right">Tổng tiền vật liệu</td><td className="tabular px-2 text-right">{fmtVnd(total)}</td><td colSpan={5} /></tr></tfoot>}
          </table>
        </div>
      </FormSection>
    </div>
  );
}
