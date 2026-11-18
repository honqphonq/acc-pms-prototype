import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, FilterSelect, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { ChartCard } from "@/components/common/ChartCard";
import { UserCell } from "@/components/common/UserAvatar";
import { ShiftDialog } from "./ShiftMaintDialogs";
import { deleteShift } from "@/services/actions";
import { CHART_COLORS, SERIES } from "@/utils/constants";
import { fmtDate, fmtNumber, fmtPct } from "@/utils/format";
import { DEMO_TODAY, addDays } from "@/utils/date";
import type { EquipmentShift } from "@/types";

export default function ShiftsPage() {
  const { db, run } = useDb();
  const { can } = useAuth();
  const loading = useSimulatedLoading();
  const [projectId, setProjectId] = useState("");
  const [group, setGroup] = useState("");
  const [onlyOver, setOnlyOver] = useState("");
  const [open, setOpen] = useState(false);
  const eq = (id: string) => db.equipment.find((e) => e.id === id);
  const normOf = (s: EquipmentShift) => s.hours * (eq(s.equipmentId)?.fuelNorm ?? 0);
  const rows = db.equipmentShifts.filter((s) => (!projectId || s.projectId === projectId) && (!group || eq(s.equipmentId)?.group === group) && (!onlyOver || s.fuelLiters > normOf(s) * 1.08)).sort((a, b) => b.date.localeCompare(a.date));
  const hours = rows.reduce((x, s) => x + s.hours, 0);
  const fuel = rows.reduce((x, s) => x + s.fuelLiters, 0);
  const norm = rows.reduce((x, s) => x + normOf(s), 0);
  const byProject = db.projects.filter((p) => p.status === "dang_thi_cong").map((p) => {
    const ss = db.equipmentShifts.filter((s) => s.projectId === p.id && (!group || eq(s.equipmentId)?.group === group));
    return { name: p.shortName, "Nhiên liệu thực tế": Math.round(ss.reduce((x, s) => x + s.fuelLiters, 0)), "Định mức": Math.round(ss.reduce((x, s) => x + normOf(s), 0)) };
  }).filter((x) => x["Định mức"] > 0);
  const cols: Column<EquipmentShift>[] = [
    { key: "date", header: "Ngày", sortValue: (s) => s.date, cell: (s) => <span className="whitespace-nowrap">{fmtDate(s.date)} · {s.shift}</span> },
    { key: "eq", header: "Thiết bị", sortValue: (s) => eq(s.equipmentId)?.code, cell: (s) => <Link to={`/equipment/${s.equipmentId}`} className="hover:text-primary"><div className="font-medium">{eq(s.equipmentId)?.code} – {eq(s.equipmentId)?.name}</div><div className="text-[11px] text-slate-400">{eq(s.equipmentId)?.group}</div></Link> },
    { key: "p", header: "Công trình", cell: (s) => <span className="text-xs">{db.projects.find((p) => p.id === s.projectId)?.shortName}</span> },
    { key: "op", header: "Người vận hành", cell: (s) => <UserCell userId={s.operatorId} /> },
    { key: "h", header: "Giờ máy", align: "right", sortValue: (s) => s.hours, cell: (s) => fmtNumber(s.hours) },
    { key: "f", header: "Nhiên liệu / ĐM (lít)", align: "right", sortValue: (s) => s.fuelLiters / (normOf(s) || 1), cell: (s) => { const over = s.fuelLiters > normOf(s) * 1.08; return <span className={over ? "font-semibold text-rose-600" : ""}>{fmtNumber(s.fuelLiters)} / {fmtNumber(normOf(s))} {over && <Badge tone="danger" className="ml-1">+{Math.round((s.fuelLiters / normOf(s) - 1) * 100)}%</Badge>}</span>; } },
    { key: "o", header: "Khối lượng", cell: (s) => <span className="text-xs">{s.output}</span> },
    { key: "a", header: "", cell: (s) => can("equipment.edit") && <Button size="icon-sm" variant="ghost" className="text-slate-400 hover:text-rose-600" onClick={() => { run(deleteShift, s.id); toast.success("Đã xóa ca máy"); }}><Trash2 /></Button> },
  ];
  return (
    <div>
      <PageHeader title="Theo dõi hoạt động xe máy" description="Phân giao nhân sự theo ca, cập nhật nhật trình (km, m³), nhiên liệu sử dụng; cảnh báo nhiên liệu vượt định mức." actions={(can("equipment.edit") || can("progress.update")) && <Button onClick={() => setOpen(true)}><Plus /> Ghi ca máy</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Số ca máy (3 tuần)" value={rows.length} tone="navy" />
        <KpiCard label="Tổng giờ máy" value={fmtNumber(hours, 0)} unit="giờ" tone="info" />
        <KpiCard label="Nhiên liệu tiêu hao" value={fmtNumber(fuel, 0)} unit="lít" tone={fuel > norm * 1.03 ? "danger" : "success"} progress={norm ? fuel / norm : 0} sub={`${fmtPct(norm ? fuel / norm : 0)} định mức (${fmtNumber(norm, 0)} lít)`} />
        <KpiCard label="Ca vượt định mức nhiên liệu" value={db.equipmentShifts.filter((s) => s.fuelLiters > normOf(s) * 1.08).length} tone="warning" onClick={() => setOnlyOver("1")} sub="Bấm để lọc" />
      </div>
      <ChartCard className="mb-4" title="Nhiên liệu thực tế so với định mức theo công trình" description={`Lít, ${fmtDate(addDays(DEMO_TODAY, -21))} – ${fmtDate(DEMO_TODAY)}`}>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={byProject} margin={{ left: -4, right: 4 }} barGap={2}>
              <CartesianGrid stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="name" tickLine={false} interval={0} tick={{ fontSize: 10.5 }} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => fmtNumber(v, 0)} />
              <Tooltip formatter={(v: number, n) => [`${fmtNumber(v, 0)} lít`, n]} cursor={{ fill: "#f1f5f9" }} />
              <Legend />
              <Bar dataKey="Định mức" fill={CHART_COLORS.plan} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Nhiên liệu thực tế" fill={SERIES[3]} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(s) => s.id} loading={loading} pageSize={15} resetKey={projectId + group + onlyOver}
          searchText={(s) => `${eq(s.equipmentId)?.code} ${eq(s.equipmentId)?.name} ${db.users.find((u) => u.id === s.operatorId)?.name}`} searchPlaceholder="Tìm thiết bị, người vận hành..."
          toolbar={<>
            <FilterSelect value={projectId} onChange={setProjectId} allLabel="Tất cả công trình" options={db.projects.filter((p) => p.status === "dang_thi_cong").map((p) => ({ value: p.id, label: p.shortName }))} />
            <FilterSelect value={group} onChange={setGroup} allLabel="Tất cả nhóm máy" options={[...new Set(db.equipment.map((e) => e.group))].map((g) => ({ value: g, label: g }))} />
            <FilterSelect value={onlyOver} onChange={setOnlyOver} allLabel="Mọi ca" options={[{ value: "1", label: "Chỉ ca vượt định mức" }]} />
          </>}
        />
      </Card>
      <ShiftDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
