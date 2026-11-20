import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Eye, MoreHorizontal, Pencil, Plus, Trash2, Truck, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tip } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { DispatchDialog, EquipmentFormDialog, EQUIPMENT_GROUPS } from "./EquipmentDialogs";
import { deleteEquipment } from "@/services/actions";
import { equipmentWork, utilizationOf } from "@/services/selectors";
import { fileUrl } from "@/components/common/Attachments";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EQUIPMENT_KIND, activeProjects } from "@/utils/labels";
import { EQUIPMENT_STATUS, SERIES } from "@/utils/constants";
import { fmtNumber, fmtPct } from "@/utils/format";
import { exportCsv } from "@/utils/export";
import { cn } from "@/utils/cn";
import type { Equipment } from "@/types";

const GROUP_COLOR: Record<string, string> = Object.fromEntries(EQUIPMENT_GROUPS.map((g, i) => [g, SERIES[i % SERIES.length]]));

export default function EquipmentListPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const loading = useSimulatedLoading();
  const [group, setGroup] = useQueryParam("group");
  const [status, setStatus] = useQueryParam("status");
  const [projectId, setProjectId] = useQueryParam("project");
  const [unit, setUnit] = useState("");
  const [own, setOwn] = useState("");
  const [kind, setKind] = useQueryParam("kind");
  const [form, setForm] = useState<{ open: boolean; eq?: Equipment }>({ open: false });
  const [dispatch, setDispatch] = useState<string | null>(null);
  const all = db.equipment;
  const rows = all.filter((e) => (!group || e.group === group) && (!status || e.status === status) && (!projectId || (projectId === "none" ? !e.currentProjectId : e.currentProjectId === projectId)) && (!unit || e.manageUnitId === unit) && (!own || e.ownership === own) && (!kind || e.kind === kind));
  const count = (s: string) => all.filter((e) => e.status === s).length;
  const groups = EQUIPMENT_GROUPS.filter((g) => all.some((e) => e.group === g));

  const cols: Column<Equipment>[] = [
    { key: "img", header: "", cell: (e) => (e.images?.[0] ? <img src={fileUrl(e.images[0])!} alt="" className="h-11 w-14 rounded-md object-cover" /> : <span className="flex h-11 w-14 items-center justify-center rounded-md bg-slate-100 text-slate-400"><Truck className="h-5 w-5" /></span>), className: "w-16 pr-0" },
    { key: "code", header: "Mã máy", sortValue: (e) => e.code, cell: (e) => <span className="font-semibold">{e.code}</span> },
    { key: "name", header: "XMTB", sortValue: (e) => e.name, filter: "text", filterValue: (e) => `${e.name} ${e.brand} ${e.plate}`, cell: (e) => <div className="min-w-[180px]"><div className="font-semibold">{e.name}</div><div className="text-[12px] text-slate-500">{EQUIPMENT_KIND[e.kind]?.label} · {e.brand} · {e.plate} · {e.year}</div></div> },
    { key: "group", header: "Nhóm XMTB", sortValue: (e) => e.group, cell: (e) => <Badge tone="outline" className="whitespace-nowrap"><span className="h-1.5 w-1.5 rounded-full" style={{ background: GROUP_COLOR[e.group] }} />{e.group}</Badge> },
    { key: "own", header: "Nguồn gốc", sortValue: (e) => e.ownership, filterValue: (e) => (e.ownership === "so_huu" ? "Sở hữu" : "Thuê ngoài"), cell: (e) => <Badge tone={e.ownership === "so_huu" ? "info" : "purple"}>{e.ownership === "so_huu" ? "Sở hữu" : "Thuê ngoài"}</Badge> },
    { key: "proj", header: "Dự án", sortValue: (e) => db.projects.find((p) => p.id === e.currentProjectId)?.shortName ?? "zzz", filterValue: (e) => db.projects.find((p) => p.id === e.currentProjectId)?.shortName ?? "Chưa phân bổ", cell: (e) => { const p = db.projects.find((x) => x.id === e.currentProjectId); return p ? <Tip content={p.name}><span className="block max-w-[150px] truncate">{p.shortName}</span></Tip> : <span className="text-slate-400">Chưa phân bổ</span>; } },
    { key: "hours", header: "Giờ máy tại dự án", align: "right", sortValue: (e) => equipmentWork(db, e.id, e.currentProjectId).hours, cell: (e) => { if (!e.currentProjectId) return <span className="text-slate-300">—</span>; const w = equipmentWork(db, e.id, e.currentProjectId); return <Tip content={`Từ khi về công trình: ${fmtNumber(w.hours, 0)} giờ · hiệu suất ${fmtPct(utilizationOf(w), 0)} · nhiên liệu ${fmtNumber(w.fuel, 0)} lít`}><span>{fmtNumber(w.hours, 0)}</span></Tip>; } },
    { key: "st", header: "Trạng thái", sortValue: (e) => e.status, cell: (e) => <StatusBadge map={EQUIPMENT_STATUS} value={e.status} /> },
    {
      key: "act", header: "Thao tác", cell: (e) => (
        <div className="flex gap-0.5" onClick={(ev) => ev.stopPropagation()}>
          <Tip content="Xem chi tiết"><Button size="icon-sm" variant="ghost" onClick={() => navigate(`/equipment/${e.id}`)}><Eye /></Button></Tip>
          {(can("equipment.dispatch.request") || can("equipment.dispatch.approve")) && e.status !== "ngung" && <Tip content="Điều động"><Button size="icon-sm" variant="ghost" className="text-info-fg" onClick={() => setDispatch(e.id)}><Truck /></Button></Tip>}
          {can("equipment.edit") && <Tip content="Sửa"><Button size="icon-sm" variant="ghost" onClick={() => setForm({ open: true, eq: e })}><Pencil /></Button></Tip>}
          {can("equipment.edit") && <Tip content="Xóa"><Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={async () => { if (await confirm({ title: `Xóa thiết bị ${e.code}?`, description: "Lịch sử điều động và ca máy của thiết bị cũng bị xóa.", destructive: true, confirmText: "Xóa" })) { run(deleteEquipment, e.id); toast.success("Đã xóa thiết bị"); } }}><Trash2 /></Button></Tip>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Danh mục xe máy thiết bị" description="Xe ô tô, xe biển đỏ và máy thiết bị do phòng TBCN quản lý (sở hữu và thuê ngoài): hồ sơ đăng ký, kiểm định, bảo hiểm, quyết định điều động." actions={<>
        {can("equipment.edit") && <Button size="lg" onClick={() => setForm({ open: true })}><Plus /> Thêm XMTB</Button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Thao tác khác"><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => toast.info("Chọn file Excel danh mục XMTB theo mẫu (mô phỏng)")}><Upload /> Import</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportCsv("Danh-muc-XMTB", ["Mã máy", "XMTB", "Nhóm XMTB", "Nguồn gốc", "Dự án", "Trạng thái", "Tổng giờ máy"], rows.map((e) => [e.code, e.name, e.group, e.ownership === "so_huu" ? "Sở hữu" : "Thuê ngoài", db.projects.find((p) => p.id === e.currentProjectId)?.shortName ?? "", EQUIPMENT_STATUS[e.status].label, e.totalHours]))}><Download /> Export</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>} />
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Tổng số xe máy" value={all.length} unit="máy" tone="navy" sub={`${groups.length} nhóm máy · ${all.filter((e) => e.ownership === "thue_ngoai").length} thuê ngoài`} onClick={() => setStatus("")} />
        <KpiCard label="Đang hoạt động" value={count("hoat_dong")} unit="máy" tone="success" progress={count("hoat_dong") / all.length} sub={`${fmtPct(count("hoat_dong") / all.length)} tổng số xe máy`} onClick={() => setStatus("hoat_dong")} />
        <KpiCard label="Bảo trì, sửa chữa" value={count("bao_tri")} unit="máy" tone="warning" progress={count("bao_tri") / all.length} sub={`${fmtPct(count("bao_tri") / all.length)} tổng số xe máy`} onClick={() => setStatus("bao_tri")} />
        <KpiCard label="Nhàn rỗi" value={count("nhan_roi")} unit="máy" tone="info" progress={count("nhan_roi") / all.length} sub="Sẵn sàng điều động" onClick={() => setStatus("nhan_roi")} />
        <KpiCard label="Ngừng sử dụng" value={count("ngung")} unit="máy" tone="danger" progress={count("ngung") / all.length} sub={`${fmtPct(count("ngung") / all.length)} tổng số xe máy`} onClick={() => setStatus("ngung")} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 pt-4">
          <div className="pb-2"><div className="text-[15px] font-semibold text-slate-900">Danh sách XMTB</div><div className="text-[12.5px] text-slate-500">{rows.length} XMTB · {groups.length} nhóm XMTB</div></div>
          <div className="flex w-full gap-1 overflow-x-auto">
            {[{ g: "", n: all.length }, ...groups.map((g) => ({ g, n: all.filter((e) => e.group === g).length }))].map(({ g, n }) => (
              <button key={g || "all"} onClick={() => setGroup(g)} className={cn("-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px]", group === g ? "border-primary font-semibold text-primary" : "border-transparent text-slate-600 hover:text-slate-900")}>
                {g && <span className="h-2 w-2 rounded-sm" style={{ background: GROUP_COLOR[g] }} />}{g || "Tất cả"} <span className="rounded-full bg-slate-100 px-1.5 text-[10.5px] text-slate-500">{n}</span>
              </button>
            ))}
          </div>
        </div>
        <DataTable columns={cols} rows={rows} rowKey={(e) => e.id} loading={loading} onRowClick={(e) => navigate(`/equipment/${e.id}`)} resetKey={group + status + projectId + unit + own + kind}
          searchText={(e) => `${e.code} ${e.name} ${e.plate} ${e.brand}`} searchPlaceholder="Tìm kiếm mã, tên XMTB..."
          toolbar={<>
            <FilterSelect label="Trạng thái" value={status} onChange={setStatus} allLabel="Tất cả trạng thái" options={Object.entries(EQUIPMENT_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} />
            <FilterSelect label="Dự án" value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={[{ value: "none", label: "Chưa phân bổ" }, ...activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))]} />
            <FilterSelect label="Đơn vị quản lý" value={unit} onChange={setUnit} allLabel="Tất cả đơn vị" options={db.departments.filter((d) => d.type === "cong_ty_con").map((d) => ({ value: d.id, label: d.code }))} />
            <FilterSelect value={own} onChange={setOwn} allLabel="Tất cả nguồn gốc" options={[{ value: "so_huu", label: "Sở hữu" }, { value: "thue_ngoai", label: "Thuê ngoài" }]} />
            <FilterSelect value={kind} onChange={setKind} allLabel="Tất cả loại" options={Object.entries(EQUIPMENT_KIND).map(([value, l]) => ({ value, label: l.label }))} />
          </>}
        />
      </Card>
      <EquipmentFormDialog open={form.open} onOpenChange={(o) => setForm({ open: o, eq: o ? form.eq : undefined })} equipment={form.eq} />
      <DispatchDialog open={!!dispatch} onOpenChange={(o) => !o && setDispatch(null)} equipmentId={dispatch ?? undefined} />
    </div>
  );
}
