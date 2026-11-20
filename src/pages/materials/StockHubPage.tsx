import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowDownToLine, ArrowLeft, ArrowLeftRight, ArrowUpFromLine, CheckCircle2, ChevronDown, ClipboardList, Download, FilePlus2, Trash2, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { useDb } from "@/hooks/useDb";
import { useAuth } from "@/hooks/useAuth";
import { useQueryParam } from "@/hooks/useQueryParam";
import { useSimulatedLoading } from "@/hooks/useSimulatedLoading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useConfirm } from "@/components/common/ConfirmProvider";
import { AttachmentList } from "@/components/common/Attachments";
import { RequestForm } from "./RequestFormPage";
import { StocktakePanel } from "./StocktakePanel";
import { SUBTYPE, VoucherDialog } from "./VoucherDialog";
import { getStockRows, isRequestOverdue, requestValue, type StockRow } from "@/services/selectors";
import { confirmVoucher, deleteVoucher, updateInventory } from "@/services/actions";
import { MR_STATUS } from "@/utils/constants";
import { fmtDate, fmtMoneyShort, fmtNumber, fmtPct } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { MaterialRequest, StockTransaction } from "@/types";
import { activeProjects } from "@/utils/labels";

type Level = "duoi" | "sap_het" | "vuot" | "sap_vuot" | "ok";
/** Cảnh báo theo tồn tối thiểu của từng vật tư: tồn ≤ 120% tối thiểu = sắp hết (đỏ), dưới tối thiểu = đỏ đậm */
export const stockLevel = (r: StockRow): Level =>
  r.inv.minStock > 0 && r.onHand < r.inv.minStock ? "duoi" : r.inv.minStock > 0 && r.onHand <= r.inv.minStock * 1.2 ? "sap_het" : r.usage > 1 ? "vuot" : r.usage >= 0.9 ? "sap_vuot" : "ok";
const LEVEL: Record<Level, { label: string; cls: string }> = {
  duoi: { label: "Dưới tồn tối thiểu", cls: "bg-rose-700 text-white" },
  sap_het: { label: "Sắp hết", cls: "bg-rose-100 text-rose-700" },
  vuot: { label: "Vượt định mức", cls: "bg-purple-100 text-purple-700" },
  sap_vuot: { label: "Sắp vượt định mức", cls: "bg-amber-100 text-amber-800" },
  ok: { label: "Bình thường", cls: "bg-green-50 text-green-700" },
};

interface Voucher { code: string; type: "nhap" | "xuat"; sub: string; date: string; lines: StockTransaction[]; confirmed: boolean; value: number }
function groupVouchers(txs: StockTransaction[], price: (id: string) => number): Voucher[] {
  const m = new Map<string, Voucher>();
  txs.forEach((t) => {
    const code = t.voucherCode ?? t.code;
    const v = m.get(code) ?? { code, type: t.type, sub: t.subType ?? (t.type === "nhap" ? "ncc" : "thi_cong"), date: t.date, lines: [], confirmed: true, value: 0 };
    v.lines.push(t);
    if (t.confirmed === false) v.confirmed = false;
    v.value += t.qty * price(t.materialId);
    m.set(code, v);
  });
  return [...m.values()].sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code));
}

