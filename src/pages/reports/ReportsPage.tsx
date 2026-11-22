import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Printer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useQueryParam } from "@/hooks/useQueryParam";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProjectProgress } from "@/components/common/ProjectProgress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { ChartCard } from "@/components/common/ChartCard";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { FilterSelect } from "@/components/common/DataTable";
import {
  acceptanceValue, equipmentByGroup, equipmentWork, utilizationOf, getPortfolio, getStockRows, itemStats, leafTasks, monthlyProgress, taskActualPct, taskPlannedPct,
} from "@/services/selectors";
import { CHART_COLORS, HEALTH, PROJECT_HEALTH, SERIES } from "@/utils/constants";
import { DATA_UPDATED_AT, DEMO_TODAY, monthLabel } from "@/utils/date";
import { fmtDate, fmtMoneyShort, fmtNumber, fmtPct } from "@/utils/format";
import { exportCsv } from "@/utils/export";
import { activeProjects } from "@/utils/labels";

export default function ReportsPage() {
  const { db } = useDb();
  const navigate = useNavigate();
  const [tab, setTab] = useQueryParam("tab", "tong-hop");
  const [projectId, setProjectId] = useQueryParam("project", "");
  const pf = getPortfolio(db);
  const running = pf.stats.filter((s) => s.project.status === "dang_thi_cong");
  const exp = (name: string, header: string[], rows: (string | number | null | undefined)[][]) => { exportCsv(`${name}_${DEMO_TODAY}`, header, rows); toast.success("Đã xuất báo cáo"); };
  const monthly = useMemo(() => monthlyProgress(db, projectId || undefined).filter((m) => m.month <= DEMO_TODAY.slice(0, 7)).slice(-12), [db, projectId]);
  const stock = getStockRows(db).filter((r) => !projectId || r.inv.projectId === projectId);
  const pName = (id: string | null) => db.projects.find((p) => p.id === id)?.shortName ?? "";
  const projFilter = <FilterSelect value={projectId} onChange={setProjectId} allLabel="Toàn Tổng công ty" options={activeProjects(db).map((p) => ({ value: p.id, label: p.shortName }))} />;

  return (
    <div>
      <PageHeader title="Báo cáo" description={`Báo cáo tổng hợp từ dữ liệu thống nhất của các phân hệ · số liệu đến ${DATA_UPDATED_AT}`} actions={<Button variant="outline" onClick={() => window.print()}><Printer /> In báo cáo</Button>} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 rounded-xl bg-white px-2">
          <TabsTrigger value="tong-hop">Tổng hợp cho Ban lãnh đạo</TabsTrigger>
          <TabsTrigger value="tien-do">Tiến độ dự án</TabsTrigger>
          <TabsTrigger value="khoi-luong">Khối lượng thực hiện</TabsTrigger>
          <TabsTrigger value="vat-tu">Vật tư</TabsTrigger>
          <TabsTrigger value="thiet-bi">Máy móc thiết bị</TabsTrigger>
          <TabsTrigger value="nt-tt">Nghiệm thu & thanh toán</TabsTrigger>
        </TabsList>

        <TabsContent value="tong-hop" className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <KpiCard label="Dự án đang thi công" value={pf.runningProjects} tone="info" sub={`${pf.onTrack} đúng · ${pf.atRisk} nguy cơ · ${pf.delayed} chậm`} />
            <KpiCard label="Tiến độ tổng thể" value={fmtPct(pf.overallActual)} tone="primary" progress={pf.overallActual} sub="so với tổng khối lượng" />
            <KpiCard label="Giá trị khối lượng thực hiện" value={fmtNumber(pf.execValue / 1e9, 0)} unit="tỷ" tone="success" />
            <KpiCard label="Đã nghiệm thu" value={fmtNumber(pf.accepted / 1e9, 0)} unit="tỷ" tone="warning" />
            <KpiCard label="Đã thu" value={fmtNumber(pf.paid / 1e9, 0)} unit="tỷ" tone="navy" />
          </div>
          <Card>
            <div className="flex items-center justify-between border-b px-4 py-3"><div className="text-[13px] font-semibold uppercase tracking-wide text-slate-700">Báo cáo tổng hợp tình hình các dự án</div><Button size="sm" variant="outline" onClick={() => exp("Bao-cao-tong-hop", ["Dự án", "Giá trị HĐ", "KH đến nay %", "Hoàn thành %", "% so với KH", "Trạng thái", "Giá trị KL thực hiện", "Đã NT", "Đã thu", "Việc quá hạn", "Vấn đề mở"], pf.stats.map((s) => [s.project.name, s.project.contractValue, (s.planned * 100).toFixed(1), (s.actual * 100).toFixed(1), s.spi === null ? "" : (s.spi * 100).toFixed(0), HEALTH[s.health].label, Math.round(s.execValue), Math.round(s.acceptedValue), Math.round(s.paidValue), s.tasksOverdue, db.issues.filter((i) => i.projectId === s.project.id && i.status !== "da_xu_ly").length]))}><Download /> Xuất Excel</Button></div>
            <Table>
              <TableHeader><TableRow><TableHead>Dự án</TableHead><TableHead className="text-right">Giá trị HĐ</TableHead><TableHead>Tiến độ</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Giá trị KL thực hiện</TableHead><TableHead className="text-right">Đã NT</TableHead><TableHead className="text-right">Đã thu</TableHead><TableHead className="text-right">Việc quá hạn</TableHead><TableHead className="text-right">Vấn đề mở</TableHead></TableRow></TableHeader>
              <TableBody>
                {pf.stats.map((s) => (
                  <TableRow key={s.project.id} className="cursor-pointer" onClick={() => navigate(`/projects/${s.project.id}`)}>
                    <TableCell className="font-medium">{s.project.shortName}</TableCell>
                    <TableCell className="tabular text-right">{fmtMoneyShort(s.project.contractValue)}</TableCell>
                    <TableCell className="w-48"><ProjectProgress s={s} className="w-44" /></TableCell>
                    <TableCell><StatusBadge map={PROJECT_HEALTH} value={s.health} /></TableCell>
                    <TableCell className="tabular text-right">{fmtMoneyShort(s.execValue)}</TableCell>
                    <TableCell className="tabular text-right">{fmtMoneyShort(s.acceptedValue)}</TableCell>
                    <TableCell className="tabular text-right">{fmtMoneyShort(s.paidValue)}</TableCell>
                    <TableCell className="tabular text-right">{s.tasksOverdue || "—"}</TableCell>
                    <TableCell className="tabular text-right">{db.issues.filter((i) => i.projectId === s.project.id && i.status !== "da_xu_ly").length || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter><TableRow><TableCell>Tổng cộng</TableCell><TableCell className="tabular text-right">{fmtMoneyShort(pf.contract)}</TableCell><TableCell>{fmtPct(pf.overallActual)} / {fmtPct(pf.overallPlanned)}</TableCell><TableCell /><TableCell /><TableCell className="tabular text-right">{fmtMoneyShort(pf.execValue)}</TableCell><TableCell className="tabular text-right">{fmtMoneyShort(pf.accepted)}</TableCell><TableCell className="tabular text-right">{fmtMoneyShort(pf.paid)}</TableCell><TableCell className="tabular text-right">{pf.tasksOverdue}</TableCell><TableCell className="tabular text-right">{db.issues.filter((i) => i.status !== "da_xu_ly").length}</TableCell></TableRow></TableFooter>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="tien-do" className="space-y-4">
          <Card className="flex flex-wrap items-center gap-2 px-4 py-3">{projFilter}</Card>
          <ChartCard title="Đường cong tiến độ lũy kế (S-curve)" description="% giá trị · nét đứt: kế hoạch, nét liền: thực tế">
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={monthlyProgress(db, projectId || undefined)} margin={{ left: -12, right: 8 }}>
                  <CartesianGrid stroke="#eef2f6" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} minTickGap={20} tickLine={false} />
                  <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} />
                  <Tooltip labelFormatter={(l) => `Tháng ${monthLabel(String(l))}`} formatter={(v: number, n) => [v == null ? "—" : fmtPct(v), n]} />
                  <Legend iconType="plainline" />
                  <Line name="Kế hoạch" dataKey="planPct" stroke={CHART_COLORS.plan} strokeDasharray="5 4" strokeWidth={2} dot={false} />
                  <Line name="Thực tế" dataKey="actualPct" stroke={CHART_COLORS.actual} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <Card>
            <div className="flex items-center justify-between border-b px-4 py-3"><div className="text-[13px] font-semibold uppercase tracking-wide text-slate-700">Tiến độ theo hạng mục</div></div>
            <Table>
              <TableHeader><TableRow><TableHead>Dự án</TableHead><TableHead>Hạng mục</TableHead><TableHead>Thời gian</TableHead><TableHead className="text-right">Giá trị</TableHead><TableHead>TT / KH</TableHead><TableHead className="text-right">Quá hạn</TableHead></TableRow></TableHeader>
              <TableBody>
                {db.constructionItems.filter((i) => (!projectId || i.projectId === projectId) && db.projects.find((p) => p.id === i.projectId)?.status === "dang_thi_cong").map((it) => {
                  const st = itemStats(db, it.id);
                  return (
                    <TableRow key={it.id}>
                      <TableCell className="text-xs text-slate-500">{pName(it.projectId)}</TableCell><TableCell className="font-medium">{it.code} {it.name}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDate(st.start)} – {fmtDate(st.end)}</TableCell>
                      <TableCell className="tabular text-right">{fmtMoneyShort(st.value)}</TableCell>
                      <TableCell className="w-36"><div className="mb-1 text-[11.5px]"><b>{fmtPct(st.actual)}</b></div><Progress value={st.actual} className="h-1.5" tone={st.actual + 0.03 >= st.planned ? "success" : "warning"} /></TableCell>
                      <TableCell className="text-right">{st.overdue ? <Badge tone="danger">{st.overdue}</Badge> : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
          <Card>
            <div className="border-b px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-700">Danh sách công việc chậm tiến độ</div>
            <Table>
              <TableHeader><TableRow><TableHead>Dự án</TableHead><TableHead>Công việc</TableHead><TableHead>Phụ trách</TableHead><TableHead>Hạn KH</TableHead><TableHead className="text-right">KH</TableHead><TableHead className="text-right">TT</TableHead></TableRow></TableHeader>
              <TableBody>
                {leafTasks(db).filter((t) => (!projectId || t.projectId === projectId) && taskActualPct(t) < 1 && (t.plannedEnd < DEMO_TODAY || taskPlannedPct(t) - taskActualPct(t) > 0.15)).map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate(`/construction/plan/${t.projectId}/task/${t.id}`)}>
                    <TableCell className="text-xs">{pName(t.projectId)}</TableCell><TableCell className="font-medium">{t.code} {t.name}</TableCell><TableCell className="text-xs">{db.users.find((u) => u.id === t.assigneeId)?.name}</TableCell>
                    <TableCell className={`text-xs ${t.plannedEnd < DEMO_TODAY ? "font-semibold text-rose-600" : ""}`}>{fmtDate(t.plannedEnd)}</TableCell>
                    <TableCell className="tabular text-right">{fmtPct(taskPlannedPct(t), 0)}</TableCell><TableCell className="tabular text-right font-semibold text-rose-600">{fmtPct(taskActualPct(t))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="khoi-luong" className="space-y-4">
          <Card className="flex flex-wrap items-center gap-2 px-4 py-3">{projFilter}<Button size="sm" variant="outline" className="ml-auto" onClick={() => exp("Bao-cao-khoi-luong", ["Tháng", "Giá trị thực hiện trong tháng", "Lũy kế"], monthly.map((m) => [m.month, Math.round(m.monthActual ?? 0), Math.round(m.actualValue ?? 0)]))}><Download /> Xuất Excel</Button></Card>
          <ChartCard title="Giá trị khối lượng thực hiện theo tháng" description="Tỷ đồng · tổng hợp tự động từ nhật ký thi công (12 tháng gần nhất)">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={monthly.map((m) => ({ month: m.month, "Giá trị thực hiện": +((m.monthActual ?? 0) / 1e9).toFixed(2) }))} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid stroke="#eef2f6" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip labelFormatter={(l) => `Tháng ${monthLabel(String(l))}`} formatter={(v: number) => [`${fmtNumber(v, 2)} tỷ`, "Giá trị thực hiện"]} cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="Giá trị thực hiện" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Dự án</TableHead><TableHead className="text-right">Giá trị HĐ</TableHead><TableHead className="text-right">Thực hiện tháng {DEMO_TODAY.slice(5, 7)}</TableHead><TableHead className="text-right">Lũy kế thực hiện</TableHead><TableHead className="text-right">% HĐ</TableHead><TableHead className="text-right">Số nhật ký tháng</TableHead></TableRow></TableHeader>
              <TableBody>
                {running.filter((s) => !projectId || s.project.id === projectId).map((s) => {
                  const logs = db.constructionLogs.filter((l) => l.projectId === s.project.id && l.date.slice(0, 7) === DEMO_TODAY.slice(0, 7) && l.status !== "nhap");
                  const mv = logs.reduce((x, l) => x + l.qty * (db.constructionPlans.find((t) => t.id === l.taskId)?.unitPrice ?? 0), 0);
                  return <TableRow key={s.project.id}><TableCell className="font-medium">{s.project.shortName}</TableCell><TableCell className="tabular text-right">{fmtMoneyShort(s.project.contractValue)}</TableCell><TableCell className="tabular text-right">{fmtMoneyShort(mv)}</TableCell><TableCell className="tabular text-right font-semibold">{fmtMoneyShort(s.execValue)}</TableCell><TableCell className="tabular text-right">{fmtPct(s.execValue / s.project.contractValue)}</TableCell><TableCell className="tabular text-right">{logs.length}</TableCell></TableRow>;
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="vat-tu" className="space-y-4">
          <Card className="flex flex-wrap items-center gap-2 px-4 py-3">{projFilter}<Button size="sm" variant="outline" className="ml-auto" onClick={() => exp("Bao-cao-vat-tu", ["Kho", "Vật tư", "ĐVT", "Định mức", "Nhập", "Xuất", "Tồn", "% tiêu hao"], stock.map((r) => [pName(r.inv.projectId), r.material.name, r.material.unit, r.inv.normQty, r.received, r.issued, r.onHand, (r.usage * 100).toFixed(1)]))}><Download /> Xuất Excel</Button></Card>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Giá trị nhập kho" value={fmtMoneyShort(stock.reduce((s, r) => s + r.received * r.material.unitPrice, 0))} tone="info" />
            <KpiCard label="Giá trị xuất sử dụng" value={fmtMoneyShort(stock.reduce((s, r) => s + r.issued * r.material.unitPrice, 0))} tone="warning" />
            <KpiCard label="Giá trị tồn kho" value={fmtMoneyShort(stock.reduce((s, r) => s + r.value, 0))} tone="navy" />
            <KpiCard label="Mã thiếu hụt / vượt ĐM" value={`${stock.filter((r) => r.status === "thieu_hang").length} / ${stock.filter((r) => r.status === "vuot_dinh_muc" || r.status === "sap_vuot").length}`} tone="danger" />
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Kho</TableHead><TableHead>Vật tư</TableHead><TableHead className="text-right">Định mức</TableHead><TableHead className="text-right">Nhập</TableHead><TableHead className="text-right">Xuất</TableHead><TableHead className="text-right">Tồn</TableHead><TableHead>Tiêu hao / ĐM</TableHead></TableRow></TableHeader>
              <TableBody>
                {stock.slice(0, 60).map((r) => (
                  <TableRow key={r.inv.id}><TableCell className="text-xs">{pName(r.inv.projectId)}</TableCell><TableCell className="font-medium">{r.material.name} <span className="text-xs font-normal text-slate-400">({r.material.unit})</span></TableCell><TableCell className="tabular text-right">{fmtNumber(r.inv.normQty)}</TableCell><TableCell className="tabular text-right">{fmtNumber(r.received)}</TableCell><TableCell className="tabular text-right">{fmtNumber(r.issued)}</TableCell><TableCell className={`tabular text-right ${r.status === "thieu_hang" ? "font-bold text-rose-600" : ""}`}>{fmtNumber(r.onHand)}</TableCell><TableCell className="w-32"><div className="mb-1 text-[11px]">{fmtPct(r.usage, 0)}</div><Progress value={r.usage} className="h-1.5" tone={r.usage > 1 ? "danger" : r.usage >= 0.9 ? "warning" : "info"} /></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="thiet-bi" className="space-y-4">
          <Card className="flex flex-wrap items-center gap-2 px-4 py-3">{projFilter}<Button size="sm" variant="outline" className="ml-auto" onClick={() => exp("Bao-cao-xe-may", ["Mã máy", "Tên", "Công trình", "Giờ máy tại công trình", "Nhiên liệu (lít)", "Hiệu suất %"], db.equipment.filter((e) => !projectId || e.currentProjectId === projectId).map((e) => { const w = equipmentWork(db, e.id, e.currentProjectId); return [e.code, e.name, pName(e.currentProjectId), w.hours, w.fuel, (utilizationOf(w) * 100).toFixed(0)]; }))}><Download /> Xuất Excel</Button></Card>
          <Card>
            <div className="border-b px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-700">Báo cáo tổng hợp hoạt động XMTB theo nhóm máy (lũy kế từ khi máy về công trình)</div>
            <Table>
              <TableHeader><TableRow><TableHead>Nhóm máy</TableHead><TableHead className="text-right">Tổng số</TableHead><TableHead className="text-right">Đang hoạt động</TableHead><TableHead className="text-right">Giờ máy</TableHead><TableHead>Hiệu suất sử dụng</TableHead></TableRow></TableHeader>
              <TableBody>
                {equipmentByGroup(db, projectId || undefined).map((g) => (
                  <TableRow key={g.group}><TableCell className="font-medium">{g.group}</TableCell><TableCell className="tabular text-right">{g.count}</TableCell><TableCell className="tabular text-right">{g.active}</TableCell><TableCell className="tabular text-right">{fmtNumber(g.hours, 0)}</TableCell><TableCell className="w-56"><div className="flex items-center gap-2"><Progress value={g.utilization} className="h-1.5" tone={g.utilization >= 0.75 ? "success" : g.utilization >= 0.5 ? "info" : "warning"} /><span className="tabular w-10 text-right text-xs">{fmtPct(g.utilization, 0)}</span></div></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Card>
            <div className="border-b px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-slate-700">Thiết bị không sẵn sàng</div>
            <Table>
              <TableBody>
                {db.equipment.filter((e) => (e.status === "bao_tri" || e.status === "ngung") && (!projectId || e.currentProjectId === projectId)).map((e) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/equipment/${e.id}`)}><TableCell className="font-medium">{e.code} – {e.name}</TableCell><TableCell className="text-xs">{pName(e.currentProjectId) || "Chưa phân bổ"}</TableCell><TableCell><Badge tone={e.status === "bao_tri" ? "warning" : "danger"}>{e.status === "bao_tri" ? "Đang bảo trì" : "Ngừng sử dụng"}</Badge></TableCell><TableCell className="text-xs text-slate-500">{e.maintenances[0]?.content}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="nt-tt" className="space-y-4">
          <Card className="flex flex-wrap items-center gap-2 px-4 py-3">{projFilter}</Card>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Dự án</TableHead><TableHead className="text-right">Giá trị KL thực hiện</TableHead><TableHead className="text-right">Đã NT</TableHead><TableHead className="text-right">Chờ NT</TableHead><TableHead className="text-right">Số hồ sơ NT</TableHead><TableHead className="text-right">Đề nghị TT</TableHead><TableHead className="text-right">Đã thu</TableHead><TableHead className="text-right">Phải thu</TableHead></TableRow></TableHeader>
              <TableBody>
                {pf.stats.filter((s) => s.project.status !== "chuan_bi" && (!projectId || s.project.id === projectId)).map((s) => {
                  const acs = db.acceptanceRecords.filter((a) => a.projectId === s.project.id);
                  return <TableRow key={s.project.id}><TableCell className="font-medium">{s.project.shortName}</TableCell><TableCell className="tabular text-right">{fmtMoneyShort(s.execValue)}</TableCell><TableCell className="tabular text-right">{fmtMoneyShort(s.acceptedValue)}</TableCell><TableCell className="tabular text-right">{fmtMoneyShort(acs.filter((a) => a.status === "cho_tvgs" || a.status === "cho_cdt").reduce((x, a) => x + acceptanceValue(db, a), 0))}</TableCell><TableCell className="tabular text-right">{acs.length}</TableCell><TableCell className="tabular text-right">{fmtMoneyShort(s.paymentRequested)}</TableCell><TableCell className="tabular text-right font-semibold">{fmtMoneyShort(s.paidValue)}</TableCell><TableCell className="tabular text-right text-amber-600">{fmtMoneyShort(Math.max(0, s.acceptedValue - s.paidValue))}</TableCell></TableRow>;
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
