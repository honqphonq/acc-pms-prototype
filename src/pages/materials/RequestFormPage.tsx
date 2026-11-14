import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, Plus, Save, Send, Trash2, X } from "lucide-react";
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
import { getStockRows } from "@/services/selectors";
import { MR_TYPE } from "@/utils/constants";
import { DEMO_TODAY, addDays } from "@/utils/date";
import { fmtNumber, fmtVnd } from "@/utils/format";
import type { MaterialRequest, MaterialRequestLine } from "@/types";

export default function RequestFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { db, run } = useDb();
  const { user } = useAuth();
  const navigate = useNavigate();
  const existing = db.materialRequests.find((r) => r.id === id);
  const initProject = existing?.projectId ?? params.get("project") ?? "p01";
  const initMat = params.get("material");
  const [f, setF] = useState<RequestInput>(() =>
    existing
      ? { title: existing.title, type: existing.type, projectId: existing.projectId, itemId: existing.itemId, taskId: existing.taskId, neededDate: existing.neededDate, note: existing.note, approverId: existing.approverId, lines: existing.lines }
      : {
          title: initMat ? `${db.materials.find((m) => m.id === initMat)?.name} bổ sung` : "", type: "mua_vat_tu", projectId: initProject, itemId: null, taskId: null,
          neededDate: addDays(DEMO_TODAY, 7), note: "", approverId: db.projects.find((p) => p.id === initProject)?.commanderId ?? "u04",
          lines: initMat ? [{ materialId: initMat, qty: 0, unitPrice: db.materials.find((m) => m.id === initMat)?.unitPrice ?? 0 }] : [],
        },
  );
  const [err, setErr] = useState<Record<string, string>>({});
  const [matSearch, setMatSearch] = useState("");
  const set = <K extends keyof RequestInput>(k: K, v: RequestInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const items = db.constructionItems.filter((i) => i.projectId === f.projectId);
  const tasks = db.constructionPlans.filter((t) => t.projectId === f.projectId && !t.isGroup && (!f.itemId || t.itemId === f.itemId));
  const stock = useMemo(() => getStockRows(db).filter((r) => r.inv.projectId === f.projectId), [db, f.projectId]);
  const approvers = db.users.filter((u) => u.role === "chi_huy_truong" || u.role === "lanh_dao");
  const found = matSearch.trim().length > 0 ? db.materials.filter((m) => `${m.code} ${m.name}`.toLowerCase().includes(matSearch.toLowerCase()) && !f.lines.some((l) => l.materialId === m.id)).slice(0, 6) : [];
  const total = f.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

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
    navigate(`/materials/requests/${rid}`);
  };

  return (
    <div>
      <PageHeader
        title={existing ? `Chỉnh sửa đề xuất ${existing.code}` : "Thêm đề xuất vật tư"}
        description="Lập đề xuất theo hạng mục / công việc; hệ thống đối chiếu định mức, tồn kho và cảnh báo vượt định mức."
        actions={<>
          <Button variant="success" onClick={() => submit(true)}><Send /> Gửi</Button>
          <Button variant="outline" onClick={() => submit(false)}><Save /> Lưu nháp</Button>
          <Button variant="ghost" onClick={() => navigate(-1)}><X /> Đóng</Button>
        </>}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <FormSection title="Thông tin đề xuất">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Tiêu đề" required error={err.title} className="md:col-span-2"><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="VD: Thép Ø16 cột tầng trệt" /></FormField>
              <FormField label="Nhóm đề xuất"><Select value={f.type} onChange={(e) => set("type", e.target.value as MaterialRequest["type"])} options={Object.entries(MR_TYPE).map(([v, l]) => ({ value: v, label: l }))} /></FormField>
              <FormField label="Hợp đồng nhận thầu / dự án"><Select value={f.projectId} onChange={(e) => { const pid = e.target.value; setF((x) => ({ ...x, projectId: pid, itemId: null, taskId: null, approverId: db.projects.find((p) => p.id === pid)?.commanderId ?? x.approverId })); }} options={db.projects.filter((p) => p.status !== "hoan_thanh").map((p) => ({ value: p.id, label: `${p.contractNo} – ${p.shortName}` }))} /></FormField>
              <FormField label="Hạng mục"><Select value={f.itemId ?? ""} onChange={(e) => { set("itemId", e.target.value || null); set("taskId", null); }} placeholder="— Tất cả hạng mục —" options={items.map((i) => ({ value: i.id, label: `${i.code} ${i.name}` }))} /></FormField>
              <FormField label="Công việc"><Select value={f.taskId ?? ""} onChange={(e) => set("taskId", e.target.value || null)} placeholder="— Chọn công việc —" options={tasks.map((t) => ({ value: t.id, label: `${t.code} ${t.name}` }))} /></FormField>
              <FormField label="Ngày cần vật tư" required error={err.neededDate}><Input type="date" value={f.neededDate} min={DEMO_TODAY} onChange={(e) => set("neededDate", e.target.value)} /></FormField>
              <FormField label="Tổng tiền vật liệu"><Input disabled value={`${fmtVnd(total)} đ`} className="font-semibold" /></FormField>
              <FormField label="Ghi chú / lý do" className="md:col-span-2"><Textarea value={f.note} onChange={(e) => set("note", e.target.value)} className="min-h-[56px]" /></FormField>
            </div>
          </FormSection>
          <FormSection title="Danh sách vật liệu *" right={err.lines && <span className="text-xs text-rose-600">{err.lines}</span>}>
            <div className="relative mb-3 max-w-md">
              <Input value={matSearch} onChange={(e) => setMatSearch(e.target.value)} placeholder="Tìm kiếm vật liệu theo mã, tên ... để thêm" />
              {found.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white p-1 shadow-lg">
                  {found.map((m) => (
                    <button key={m.id} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[13px] hover:bg-slate-50" onClick={() => { set("lines", [...f.lines, { materialId: m.id, qty: 0, unitPrice: m.unitPrice }]); setMatSearch(""); }}>
                      <span>{m.code} – {m.name}</span><span className="text-xs text-slate-400">{m.unit} · {fmtVnd(m.unitPrice)} đ</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-[13px]">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr><th className="px-2 py-2 text-left">STT</th><th className="px-2 text-left">Tên vật liệu</th><th className="px-2">ĐV</th><th className="px-2 text-right">Đề xuất mới</th><th className="px-2 text-right">Đơn giá</th><th className="px-2 text-right">Thành tiền</th><th className="px-2 text-right">Định mức</th><th className="px-2 text-right">Tổng xuất</th><th className="px-2 text-right">Tồn kho</th><th className="px-2 text-right">Còn lại ĐM</th><th /></tr>
                </thead>
                <tbody>
                  {f.lines.length === 0 && <tr><td colSpan={11} className="py-8 text-center text-xs text-slate-400">Chưa có vật liệu – tìm kiếm ở ô phía trên để thêm</td></tr>}
                  {f.lines.map((l, i) => {
                    const m = db.materials.find((x) => x.id === l.materialId)!;
                    const info = lineInfo(l);
                    return (
                      <tr key={l.materialId} className="border-b align-top">
                        <td className="px-2 py-2">{i + 1}</td>
                        <td className="px-2 py-2"><div className="font-medium">{m.name}</div>{info.warn && <div className="mt-1 flex items-center gap-1 text-[11px] text-rose-600"><AlertCircle className="h-3 w-3" />{info.warn}</div>}</td>
                        <td className="px-2 py-2 text-center">{m.unit}</td>
                        <td className="px-2 py-1.5"><Input type="number" min={0} value={l.qty || ""} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} className={`h-8 w-24 text-right ${info.warn ? "border-rose-300" : ""}`} /></td>
                        <td className="px-2 py-1.5"><Input type="number" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })} className="h-8 w-28 text-right" /></td>
                        <td className="tabular px-2 py-2 text-right font-medium">{fmtVnd(l.qty * l.unitPrice)}</td>
                        <td className="tabular px-2 py-2 text-right">{fmtNumber(info.norm)}</td>
                        <td className="tabular px-2 py-2 text-right">{fmtNumber(info.issued)}</td>
                        <td className="tabular px-2 py-2 text-right">{fmtNumber(info.onHand)}</td>
                        <td className="tabular px-2 py-2 text-right">{fmtNumber(Math.max(0, info.remaining))}</td>
                        <td className="px-1 py-2"><button className="text-slate-400 hover:text-rose-600" onClick={() => set("lines", f.lines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline" onClick={() => setMatSearch(" ")}><Plus className="h-3.5 w-3.5" /> Thêm vật liệu</button>
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
    </div>
  );
}
