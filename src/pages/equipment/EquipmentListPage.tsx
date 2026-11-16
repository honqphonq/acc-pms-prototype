import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Download, Eye, Pencil, Plus, Trash2, Truck } from "lucide-react";
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
import { equipmentWork, maintenanceDue, utilizationOf } from "@/services/selectors";
import { CATEGORY_LABELS, EQUIPMENT_STATUS, SERIES } from "@/utils/constants";
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
  const [form, setForm] = useState<{ open: boolean; eq?: Equipment }>({ open: false });
  const [dispatch, setDispatch] = useState<string | null>(null);
  const all = db.equipment;
  const rows = all.filter((e) => (!group || e.group === group) && (!status || e.status === status) && (!projectId || (projectId === "none" ? !e.currentProjectId : e.currentProjectId === projectId)) && (!unit || e.manageUnitId === unit) && (!own || e.ownership === own));
  const count = (s: string) => all.filter((e) => e.status === s).length;
  const groups = EQUIPMENT_GROUPS.filter((g) => all.some((e) => e.group === g));

  const cols: Column<Equipment>[] = [
    { key: "code", header: "Mã máy", sortValue: (e) => e.code, cell: (e) => <span className="font-semibold text-slate-700">{e.code}</span> },
    { key: "name", header: "Tên máy thi công", sortValue: (e) => e.name, cell: (e) => <div><div className="font-semibold text-slate-800">{e.name}</div><div className="text-[11px] text-slate-400">{e.brand} · {e.plate} · {e.year}</div></div> },
    { key: "group", header: "Nhóm máy thi công", sortValue: (e) => e.group, cell: (e) => <Badge tone="outline" className="whitespace-nowrap"><span className="h-1.5 w-1.5 rounded-full" style={{ background: GROUP_COLOR[e.group] }} />{e.group}</Badge> },
    { key: "own", header: "Sở hữu", sortValue: (e) => e.ownership, cell: (e) => <Badge tone={e.ownership === "so_huu" ? "info" : "purple"}>{e.ownership === "so_huu" ? "Sở hữu" : "Thuê ngoài"}</Badge> },
    {
      key: "proj", header: "Dự án đang sử dụng", sortValue: (e) => db.projects.find((p) => p.id === e.currentProjectId)?.name ?? "zzz",
      cell: (e) => {
        const p = db.projects.find((x) => x.id === e.currentProjectId);
        return (
          <div className="flex items-center gap-2">
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", p ? "bg-success-soft text-success-fg" : "bg-slate-100 text-slate-400")}><Building2 className="h-3.5 w-3.5" /></span>
            {p ? <div className="min-w-0"><div className="truncate text-[13px] font-medium text-slate-800">{p.name}</div><div className="text-[11px] text-slate-400">{CATEGORY_LABELS[p.category]}</div></div> : <div><div className="text-[13px] text-slate-400">Chưa phân bổ dự án</div><div className="text-[11px] text-slate-400">{e.status === "nhan_roi" ? "Sẵn sàng điều động" : "—"}</div></div>}
          </div>
        );
      },
    },
    { key: "hours", header: "Giờ máy tại CT", align: "right", sortValue: (e) => equipmentWork(db, e.id, e.currentProjectId).hours, cell: (e) => { if (!e.currentProjectId) return <span className="text-slate-300">—</span>; const w = equipmentWork(db, e.id, e.currentProjectId); return <Tip content={`Từ khi về công trình: ${fmtNumber(w.hours, 0)} giờ · hiệu suất ${fmtPct(utilizationOf(w), 0)} · nhiên liệu ${fmtNumber(w.fuel, 0)} lít`}><span>{fmtNumber(w.hours, 0)}</span></Tip>; } },
    { key: "st", header: "Trạng thái", sortValue: (e) => e.status, cell: (e) => <div className="flex flex-col items-start gap-1"><StatusBadge map={EQUIPMENT_STATUS} value={e.status} />{e.status === "hoat_dong" && maintenanceDue(e) && <Badge tone="warning" className="text-[10px]">Đến hạn bảo dưỡng</Badge>}</div> },
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
      <PageHeader title="Danh sách xe máy thiết bị" description="Quản lý thống nhất thiết bị sở hữu và thuê ngoài: tình trạng, công trình sử dụng, khả năng huy động trên toàn hệ thống." />
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Tổng số xe máy" value={all.length} unit="máy" tone="navy" sub={`${groups.length} nhóm máy · ${all.filter((e) => e.ownership === "thue_ngoai").length} thuê ngoài`} onClick={() => setStatus("")} />
        <KpiCard label="Đang hoạt động" value={count("hoat_dong")} unit="máy" tone="success" progress={count("hoat_dong") / all.length} sub={`${fmtPct(count("hoat_dong") / all.length)} tổng số xe máy`} onClick={() => setStatus("hoat_dong")} />
        <KpiCard label="Bảo trì, sửa chữa" value={count("bao_tri")} unit="máy" tone="warning" progress={count("bao_tri") / all.length} sub={`${fmtPct(count("bao_tri") / all.length)} tổng số xe máy`} onClick={() => setStatus("bao_tri")} />
        <KpiCard label="Nhàn rỗi" value={count("nhan_roi")} unit="máy" tone="info" progress={count("nhan_roi") / all.length} sub="Sẵn sàng điều động" onClick={() => setStatus("nhan_roi")} />
        <KpiCard label="Ngừng sử dụng" value={count("ngung")} unit="máy" tone="danger" progress={count("ngung") / all.length} sub={`${fmtPct(count("ngung") / all.length)} tổng số xe máy`} onClick={() => setStatus("ngung")} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 pt-4">
          <div className="pb-1"><div className="text-[15px] font-semibold text-slate-800">Danh sách xe máy thiết bị</div><div className="text-xs text-slate-500">{rows.length} xe máy · {groups.length} nhóm máy thi công</div></div>
          <div className="flex flex-wrap gap-2 pb-2">
            <Button variant="outline" onClick={() => exportCsv("Danh-sach-xe-may", ["Mã máy", "Tên", "Nhóm", "Sở hữu", "Dự án", "Trạng thái", "Tổng giờ máy"], rows.map((e) => [e.code, e.name, e.group, e.ownership === "so_huu" ? "Sở hữu" : "Thuê ngoài", db.projects.find((p) => p.id === e.currentProjectId)?.name ?? "", EQUIPMENT_STATUS[e.status].label, e.totalHours]))}><Download /> Xuất Excel</Button>
            {can("equipment.edit") && <Button variant="success" onClick={() => setForm({ open: true })}><Plus /> Thêm xe máy</Button>}
          </div>
          <div className="flex w-full gap-1 overflow-x-auto">
            {[{ g: "", n: all.length }, ...groups.map((g) => ({ g, n: all.filter((e) => e.group === g).length }))].map(({ g, n }) => (
              <button key={g || "all"} onClick={() => setGroup(g)} className={cn("-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px]", group === g ? "border-primary font-semibold text-primary" : "border-transparent text-slate-600 hover:text-slate-900")}>
                {g && <span className="h-2 w-2 rounded-sm" style={{ background: GROUP_COLOR[g] }} />}{g || "Tất cả"} <span className="rounded-full bg-slate-100 px-1.5 text-[10.5px] text-slate-500">{n}</span>
              </button>
            ))}
          </div>
        </div>
        <DataTable columns={cols} rows={rows} rowKey={(e) => e.id} loading={loading} onRowClick={(e) => navigate(`/equipment/${e.id}`)} resetKey={group + status + projectId + unit + own}
          searchText={(e) => `${e.code} ${e.name} ${e.plate} ${e.brand}`} searchPlaceholder="Tìm kiếm mã, tên xe máy..."
          toolbar={<>
            <FilterSelect label="Trạng thái" value={status} onChange={setStatus} allLabel="Tất cả trạng thái" options={Object.entries(EQUIPMENT_STATUS).map(([v, l]) => ({ value: v, label: l.label }))} />
            <FilterSelect label="Dự án" value={projectId} onChange={setProjectId} allLabel="Tất cả dự án" options={[{ value: "none", label: "Chưa phân bổ" }, ...db.projects.map((p) => ({ value: p.id, label: p.shortName }))]} />
            <FilterSelect label="Đơn vị quản lý" value={unit} onChange={setUnit} allLabel="Tất cả đơn vị" options={db.departments.filter((d) => d.type === "cong_ty_con").map((d) => ({ value: d.id, label: d.code }))} />
            <FilterSelect value={own} onChange={setOwn} allLabel="Sở hữu & thuê" options={[{ value: "so_huu", label: "Sở hữu" }, { value: "thue_ngoai", label: "Thuê ngoài" }]} />
          </>}
        />
      </Card>
      <EquipmentFormDialog open={form.open} onOpenChange={(o) => setForm({ open: o, eq: o ? form.eq : undefined })} equipment={form.eq} />
      <DispatchDialog open={!!dispatch} onOpenChange={(o) => !o && setDispatch(null)} equipmentId={dispatch ?? undefined} />
    </div>
  );
}
