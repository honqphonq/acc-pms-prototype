import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Fuel, Pencil, Plus, Truck, Undo2, Wrench, ImagePlus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UserCell } from "@/components/common/UserAvatar";
import { EmptyState } from "@/components/common/EmptyState";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { DispatchDialog, EquipmentFormDialog } from "./EquipmentDialogs";
import { MaintenanceDialog, ShiftDialog } from "./ShiftMaintDialogs";
import { releaseEquipment, saveRow } from "@/services/actions";
import { AttachmentList, FilePreview, fileUrl, readFiles } from "@/components/common/Attachments";
import { cn } from "@/utils/cn";
import type { Attachment } from "@/types";
import { equipmentWork, fuelUnit, getEquipmentUsage, isVehicle, maintenanceDue, maintenanceLeft, meterUnit, shiftFuelNorm, shiftMeter, sinceMaintenance, utilizationOf } from "@/services/selectors";
import { ASSIGNMENT_STATUS, EQUIPMENT_STATUS, SERIES } from "@/utils/constants";
import { fmtDate, fmtNumber, fmtPct, fmtVnd } from "@/utils/format";
import { DEMO_TODAY, addDays } from "@/utils/date";

export default function EquipmentDetailPage() {
  const { id } = useParams();
  const { db, run } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [dlg, setDlg] = useState<"edit" | "dispatch" | "shift" | "maint" | null>(null);
  const e = db.equipment.find((x) => x.id === id);
  if (!e) return <Card><EmptyState title="Không tìm thấy thiết bị" action={<Button onClick={() => navigate("/equipment/list")}>Về danh sách</Button>} /></Card>;
  const project = db.projects.find((p) => p.id === e.currentProjectId);
  const u = getEquipmentUsage(db).get(e.id);
  const work = equipmentWork(db, e.id, e.currentProjectId);
  const shifts = db.equipmentShifts.filter((s) => s.equipmentId === e.id).sort((a, b) => b.date.localeCompare(a.date));
  const assigns = db.equipmentAssignments.filter((a) => a.equipmentId === e.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sinceMaint = sinceMaintenance(e);
  const mu = meterUnit(e);
  const veh = isVehicle(e);
  const daily = Array.from({ length: 21 }, (_, i) => addDays(DEMO_TODAY, i - 21)).map((d) => {
    const ss = shifts.filter((s) => s.date === d);
    return { date: d.slice(8, 10) + "/" + d.slice(5, 7), "Giờ máy": ss.reduce((x, s) => x + s.hours, 0), "Nhiên liệu (lít)": ss.reduce((x, s) => x + s.fuelLiters, 0) };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/equipment/list" className="mb-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> Danh mục XMTB</Link>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold">{e.code} – {e.name}</h1><StatusBadge map={EQUIPMENT_STATUS} value={e.status} /><Badge tone={e.ownership === "so_huu" ? "info" : "purple"}>{e.ownership === "so_huu" ? "Sở hữu" : "Thuê ngoài"}</Badge></div>
          <div className="mt-1 text-[13px] text-slate-500">{e.group} · {e.brand} · {e.plate} · SX {e.year} · Quản lý: {db.departments.find((d) => d.id === e.manageUnitId)?.code}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(can("equipment.dispatch.request") || can("equipment.dispatch.approve")) && e.status !== "ngung" && <Button onClick={() => setDlg("dispatch")}><Truck /> Điều động</Button>}
          {can("equipment.dispatch.approve") && e.currentProjectId && <Button variant="outline" onClick={async () => { if (await confirm({ title: "Thu hồi thiết bị về trạng thái nhàn rỗi?", description: `Kết thúc điều động tại ${project?.shortName}.` })) { run(releaseEquipment, e.id); toast.success("Đã thu hồi thiết bị"); } }}><Undo2 /> Thu hồi</Button>}
          {can("equipment.edit") && <Button variant="outline" onClick={() => setDlg("maint")}><Wrench /> Bảo dưỡng</Button>}
          {can("equipment.edit") && <Button variant="outline" size="icon" onClick={() => setDlg("edit")}><Pencil /></Button>}
        </div>
      </div>

      <EquipmentGallery equipmentId={e.id} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Dự án đang sử dụng" value={<span className="text-base">{project?.shortName ?? "Chưa phân bổ"}</span>} tone="info" sub={e.operatorId ? `Vận hành: ${db.users.find((x) => x.id === e.operatorId)?.name}` : "Chưa phân công người vận hành"} icon={<Truck />} onClick={project ? () => navigate(`/projects/${project.id}`) : undefined} />
        <KpiCard label="Giờ máy tại dự án hiện tại" value={fmtNumber(work.hours, 0)} unit="giờ" tone="success" icon={<Clock />} progress={utilizationOf(work)} sub={project ? `Từ khi về công trình · hiệu suất ${fmtPct(utilizationOf(work), 0)} · đồng hồ ${fmtNumber(e.totalHours, 0)} ${mu}` : `Chưa phân bổ · đồng hồ ${fmtNumber(e.totalHours, 0)} ${mu}`} />
        <KpiCard label="Nhiên liệu tiêu hao (3 tuần)" value={fmtNumber(u?.fuel ?? 0, 0)} unit="lít" tone={u && u.fuel > u.fuelNormTotal * 1.08 ? "danger" : "warning"} icon={<Fuel />} progress={u?.fuelNormTotal ? u.fuel / u.fuelNormTotal : 0} sub={`Định mức ${e.fuelNorm} ${fuelUnit(e)} · ${fmtPct(u?.fuelNormTotal ? u.fuel / u.fuelNormTotal : 0, 0)} định mức`} />
        <KpiCard label="Bảo dưỡng định kỳ" value={fmtNumber(sinceMaint, 0)} unit={`/ ${fmtNumber(e.maintenanceInterval, 0)} ${mu}`} tone={maintenanceDue(e) ? "danger" : "navy"} icon={<Wrench />} progress={sinceMaint / e.maintenanceInterval} sub={`${maintenanceDue(e) ? "Đã đến hạn · " : ""}${maintenanceLeft(e)}${e.maintenanceMonths ? ` (chu kỳ ${e.maintenanceMonths} tháng)` : ""}`} />
      </div>

      <Tabs defaultValue="shifts">
        <TabsList className="rounded-t-xl bg-white px-2">
          <TabsTrigger value="shifts">Ca máy & nhiên liệu ({shifts.length})</TabsTrigger>
          <TabsTrigger value="dispatch">Lịch sử điều động ({assigns.length})</TabsTrigger>
          <TabsTrigger value="maint">Bảo dưỡng, sửa chữa ({e.maintenances.length})</TabsTrigger>
          <TabsTrigger value="info">Thông tin thiết bị</TabsTrigger>
        </TabsList>
        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Giờ máy theo ngày (21 ngày gần nhất)</CardTitle></CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer>
                <BarChart data={daily} margin={{ left: -20, right: 4 }}>
                  <CartesianGrid stroke="#eef2f6" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} interval={1} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "#f1f5f9" }} />
                  <Legend />
                  <Bar dataKey="Giờ máy" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Nhật ký ca máy</CardTitle>{e.status === "hoat_dong" && <Button size="sm" onClick={() => setDlg("shift")}><Plus /> Ghi ca máy</Button>}</CardHeader>
            {shifts.length === 0 ? <EmptyState title="Chưa có ca máy" /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Ngày</TableHead><TableHead>Ca</TableHead><TableHead>Công trình</TableHead><TableHead>Người vận hành</TableHead><TableHead className="text-right">{veh ? "Km" : "Giờ máy"}</TableHead><TableHead className="text-right">Nhiên liệu</TableHead><TableHead>Khối lượng</TableHead><TableHead>Ghi chú</TableHead></TableRow></TableHeader>
                <TableBody>
                  {shifts.slice(0, 30).map((s) => {
                    const over = s.fuelLiters > shiftFuelNorm(e, s) * 1.08;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>{fmtDate(s.date)}</TableCell><TableCell>{s.shift}</TableCell><TableCell className="text-xs">{db.projects.find((p) => p.id === s.projectId)?.shortName}</TableCell>
                        <TableCell><UserCell userId={s.operatorId} /></TableCell>
                        <TableCell className="tabular text-right">{fmtNumber(shiftMeter(e, s))}</TableCell>
                        <TableCell className={`tabular text-right ${over ? "font-semibold text-rose-600" : ""}`}>{fmtNumber(s.fuelLiters)} l</TableCell>
                        <TableCell className="text-xs">{s.output}</TableCell><TableCell className="text-xs text-rose-600">{s.note}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="dispatch">
          <Card>
            {assigns.length === 0 ? <EmptyState title="Chưa có lịch sử điều động" /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Quyết định</TableHead><TableHead>Từ</TableHead><TableHead>Đến công trình</TableHead><TableHead>Thời gian</TableHead><TableHead>Lý do</TableHead><TableHead>Trạng thái</TableHead></TableRow></TableHeader>
                <TableBody>
                  {assigns.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.code}</TableCell>
                      <TableCell className="text-xs">{db.projects.find((p) => p.id === a.fromProjectId)?.shortName ?? "Kho / nhàn rỗi"}</TableCell>
                      <TableCell className="text-xs font-medium">{db.projects.find((p) => p.id === a.toProjectId)?.shortName}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDate(a.startDate)} – {fmtDate(a.endDate)}</TableCell>
                      <TableCell className="max-w-xs text-xs text-slate-600">{a.reason}</TableCell>
                      <TableCell><StatusBadge map={ASSIGNMENT_STATUS} value={a.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="maint">
          <Card>
            <CardHeader><CardTitle>Lịch sử bảo dưỡng, sửa chữa</CardTitle>{can("equipment.edit") && <Button size="sm" onClick={() => setDlg("maint")}><Plus /> Ghi nhận</Button>}</CardHeader>
            <Table>
              <TableHeader><TableRow><TableHead>Ngày</TableHead><TableHead>Loại</TableHead><TableHead>Nội dung</TableHead><TableHead className="text-right">Tại giờ máy</TableHead><TableHead className="text-right">Chi phí (đ)</TableHead></TableRow></TableHeader>
              <TableBody>
                {e.maintenances.map((m) => (
                  <TableRow key={m.id}><TableCell>{fmtDate(m.date)}</TableCell><TableCell><Badge tone={m.type === "bao_duong" ? "info" : "warning"}>{m.type === "bao_duong" ? "Bảo dưỡng" : "Sửa chữa"}</Badge></TableCell><TableCell>{m.content}</TableCell><TableCell className="tabular text-right">{fmtNumber(m.hoursAt, 0)}</TableCell><TableCell className="tabular text-right">{fmtVnd(m.cost)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="info">
          <Card className="p-5">
            <dl className="grid gap-x-8 gap-y-3 text-[13px] md:grid-cols-3">
              {[["Mã máy", e.code], ["XMTB", e.name], ["Nhóm XMTB", e.group], ["Hãng / model", e.brand], ["Biển số / số hiệu", e.plate], ["Năm sản xuất", e.year], ["Nguồn gốc", e.ownership === "so_huu" ? "Sở hữu" : "Thuê ngoài"], ["Đơn vị cho thuê", e.rentalSupplier ?? "—"], ["Đơn giá thuê", e.rentalRate ? `${fmtVnd(e.rentalRate)} đ/ca` : "—"], ["Định mức nhiên liệu", `${e.fuelNorm} ${fuelUnit(e)}`], ["Chu kỳ bảo dưỡng", `${fmtNumber(e.maintenanceInterval, 0)} ${mu}${e.maintenanceMonths ? ` hoặc ${e.maintenanceMonths} tháng` : ""}`], ["Chỉ số đồng hồ", `${fmtNumber(e.totalHours, 0)} ${mu}`], ["Bảo dưỡng gần nhất", e.lastMaintenanceDate ? e.lastMaintenanceDate.split("-").reverse().join("/") : "—"], ["Loại", { o_to: "Xe ô tô", xe_bien_do: "Xe biển đỏ", may_thiet_bi: "Máy thiết bị" }[e.kind] ?? "—"], ["Mã tài sản", e.assetCode || "—"], ["Số khung / số máy", `${e.chassisNo || "—"} / ${e.engineNo || "—"}`], ["Cấp chất lượng", e.qualityGrade || "—"], ["QĐ điều động / HĐ thuê", e.decisionNo || "—"], ["Hạn kiểm định", e.inspectionDue ? e.inspectionDue.split("-").reverse().join("/") : "—"], ["Hạn bảo hiểm", e.insuranceDue ? e.insuranceDue.split("-").reverse().join("/") : "—"], ["Chứng minh chủ sở hữu", e.ownership === "so_huu" ? "Tài sản TCT" : e.ownerProof ? "Đã có" : "Chưa có"], ...(e.vetcCode ? [["Thẻ VETC / ePass", e.vetcCode]] : [])].map(([k, v]) => (
                <div key={k as string}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-800">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-4"><div className="mb-1 text-xs text-slate-500">Tiến trình đến kỳ bảo dưỡng</div><Progress value={sinceMaint / e.maintenanceInterval} tone={maintenanceDue(e) ? "danger" : "info"} /></div>
          </Card>
        </TabsContent>
      </Tabs>
      <EquipmentFormDialog open={dlg === "edit"} onOpenChange={(o) => !o && setDlg(null)} equipment={e} />
      <DispatchDialog open={dlg === "dispatch"} onOpenChange={(o) => !o && setDlg(null)} equipmentIds={[e.id]} />
      <ShiftDialog open={dlg === "shift"} onOpenChange={(o) => !o && setDlg(null)} equipmentId={e.id} />
      <MaintenanceDialog open={dlg === "maint"} onOpenChange={(o) => !o && setDlg(null)} equipmentId={e.id} />
    </div>
  );
}

/** Hình ảnh XMTB (ảnh chính + ảnh nhỏ) và giấy tờ đính kèm */
function EquipmentGallery({ equipmentId }: { equipmentId: string }) {
  const { db, run } = useDb();
  const { can } = useAuth();
  const e = db.equipment.find((x) => x.id === equipmentId)!;
  const imgs = e.images ?? [];
  const [idx, setIdx] = useState(0);
  const [view, setView] = useState<Attachment | null>(null);
  const main = imgs[Math.min(idx, imgs.length - 1)];
  return (
    <Card className="grid gap-4 p-4 lg:grid-cols-[420px_1fr]">
      <div>
        {main ? (
          <button onClick={() => setView(main)} className="block w-full overflow-hidden rounded-lg border bg-slate-100"><img src={fileUrl(main)!} alt={e.name} className="aspect-[4/3] w-full object-cover" /></button>
        ) : (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm text-slate-400"><Truck className="h-10 w-10" />Chưa có hình ảnh</div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {imgs.map((im, i) => (
            <div key={im.id} className="group relative">
              <button onClick={() => setIdx(i)} className={cn("overflow-hidden rounded-md border-2", i === idx ? "border-primary" : "border-transparent")}><img src={fileUrl(im)!} alt="" className="h-14 w-20 object-cover" /></button>
              {can("equipment.edit") && <button aria-label="Xóa ảnh" onClick={() => { run(saveRow, "equipment", { ...e, images: imgs.filter((x) => x.id !== im.id) }); setIdx(0); toast.success("Đã xóa ảnh"); }} className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[11px] text-white group-hover:flex">×</button>}
            </div>
          ))}
          {can("equipment.edit") && (
            <label className="flex h-14 w-20 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed text-[11px] text-slate-500 hover:border-primary hover:text-primary">
              <ImagePlus className="h-4 w-4" />Thêm ảnh
              <input type="file" accept="image/*" multiple className="hidden" onChange={async (ev) => { const a = await readFiles(ev.target.files); ev.target.value = ""; if (a.length) { run(saveRow, "equipment", { ...e, images: [...imgs, ...a] }); toast.success(`Đã thêm ${a.length} ảnh`); } }} />
            </label>
          )}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">Giấy tờ đính kèm</h3>
        <AttachmentList files={e.docFiles ?? []} empty="Chưa có giấy tờ – cập nhật trong form sửa XMTB (giấy đăng ký, kiểm định, bảo hiểm…)" />
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2">
          {[["Loại", { o_to: "Xe ô tô", xe_bien_do: "Xe biển đỏ", may_thiet_bi: "Máy thiết bị" }[e.kind] ?? "—"], ["Nguồn gốc", e.ownership === "so_huu" ? "Sở hữu" : `Thuê ngoài – ${e.rentalSupplier ?? ""}`], ["Hạn kiểm định", e.inspectionDue ? e.inspectionDue.split("-").reverse().join("/") : "—"], ["Hạn bảo hiểm", e.insuranceDue ? e.insuranceDue.split("-").reverse().join("/") : "—"], ["Cấp chất lượng", e.qualityGrade || "—"], ["QĐ điều động / HĐ thuê", e.decisionNo || "—"]].map(([k, v]) => <div key={k}><dt className="text-[12px] text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}
        </dl>
      </div>
      <FilePreview file={view} onClose={() => setView(null)} />
    </Card>
  );
}