/** Quản lý vật tư vật liệu: danh sách dự án (mỗi dự án là một kho) */
export default function StockHubPage() {
  const { db } = useDb();
  const navigate = useNavigate();
  const loading = useSimulatedLoading();
  const all = getStockRows(db);
  const rows = activeProjects(db).map((p) => {
    const rs = all.filter((r) => r.inv.projectId === p.id);
    return {
      p, items: rs.length, value: rs.reduce((s, r) => s + r.value, 0),
      low: rs.filter((r) => stockLevel(r) === "sap_het" || stockLevel(r) === "duoi").length,
      pending: db.materialRequests.filter((r) => r.projectId === p.id && r.status === "cho_duyet").length,
      unconfirmed: new Set(db.stockTransactions.filter((t) => t.projectId === p.id && t.confirmed === false).map((t) => t.voucherCode ?? t.code)).size,
    };
  });
  type Row = (typeof rows)[number];
  const cols: Column<Row>[] = [
    { key: "p", header: "Dự án (kho)", sortValue: (r) => r.p.shortName, cell: (r) => <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Warehouse className="h-4 w-4" /></span><div><div className="font-semibold">{r.p.name}</div><div className="text-[12px] text-slate-500">{r.p.code} · Kho công trường {r.p.shortName}</div></div></div> },
    { key: "n", header: "Số mã vật tư", align: "right", sortValue: (r) => r.items, filter: false, cell: (r) => r.items },
    { key: "v", header: "Giá trị tồn kho", align: "right", sortValue: (r) => r.value, filter: false, cell: (r) => <b>{fmtMoneyShort(r.value)}</b> },
    { key: "low", header: "Vật tư sắp hết", align: "center", sortValue: (r) => r.low, filterValue: (r) => (r.low ? "Có" : "Không"), cell: (r) => (r.low ? <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[12.5px] font-bold text-white">{r.low}</span> : <span className="text-slate-300">0</span>) },
    { key: "pd", header: "Đề xuất chờ duyệt", align: "center", sortValue: (r) => r.pending, filter: false, cell: (r) => (r.pending ? <span className="font-semibold text-amber-700">{r.pending}</span> : <span className="text-slate-300">0</span>) },
    { key: "uc", header: "Phiếu chờ xác nhận", align: "center", sortValue: (r) => r.unconfirmed, filter: false, cell: (r) => (r.unconfirmed ? <span className="font-semibold text-sky-700">{r.unconfirmed}</span> : <span className="text-slate-300">0</span>) },
  ];
  return (
    <div>
      <PageHeader title="Quản lý vật tư vật liệu" description="Mỗi dự án là một kho. Chọn dự án để xem vật tư: nhập, xuất, tồn kho, định mức, cảnh báo sắp hết; lập đề xuất, phiếu nhập / xuất, kiểm kê." />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Kho dự án" value={rows.length} tone="navy" />
        <KpiCard label="Giá trị tồn kho" value={fmtMoneyShort(rows.reduce((s, r) => s + r.value, 0))} tone="info" />
        <KpiCard label="Vật tư sắp hết / dưới tối thiểu" value={rows.reduce((s, r) => s + r.low, 0)} tone="danger" sub="Theo tồn tối thiểu của từng vật tư" />
        <KpiCard label="Đề xuất chờ duyệt" value={rows.reduce((s, r) => s + r.pending, 0)} tone="warning" />
      </div>
      <Card>
        <DataTable columns={cols} rows={rows} rowKey={(r) => r.p.id} loading={loading} pageSize={30} onRowClick={(r) => navigate(`/materials/stock/${r.p.id}`)} searchText={(r) => `${r.p.name} ${r.p.code}`} searchPlaceholder="Tìm dự án..." initialSort={{ key: "low", dir: "desc" }} />
      </Card>
    </div>
  );
}

/** Kho vật tư của một dự án */
export function ProjectStockPage() {
  const { projectId = "" } = useParams();
  const { db, run } = useDb();
  const { can } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const loading = useSimulatedLoading(300, [projectId]);
  const [tab, setTab] = useQueryParam("tab", "vat_tu");
  const [voucher, setVoucher] = useState<{ type: "nhap" | "xuat"; transfer?: boolean; materialId?: string } | null>(null);
  const [reqOpen, setReqOpen] = useState<{ material?: string } | null>(null);
  const [card, setCard] = useState<string | null>(null);
  const [vView, setVView] = useState<string | null>(null);
  const [minEdit, setMinEdit] = useState<{ id: string; v: string } | null>(null);
  const [newCount, setNewCount] = useState(0);
  const project = db.projects.find((p) => p.id === projectId);
  const price = (id: string) => db.materials.find((m) => m.id === id)?.unitPrice ?? 0;
  const rows = useMemo(() => getStockRows(db).filter((r) => r.inv.projectId === projectId), [db, projectId]);
  const reqs = db.materialRequests.filter((r) => r.projectId === projectId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const vouchers = useMemo(() => groupVouchers(db.stockTransactions.filter((t) => t.projectId === projectId), price), [db.stockTransactions, projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!project) return <Card className="p-10 text-center">Không tìm thấy dự án</Card>;
  const mat = (id: string) => db.materials.find((m) => m.id === id);
  const low = rows.filter((r) => stockLevel(r) === "duoi" || stockLevel(r) === "sap_het");
  const vCur = vouchers.find((v) => v.code === vView);
  const cardRow = rows.find((r) => r.inv.materialId === card);

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({ "Mã": r.material.code, "Vật tư": r.material.name, "ĐVT": r.material.unit, "Định mức": r.inv.normQty, "Đã nhập": r.received, "Đã xuất": r.issued, "Tồn kho": r.onHand, "Tồn tối thiểu": r.inv.minStock, "Cảnh báo": LEVEL[stockLevel(r)].label })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Ton kho"); XLSX.writeFile(wb, `Ton-kho-${project.code}.xlsx`);
    toast.success("Đã xuất Excel tồn kho");
  };

  const cols: Column<StockRow>[] = [
    { key: "m", header: "Vật tư", sortValue: (r) => r.material.name, filter: "text", filterValue: (r) => `${r.material.code} ${r.material.name}`, cell: (r) => <div className="min-w-[200px]"><div className="font-semibold">{r.material.name}</div><div className="text-[12px] text-slate-500">{r.material.code} · {r.material.spec}</div></div> },
    { key: "u", header: "ĐVT", filter: false, cell: (r) => r.material.unit },
    { key: "norm", header: "Định mức", align: "right", sortValue: (r) => r.inv.normQty, filter: false, cell: (r) => fmtNumber(r.inv.normQty) },
    { key: "in", header: "Đã nhập", align: "right", sortValue: (r) => r.received, filter: false, cell: (r) => fmtNumber(r.received) },
    { key: "out", header: "Đã xuất", align: "right", sortValue: (r) => r.issued, filter: false, cell: (r) => fmtNumber(r.issued) },
    { key: "on", header: "Tồn kho", align: "right", sortValue: (r) => r.onHand, filter: false, cell: (r) => <span className={cn("text-[15px] font-bold", (stockLevel(r) === "duoi" || stockLevel(r) === "sap_het") && "text-rose-600")}>{fmtNumber(r.onHand)}</span> },
    {
      key: "min", header: "Tồn tối thiểu", align: "right", sortValue: (r) => r.inv.minStock, filter: false, cell: (r) => minEdit?.id === r.inv.id ? (
        <Input autoFocus className="ml-auto h-8 w-24 text-right" value={minEdit.v} onClick={(e) => e.stopPropagation()} onChange={(e) => setMinEdit({ id: r.inv.id, v: e.target.value })} onBlur={() => { run(updateInventory, r.inv.id, { minStock: Number(minEdit.v.replace(/\./g, "").replace(",", ".")) || 0 }); setMinEdit(null); toast.success("Đã cập nhật tồn tối thiểu"); }} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
      ) : <button disabled={!can("stock.move")} onClick={(e) => { e.stopPropagation(); setMinEdit({ id: r.inv.id, v: String(r.inv.minStock) }); }} className="rounded px-1.5 py-0.5 text-slate-700 underline decoration-dotted underline-offset-4 hover:bg-slate-100" title="Bấm để sửa">{fmtNumber(r.inv.minStock)}</button>,
    },
    { key: "use", header: "% dùng ĐM", sortValue: (r) => r.usage, filter: false, cell: (r) => <div className="w-24"><div className="mb-1 text-[12px]">{fmtPct(r.usage, 0)}</div><Progress value={Math.min(1, r.usage)} tone={r.usage > 1 ? "danger" : r.usage >= 0.9 ? "warning" : "info"} className="h-1.5" /></div> },
    { key: "pend", header: "Đang đề xuất", align: "right", sortValue: (r) => r.pending, filter: false, cell: (r) => (r.pending ? <span className="font-medium text-sky-700">{fmtNumber(r.pending)}</span> : <span className="text-slate-300">—</span>) },
    { key: "lv", header: "Cảnh báo", sortValue: (r) => ["duoi", "sap_het", "vuot", "sap_vuot", "ok"].indexOf(stockLevel(r)), filterValue: (r) => LEVEL[stockLevel(r)].label, cell: (r) => { const l = stockLevel(r); return <div className="flex items-center gap-2"><span className={cn("whitespace-nowrap rounded px-2 py-0.5 text-[12px] font-semibold", LEVEL[l].cls)}>{LEVEL[l].label}</span>{(l === "duoi" || l === "sap_het") && can("material.request") && <Button size="xs" variant="outline" className="border-rose-300 text-rose-700" onClick={(e) => { e.stopPropagation(); setReqOpen({ material: r.inv.materialId }); }}>Đề xuất mua</Button>}</div>; } },
  ];
  const reqCols: Column<MaterialRequest>[] = [
    { key: "c", header: "Số đề xuất", sortValue: (r) => r.code, cell: (r) => <span className="whitespace-nowrap font-semibold">{r.code}</span> },
    { key: "t", header: "Nội dung", filter: "text", filterValue: (r) => r.title, cell: (r) => <div className="max-w-[360px]"><div className="truncate font-medium">{r.title}</div><div className="truncate text-[12px] text-slate-500">{r.lines.map((l) => `${mat(l.materialId)?.name} ${fmtNumber(l.qty)} ${mat(l.materialId)?.unit}`).join(", ")}</div></div> },
    { key: "d", header: "Ngày lập", sortValue: (r) => r.createdAt, cell: (r) => <span className="whitespace-nowrap">{fmtDate(r.createdAt)}</span> },
    { key: "n", header: "Cần ngày", sortValue: (r) => r.neededDate, cell: (r) => <span className={cn("whitespace-nowrap", isRequestOverdue(r) && "font-semibold text-rose-600")}>{fmtDate(r.neededDate)}</span> },
    { key: "v", header: "Giá trị", align: "right", sortValue: requestValue, filter: false, cell: (r) => fmtMoneyShort(requestValue(r)) },
    { key: "s", header: "Trạng thái", cell: (r) => <StatusBadge map={MR_STATUS} value={r.status} /> },
  ];
  const vCols: Column<Voucher>[] = [
    { key: "c", header: "Số phiếu", sortValue: (v) => v.code, cell: (v) => <span className="whitespace-nowrap font-semibold">{v.code}</span> },
    { key: "d", header: "Ngày", sortValue: (v) => v.date, cell: (v) => <span className="whitespace-nowrap">{fmtDate(v.date)}</span> },
    { key: "s", header: "Loại phiếu", filterValue: (v) => SUBTYPE[v.sub] ?? v.sub, cell: (v) => <span className="whitespace-nowrap">{SUBTYPE[v.sub] ?? v.sub}</span> },
    { key: "l", header: "Vật tư", filter: "text", filterValue: (v) => v.lines.map((l) => mat(l.materialId)?.name).join(" "), cell: (v) => <div className="max-w-[340px] truncate">{v.lines.map((l) => mat(l.materialId)?.name).join(", ")}<span className="ml-1 text-[12px] text-slate-500">({v.lines.length} dòng)</span></div> },
    { key: "o", header: "Đối tượng", cell: (v) => <span className="text-[13px]">{db.suppliers.find((s) => s.id === v.lines[0].supplierId)?.name ?? db.projects.find((p) => p.id === v.lines[0].toProjectId)?.shortName ?? db.constructionPlans.find((t) => t.id === v.lines[0].taskId)?.name ?? "—"}</span> },
    { key: "v", header: "Giá trị", align: "right", sortValue: (v) => v.value, filter: false, cell: (v) => fmtMoneyShort(v.value) },
    { key: "cf", header: "Xác nhận", filterValue: (v) => (v.confirmed ? "Đã xác nhận" : "Chờ xác nhận"), cell: (v) => (v.confirmed ? <Badge tone="success">Đã xác nhận</Badge> : <Badge tone="warning">Chờ xác nhận</Badge>) },
  ];
  const TABS = [
    { k: "vat_tu", l: `Vật tư trong kho (${rows.length})` },
    { k: "de_xuat", l: `Đề xuất (${reqs.length})` },
    { k: "nhap", l: `Phiếu nhập (${vouchers.filter((v) => v.type === "nhap").length})` },
    { k: "xuat", l: `Phiếu xuất (${vouchers.filter((v) => v.type === "xuat").length})` },
    { k: "kiem_ke", l: `Kiểm kê (${db.stocktakes.filter((s) => s.projectId === projectId).length})` },
  ];
  // thẻ kho
  const ledger = (() => {
    const txs = db.stockTransactions.filter((t) => t.projectId === projectId && t.materialId === card).sort((a, b) => a.date.localeCompare(b.date) || a.code.localeCompare(b.code));
    let bal = 0;
    return txs.map((t) => { if (t.confirmed !== false) bal = Math.round((bal + (t.type === "nhap" ? t.qty : -t.qty)) * 100) / 100; return { t, bal }; }).reverse();
  })();

  return (
    <div>
      <Link to="/materials/stock" className="mb-1 inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> Quản lý vật tư vật liệu</Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[24px] font-bold tracking-tight text-slate-900">Kho {project.shortName}</h1><p className="text-[13.5px] text-slate-500">{project.name}</p></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="lg">Thao tác <ChevronDown /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Nghiệp vụ kho {project.shortName}</DropdownMenuLabel>
            {can("material.request") && <DropdownMenuItem onClick={() => setReqOpen({})}><FilePlus2 /> Đề xuất vật tư</DropdownMenuItem>}
            {can("stock.move") && <DropdownMenuItem onClick={() => setVoucher({ type: "nhap" })}><ArrowDownToLine /> Nhập kho</DropdownMenuItem>}
            {can("stock.move") && <DropdownMenuItem onClick={() => setVoucher({ type: "xuat" })}><ArrowUpFromLine /> Xuất kho</DropdownMenuItem>}
            {can("stock.move") && <DropdownMenuItem onClick={() => { setTab("kiem_ke"); setNewCount((n) => n + 1); }}><ClipboardList /> Kiểm kê</DropdownMenuItem>}
            {can("stock.move") && <DropdownMenuItem onClick={() => setVoucher({ type: "xuat", transfer: true })}><ArrowLeftRight /> Điều chuyển kho</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={exportXlsx}><Download /> Xuất Excel tồn kho</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Giá trị tồn kho" value={fmtMoneyShort(rows.reduce((s, r) => s + r.value, 0))} tone="navy" sub={`${rows.length} mã vật tư`} />
        <KpiCard label="Sắp hết / dưới tồn tối thiểu" value={low.length} unit="mã" tone="danger" sub={low.map((r) => r.material.name).slice(0, 2).join(", ") || "Không có"} />
        <KpiCard label="Sắp vượt / vượt định mức" value={rows.filter((r) => r.usage >= 0.9).length} unit="mã" tone="warning" />
        <KpiCard label="Phiếu chờ xác nhận" value={vouchers.filter((v) => !v.confirmed).length} tone="info" onClick={() => setTab("nhap")} sub="Bấm để xem phiếu nhập" />
      </div>
      <div className="mb-0 flex gap-1 overflow-x-auto rounded-t-xl border border-b-0 bg-white px-3">
        {TABS.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-semibold uppercase tracking-wide", tab === t.k ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800")}>{t.l}</button>)}
      </div>
      {tab === "vat_tu" && <Card className="rounded-t-none"><DataTable columns={cols} rows={rows} rowKey={(r) => r.inv.id} loading={loading} pageSize={30} onRowClick={(r) => setCard(r.inv.materialId)} searchText={(r) => `${r.material.code} ${r.material.name}`} searchPlaceholder="Tìm vật tư..." initialSort={{ key: "lv", dir: "asc" }} rowClassName={(r) => (stockLevel(r) === "duoi" ? "bg-rose-50/70" : stockLevel(r) === "sap_het" ? "bg-rose-50/40" : undefined)} /></Card>}
      {tab === "de_xuat" && <Card className="rounded-t-none"><DataTable columns={reqCols} rows={reqs} rowKey={(r) => r.id} loading={loading} pageSize={20} onRowClick={(r) => navigate(`/materials/requests/${r.id}`)} searchText={(r) => `${r.code} ${r.title}`} toolbarRight={can("material.request") && <Button onClick={() => setReqOpen({})}><FilePlus2 /> Tạo đề xuất</Button>} /></Card>}
      {(tab === "nhap" || tab === "xuat") && <Card className="rounded-t-none"><DataTable columns={vCols} rows={vouchers.filter((v) => v.type === tab)} rowKey={(v) => v.code} loading={loading} pageSize={20} resetKey={tab} onRowClick={(v) => setVView(v.code)} searchText={(v) => `${v.code} ${v.lines.map((l) => mat(l.materialId)?.name).join(" ")}`} searchPlaceholder="Tìm số phiếu, vật tư..." toolbarRight={can("stock.move") && <Button onClick={() => setVoucher({ type: tab as "nhap" | "xuat" })}>{tab === "nhap" ? <ArrowDownToLine /> : <ArrowUpFromLine />} Lập phiếu {tab === "nhap" ? "nhập" : "xuất"}</Button>} /></Card>}
      {tab === "kiem_ke" && <StocktakePanel key={newCount} projectId={projectId} autoCreate={newCount > 0} />}

      {voucher && <VoucherDialog open onOpenChange={(o) => !o && setVoucher(null)} projectId={projectId} type={voucher.type} transfer={voucher.transfer} materialId={voucher.materialId} />}

      <Dialog open={!!reqOpen} onOpenChange={(o) => !o && setReqOpen(null)}>
        <DialogContent hideClose className="max-h-[94vh] max-w-6xl overflow-y-auto px-6 pb-6 pt-4">
          <DialogTitle className="sr-only">Thêm đề xuất</DialogTitle>
          {reqOpen && <RequestForm key={projectId + (reqOpen.material ?? "")} inDialog initProject={projectId} initMaterial={reqOpen.material} onClose={() => setReqOpen(null)} onSaved={() => { setReqOpen(null); setTab("de_xuat"); }} />}
        </DialogContent>
      </Dialog>

      {/* Thẻ kho */}
      <Sheet open={!!cardRow} onOpenChange={(o) => !o && setCard(null)}>
        <SheetContent className="sm:max-w-2xl">
          {cardRow && <>
            <SheetHeader><SheetTitle>Thẻ kho – {cardRow.material.name}</SheetTitle><p className="text-xs text-slate-500">{cardRow.material.code} · {cardRow.material.spec} · ĐVT {cardRow.material.unit}</p></SheetHeader>
            <SheetBody>
              <div className="mb-4 grid grid-cols-4 gap-2 text-center">
                {[["Định mức", cardRow.inv.normQty], ["Đã nhập", cardRow.received], ["Đã xuất", cardRow.issued], ["Tồn kho", cardRow.onHand]].map(([k, v]) => <div key={k as string} className="rounded-lg bg-slate-50 p-2"><div className="text-[11.5px] text-slate-500">{k}</div><div className="text-[16px] font-bold">{fmtNumber(v as number)}</div></div>)}
              </div>
              <table className="w-full text-[13px]">
                <thead className="bg-slate-100/80 text-left text-[11.5px] font-bold uppercase text-slate-800"><tr><th className="px-2 py-2">Ngày</th><th>Phiếu</th><th>Loại</th><th className="text-right">Nhập</th><th className="text-right">Xuất</th><th className="pr-2 text-right">Tồn</th></tr></thead>
                <tbody>{ledger.map(({ t, bal }) => <tr key={t.id} className={cn("border-t", t.confirmed === false && "text-slate-400")}><td className="px-2 py-1.5">{fmtDate(t.date)}</td><td>{t.voucherCode ?? t.code}</td><td className="text-[12px]">{SUBTYPE[t.subType ?? (t.type === "nhap" ? "ncc" : "thi_cong")]}{t.confirmed === false && " (chờ xác nhận)"}</td><td className="text-right text-sky-700">{t.type === "nhap" ? fmtNumber(t.qty) : ""}</td><td className="text-right text-amber-700">{t.type === "xuat" ? fmtNumber(t.qty) : ""}</td><td className="pr-2 text-right font-semibold">{fmtNumber(bal)}</td></tr>)}</tbody>
              </table>
            </SheetBody>
            <SheetFooter>
              {can("stock.move") && <><Button variant="outline" onClick={() => { setVoucher({ type: "xuat", materialId: cardRow.inv.materialId }); setCard(null); }}><ArrowUpFromLine /> Xuất kho</Button><Button variant="outline" onClick={() => { setVoucher({ type: "nhap", materialId: cardRow.inv.materialId }); setCard(null); }}><ArrowDownToLine /> Nhập kho</Button></>}
              {can("material.request") && <Button onClick={() => { setReqOpen({ material: cardRow.inv.materialId }); setCard(null); }}><FilePlus2 /> Đề xuất mua</Button>}
            </SheetFooter>
          </>}
        </SheetContent>
      </Sheet>

      {/* Chi tiết phiếu */}
      <Sheet open={!!vCur} onOpenChange={(o) => !o && setVView(null)}>
        <SheetContent className="sm:max-w-2xl">
          {vCur && <>
            <SheetHeader><SheetTitle>Phiếu {vCur.type === "nhap" ? "nhập" : "xuất"} kho {vCur.code}</SheetTitle><p className="text-xs text-slate-500">{SUBTYPE[vCur.sub]} · {fmtDate(vCur.date)} · {db.users.find((u) => u.id === vCur.lines[0].byId)?.name}</p></SheetHeader>
            <SheetBody className="space-y-4">
              {vCur.lines[0].note && <p className="rounded-md bg-slate-50 px-3 py-2 text-[13px]">{vCur.lines[0].note}</p>}
              <table className="w-full text-[13.5px]">
                <thead className="bg-slate-100/80 text-left text-[11.5px] font-bold uppercase text-slate-800"><tr><th className="px-2 py-2">Vật tư</th><th className="text-right">Theo chứng từ</th><th className="text-right">Thực {vCur.type === "nhap" ? "nhận" : "xuất"}</th><th className="pr-2 text-right">Chênh lệch</th></tr></thead>
                <tbody>{vCur.lines.map((l) => { const d = l.qty - (l.docQty ?? l.qty); return <tr key={l.id} className="border-t"><td className="px-2 py-2">{mat(l.materialId)?.name} <span className="text-slate-500">({mat(l.materialId)?.unit})</span></td><td className="text-right">{fmtNumber(l.docQty ?? l.qty)}</td><td className="text-right font-semibold">{fmtNumber(l.qty)}</td><td className={cn("pr-2 text-right", d ? "font-semibold text-rose-600" : "text-success-fg")}>{d ? fmtNumber(d) : "Khớp"}</td></tr>; })}</tbody>
              </table>
              <div><div className="mb-1 text-[12px] font-semibold uppercase text-slate-600">Đính kèm</div><AttachmentList files={vCur.lines[0].files ?? []} /></div>
            </SheetBody>
            <SheetFooter>
              {!vCur.confirmed && can("stock.move") && <><Button variant="outline" className="mr-auto text-rose-600" onClick={async () => { if (await confirm({ title: `Xóa phiếu ${vCur.code}?`, destructive: true, confirmText: "Xóa" })) { run(deleteVoucher, vCur.code); setVView(null); toast.success("Đã xóa phiếu"); } }}><Trash2 /> Xóa phiếu</Button><Button onClick={() => { run(confirmVoucher, vCur.code); toast.success(`Đã xác nhận ${vCur.code} – ${vCur.type === "nhap" ? "cộng" : "trừ"} tồn kho`); }}><CheckCircle2 /> Xác nhận {vCur.type === "nhap" ? "nhập" : "xuất"} kho</Button></>}
              {vCur.confirmed && <span className="text-[13px] text-success-fg">Phiếu đã xác nhận – tồn kho đã cập nhật.</span>}
            </SheetFooter>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
